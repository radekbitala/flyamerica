"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { and, eq, gt, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inquiries } from "@/lib/db/schema";
import {
  sendInquiryConfirmation,
  sendInquiryNotification,
  type InquiryEmailData,
} from "@/lib/email";
import { packageName } from "@/lib/inquiries/options";
import { FA_EMAIL } from "@/lib/site";
import {
  CALLBACK_FIELDS,
  HONEYPOT_FIELD,
  INQUIRY_FIELDS,
  TOKEN_FIELD,
  callbackSchema,
  firstErrors,
  inquirySchema,
  readFields,
  type CallbackField,
  type CallbackFormState,
  type InquiryField,
  type InquiryFormState,
} from "@/lib/inquiries/schema";
import {
  MAX_PER_IP_PER_HOUR,
  MIN_FILL_MS,
  TRACE_RETENTION_DAYS,
  checkFormToken,
  clientIp,
  createFormToken,
  hashIp,
} from "@/lib/inquiries/spam";

/*
 * Veřejné formuláře stránky Kontakt. Na rozdíl od akcí administrace nevolají
 * requireAdmin(), posílá je kdokoli. Ochranu dělá past na roboty, podepsaný
 * čas vykreslení a limit poptávek z jedné IP (src/lib/inquiries/spam.ts).
 * Do logu jde jen id poptávky a typ chyby, nikdy osobní údaje.
 */

const MSG_STALE =
  "Formulář byl otevřený moc dlouho. Zkontrolujte údaje a odešlete ho prosím znovu.";
const MSG_TOO_FAST = "Zkontrolujte prosím údaje a odešlete formulář znovu.";
const MSG_RATE_LIMIT = `Z vaší adresy přišlo za poslední hodinu víc poptávek. Zkuste to prosím později, nebo napište na ${FA_EMAIL}.`;
const MSG_FAILED = `Poptávku se nepodařilo uložit. Zkuste to prosím znovu, nebo napište na ${FA_EMAIL}.`;

/**
 * token: platný token formuláře, vrací se v každém chybovém stavu. Formulář
 * tak může vždy vzít state.token a nemusí řešit, jestli se mezitím vyměnil.
 */
type SpamCheck = { kind: "bot" } | { kind: "stale" | "too-fast" | "ok"; token: string };

function checkSpam(formData: FormData): SpamCheck {
  // Vyplněná past není chyba formuláře: robot se z odpovědi nesmí dozvědět,
  // které pole ho prozradilo.
  const trap = formData.get(HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return { kind: "bot" };

  const raw = formData.get(TOKEN_FIELD);
  const token = typeof raw === "string" ? raw : "";
  const check = checkFormToken(token);
  if (check === "expired") {
    // Formulář vyplnil člověk, jen ho nechal dlouho otevřený. Nový token je
    // o minimální dobu „starší", aby opakované odeslání hned po hlášce
    // neskončilo na příliš rychlém vyplnění.
    return { kind: "stale", token: createFormToken(Date.now() - MIN_FILL_MS) };
  }
  if (check === "invalid") {
    // Chybějící nebo podvržený token dostane nový s aktuálním časem. Robot,
    // který token vynechá, tak minimální dobu vyplnění neobejde.
    return { kind: "stale", token: createFormToken() };
  }
  return { kind: check, token };
}

/** Typ chyby bez obsahu. Drizzle dává do zprávy i parametry dotazu, tedy osobní údaje. */
function errorKind(err: unknown): string {
  if (!(err instanceof Error)) return "neznámá chyba";
  const code = (err.cause as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? `${err.name} ${code}` : err.name;
}

type NewInquiry = typeof inquiries.$inferInsert;
type Submission = Omit<NewInquiry, "id" | "consent" | "consentAt" | "ipHash" | "userAgent">;

/** Uloží poptávku, pokud z IP za poslední hodinu nepřišlo moc jiných. */
async function save(row: Submission): Promise<{ id: string } | "rate-limited" | "failed"> {
  const h = await headers();
  const ip = clientIp(h);
  const ipHash = ip ? hashIp(ip) : null;
  const userAgent = h.get("user-agent")?.slice(0, 500) || null;

  try {
    return await db.transaction(async (tx) => {
      if (ipHash) {
        // Zámek na otisk IP po dobu transakce. Bez něj by dávka souběžných
        // požadavků prošla kontrolou počtu celá najednou.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`inquiry:${ipHash}`}, 0))`,
        );
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(inquiries)
          .where(
            and(
              eq(inquiries.ipHash, ipHash),
              gt(inquiries.createdAt, sql`now() - interval '1 hour'`),
            ),
          );
        if (count >= MAX_PER_IP_PER_HOUR) return "rate-limited" as const;
      }

      const [inserted] = await tx
        .insert(inquiries)
        .values({ ...row, ipHash, userAgent })
        .returning({ id: inquiries.id });

      // Otisk IP a údaj o prohlížeči starších poptávek se mažou (zásady
      // zpracování osobních údajů), bez cronu vždy s novou poptávkou.
      // Limit počítá jen poslední hodinu, o data nepřijde.
      await tx
        .update(inquiries)
        .set({ ipHash: null, userAgent: null })
        .where(
          and(
            lt(inquiries.createdAt, sql`now() - make_interval(days => ${TRACE_RETENTION_DAYS}::int)`),
            or(isNotNull(inquiries.ipHash), isNotNull(inquiries.userAgent)),
          ),
        );
      return { id: inserted.id };
    });
  } catch (err) {
    console.error(`[poptavka] uložení selhalo: ${errorKind(err)}`);
    return "failed";
  }
}

/**
 * E-maily až po odeslání odpovědi, návštěvník na Resend nečeká. Poptávka je
 * v tu chvíli uložená, takže výpadek e-mailu ani chybějící nastavení
 * Resendu o ni nepřipraví.
 */
function sendEmails(data: InquiryEmailData) {
  after(async () => {
    const results = await Promise.allSettled([
      sendInquiryNotification(data),
      sendInquiryConfirmation(data),
    ]);
    // Zprávy chyb z email.ts a fetch osobní údaje neobsahují (stav odpovědi, id).
    for (const result of results) {
      if (result.status !== "rejected") continue;
      const reason = result.reason instanceof Error ? result.reason.message : "neznámá chyba";
      console.error(`[poptavka] e-mail k ${data.id} neodešel: ${reason}`);
    }
  });
}

/** Chybový stav se zachovanými hodnotami, ať návštěvník nepřijde o vyplněné. */
function failure<F extends string>(
  values: Partial<Record<F, string>>,
  extra: { errors?: Partial<Record<F, string>>; formError?: string; token: string },
) {
  return { ok: false, errors: extra.errors ?? {}, values, formError: extra.formError, token: extra.token };
}

/** Formulář „Poptat termín" (poptávka na tři kroky). */
export async function submitInquiry(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const values = readFields(formData, INQUIRY_FIELDS);
  const spam = checkSpam(formData);
  if (spam.kind === "bot") return { ok: true, errors: {}, values };

  const { token } = spam;
  const parsed = inquirySchema.safeParse(values);
  if (!parsed.success) {
    return failure(values, { errors: firstErrors<InquiryField>(parsed.error), token });
  }
  if (spam.kind === "stale") return failure(values, { formError: MSG_STALE, token });
  if (spam.kind === "too-fast") return failure(values, { formError: MSG_TOO_FAST, token });

  const d = parsed.data;
  const row = {
    kind: "inquiry" as const,
    licence: d.licence,
    aboutPilot: d.aboutPilot || null,
    packageSlug: d.packageSlug,
    travelDate: d.travelDate,
    pilotCount: d.pilotCount,
    companions: d.companions || null,
    name: d.name,
    email: d.email,
    phone: d.phone || null,
    referralSource: d.referralSource || null,
    message: d.message || null,
  };

  const saved = await save(row);
  if (saved === "rate-limited") return failure(values, { formError: MSG_RATE_LIMIT, token });
  if (saved === "failed") return failure(values, { formError: MSG_FAILED, token });

  const { packageSlug, ...rest } = row;
  sendEmails({ id: saved.id, ...rest, packageLabel: packageName(packageSlug) });

  return { ok: true, errors: {}, values };
}

/** Krátký formulář „Nechte číslo, Honza zavolá" (jen jméno a telefon). */
export async function submitCallback(
  _prev: CallbackFormState,
  formData: FormData,
): Promise<CallbackFormState> {
  const values = readFields(formData, CALLBACK_FIELDS);
  const spam = checkSpam(formData);
  if (spam.kind === "bot") return { ok: true, errors: {}, values };

  const { token } = spam;
  const parsed = callbackSchema.safeParse(values);
  if (!parsed.success) {
    return failure(values, { errors: firstErrors<CallbackField>(parsed.error), token });
  }
  if (spam.kind === "stale") return failure(values, { formError: MSG_STALE, token });
  if (spam.kind === "too-fast") return failure(values, { formError: MSG_TOO_FAST, token });

  const row = { kind: "callback" as const, name: parsed.data.name, phone: parsed.data.phone };

  const saved = await save(row);
  if (saved === "rate-limited") return failure(values, { formError: MSG_RATE_LIMIT, token });
  if (saved === "failed") return failure(values, { formError: MSG_FAILED, token });

  sendEmails({ id: saved.id, ...row });

  return { ok: true, errors: {}, values };
}
