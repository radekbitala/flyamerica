import { z } from "zod";
import {
  COMPANIONS,
  LICENCES,
  PACKAGE_SLUGS,
  PILOT_COUNTS,
  REFERRAL_SOURCES,
} from "./options";

/**
 * Validace formulářů ze stránky Kontakt: poptávka „Poptat termín" na tři
 * kroky a krátké „Nechte číslo, Honza zavolá".
 *
 * Povinná pole, formáty a hlášky odpovídají klikacímu modelu
 * (prototyp/kontakt.html a js/kontakt.js), aby prohlížeč i server hlásily
 * totéž. Soubor nezávisí na Next.js ani na serveru: použije ho formulář
 * v prohlížeči i test scripts/test-inquiry-action.mjs.
 *
 * Pole mají anglické názvy podle sloupců tabulky inquiries. Formulář
 * v prototypu má české (o_vas, balicek, kdy, piloti, doprovod, jmeno,
 * telefon, odkud, zprava), při převodu do Reactu se přejmenují.
 *
 * Souhlas se zpracováním údajů se nezaškrtává (rozhodnutí 10. 10. 2026
 * v prototyp/kontakt.html): údaje slouží jen k odpovědi na poptávku,
 * formulář má místo zaškrtávátka informační větu s odkazem na zásady.
 */

export const INQUIRY_FIELDS = [
  // Krok 1
  "licence",
  "aboutPilot",
  // Krok 2
  "packageSlug",
  "travelDate",
  "pilotCount",
  "companions",
  // Krok 3
  "name",
  "email",
  "phone",
  "referralSource",
  "message",
] as const;

export const CALLBACK_FIELDS = ["name", "phone"] as const;

export type InquiryField = (typeof INQUIRY_FIELDS)[number];
export type CallbackField = (typeof CALLBACK_FIELDS)[number];

/**
 * Skrytá pole proti spamu. Past (honeypot) musí být ve formuláři schovaná
 * přes CSS, ne type="hidden", s autocomplete="off" a tabIndex={-1}.
 * Token je podepsaný čas vykreslení formuláře (createFormToken v spam.ts).
 */
export const HONEYPOT_FIELD = "website";
export const TOKEN_FIELD = "formToken";

export const TEXT_MAX = 2000;

export const MESSAGES = {
  licence: "Vyberte, jakou máte licenci.",
  packageSlug: "Vyberte balíček, nebo možnost Zatím nevím.",
  travelDate: "Napište přibližný termín, třeba měsíc.",
  pilotCount: "Vyberte počet pilotů.",
  name: "Napište své jméno.",
  email: "Zadejte e-mail ve tvaru jmeno@domena.cz.",
  phone: "Telefon napište aspoň s 9 číslicemi, nebo pole nechte prázdné.",
  callbackPhone: "Napište telefon, aspoň 9 číslic.",
  option: "Vyberte jednu z možností.",
  tooLong: (max: number) => `Zkraťte text na nejvýš ${max} znaků.`,
} as const;

// Jednořádková pole jdou do předmětu e-mailu a do přehledu v administraci,
// proto se zalomení a tabulátory slévají do mezer.
const singleLine = (s: string) => s.replace(/\s+/g, " ").trim();
const digitCount = (s: string) => s.replace(/\D/g, "").length;

const name = z
  .string()
  .overwrite(singleLine)
  .min(1, MESSAGES.name)
  .max(120, MESSAGES.tooLong(120));

const longText = z.string().trim().max(TEXT_MAX, MESSAGES.tooLong(TEXT_MAX));

/** Nepovinný výběr: prázdná hodnota, nebo jedna z nabízených. */
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(["", ...values], { error: MESSAGES.option });

export const inquirySchema = z.object({
  licence: z.enum(LICENCES, { error: MESSAGES.licence }),
  aboutPilot: longText,

  packageSlug: z.enum(PACKAGE_SLUGS, { error: MESSAGES.packageSlug }),
  travelDate: z
    .string()
    .overwrite(singleLine)
    .min(1, MESSAGES.travelDate)
    .max(120, MESSAGES.tooLong(120)),
  pilotCount: z.enum(PILOT_COUNTS, { error: MESSAGES.pilotCount }),
  companions: optionalChoice(COMPANIONS),

  name,
  // Přísnější než vzor v prototypu (z.email nepustí třeba dvě tečky za sebou),
  // protože na adresu odchází potvrzení a Resend by ji odmítl.
  email: z.string().trim().max(254, MESSAGES.email).pipe(z.email({ error: MESSAGES.email })),
  phone: z
    .string()
    .overwrite(singleLine)
    .max(40, MESSAGES.tooLong(40))
    .refine((v) => v === "" || digitCount(v) >= 9, MESSAGES.phone),
  referralSource: optionalChoice(REFERRAL_SOURCES),
  message: longText,
});

export const callbackSchema = z.object({
  name,
  phone: z
    .string()
    .overwrite(singleLine)
    .max(40, MESSAGES.tooLong(40))
    .refine((v) => digitCount(v) >= 9, MESSAGES.callbackPhone),
});

export type InquiryData = z.output<typeof inquirySchema>;
export type CallbackData = z.output<typeof callbackSchema>;

/**
 * Hodnoty polí z FormData jako řetězce. Chybějící pole je prázdný řetězec,
 * soubor se zahodí, takže schéma vždy dostane jen text.
 */
export function readFields<F extends string>(
  formData: FormData,
  fields: readonly F[],
): Record<F, string> {
  const out = {} as Record<F, string>;
  for (const field of fields) {
    const v = formData.get(field);
    out[field] = typeof v === "string" ? v : "";
  }
  return out;
}

/** První chyba u každého pole, další by u jednoho pole jen mátly. */
export function firstErrors<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "") as F;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Stav formuláře pro useActionState. */
export interface FormState<F extends string> {
  /** Poptávka je přijatá, formulář ukáže potvrzení. */
  ok: boolean;
  /** Chyby u jednotlivých polí. */
  errors: Partial<Record<F, string>>;
  /** Co návštěvník vyplnil: při chybě se vrací do polí, po odeslání do shrnutí. */
  values: Partial<Record<F, string>>;
  /** Chyba, která se netýká jednoho pole (vypršelý formulář, limit, výpadek). */
  formError?: string;
  /**
   * Platný token formuláře, chybový stav ho nese vždy (po vypršení nový).
   * Formulář ho dá do skrytého pole TOKEN_FIELD místo původního.
   */
  token?: string;
}

export type InquiryFormState = FormState<InquiryField>;
export type CallbackFormState = FormState<CallbackField>;

export const initialInquiryState: InquiryFormState = { ok: false, errors: {}, values: {} };
export const initialCallbackState: CallbackFormState = { ok: false, errors: {}, values: {} };
