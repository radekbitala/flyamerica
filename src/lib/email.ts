import "server-only";
import { FA_EMAIL, FA_PHONE, FA_REPLY_TIME, SITE_URL } from "@/lib/site";

/**
 * Odesílání e-mailů přes HTTP API Resendu.
 *
 * Schválně bez SDK, je to jeden fetch a o závislost navíc nestojíme.
 * Dokud nejsou vyplněné proměnné prostředí, funkce jen zaloguje a skončí:
 * poptávka je v databázi tak jako tak a e-maily se rozjedou ve chvíli,
 * kdy se klíč doplní. Do logu nepíšeme osobní údaje, jen id poptávky.
 *
 * Proměnné prostředí:
 *   RESEND_API_KEY  klíč z resend.com
 *   RESEND_FROM     ověřený odesílatel, např. "FLY America <poptavky@flyamerica.cz>"
 *   NOTIFY_TO       kam chodí upozornění na nové poptávky (Honza)
 */

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Popis do logu bez osobních údajů (předmět obsahuje jméno). */
  logLabel: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM &&
      process.env.NOTIFY_TO,
  );
}

/** Vrací true, když e-mail odešel, false, když Resend není nastavený. */
async function send({ to, subject, html, text, replyTo, logLabel }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    console.warn(`[email] Resend není nastavený, neodesláno: ${logLabel}`);
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    // Jen stav a typ chyby: text odpovědi může obsahovat adresu příjemce
    // a chyba končí v logu.
    const body = (await res.json().catch(() => null)) as { name?: unknown } | null;
    const kind = typeof body?.name === "string" ? ` (${body.name})` : "";
    throw new Error(`Resend odpověděl ${res.status}${kind}: ${logLabel}`);
  }
  return true;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Jednoduchý rámeček kolem obsahu, bez obrázků, ať to projde všude. */
function layout(inner: string): string {
  return `<!doctype html><html lang="cs"><body style="margin:0;padding:24px;background:#F5F2EC">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #DBDAD6">
    <tr><td style="padding:32px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#1D252D">
      ${inner}
      <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #DBDAD6;font-size:13px;color:#4E5862">
        FLY America, Jan Čermák<br>
        <a href="mailto:${FA_EMAIL}" style="color:#4E5862">${FA_EMAIL}</a>, ${FA_PHONE}
      </p>
    </td></tr>
  </table></body></html>`;
}

function rowsHtml(rows: [string, string][]): string {
  return `<table cellpadding="0" cellspacing="0">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:5px 18px 5px 0;color:#4E5862;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:5px 0;white-space:pre-line"><strong>${esc(v)}</strong></td></tr>`,
    )
    .join("")}</table>`;
}

export interface InquiryEmailData {
  id: string;
  kind: "inquiry" | "callback";
  name: string;
  email?: string | null;
  phone?: string | null;
  licence?: string | null;
  aboutPilot?: string | null;
  /** Název výletu pro čtenáře, ne slug z formuláře. */
  packageLabel?: string | null;
  travelDate?: string | null;
  pilotCount?: string | null;
  companions?: string | null;
  referralSource?: string | null;
  message?: string | null;
}

function inquiryRows(d: InquiryEmailData): [string, string][] {
  const rows: [string, string | null | undefined][] = [
    ["Jméno", d.name],
    ["E-mail", d.email],
    ["Telefon", d.phone],
    ["Licence", d.licence],
    ["Výlet", d.packageLabel],
    ["Termín", d.travelDate],
    ["Počet pilotů", d.pilotCount],
    ["Doprovod", d.companions],
    ["O pilotovi", d.aboutPilot],
    ["Odkud o nás ví", d.referralSource],
    ["Zpráva", d.message],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

/** Upozornění pro Honzu, že přišla nová poptávka nebo žádost o zavolání. */
export async function sendInquiryNotification(d: InquiryEmailData): Promise<boolean> {
  const to = process.env.NOTIFY_TO;
  if (!to) {
    console.warn(`[email] NOTIFY_TO chybí, upozornění na poptávku ${d.id} neodesláno.`);
    return false;
  }

  const callback = d.kind === "callback";
  const rows = inquiryRows(d);
  const adminUrl = `${SITE_URL}/admin/poptavky/${d.id}`;
  const subject = callback
    ? `Zavolat zpět: ${d.name}`
    : `Poptávka: ${d.packageLabel ?? "bez výletu"} - ${d.name}`;

  return send({
    to,
    replyTo: d.email ?? undefined,
    subject,
    logLabel: `upozornění na poptávku ${d.id}`,
    html: layout(
      `<h1 style="margin:0 0 20px;font-size:20px">${callback ? "Žádost o zavolání" : "Nová poptávka"}</h1>
       ${rowsHtml(rows)}
       <p style="margin:24px 0 0"><a href="${adminUrl}" style="color:#1D252D;font-weight:600">Otevřít v administraci</a></p>
       ${d.email ? `<p style="margin:12px 0 0;font-size:13px;color:#4E5862">Odpovědí na tento e-mail píšete rovnou tazateli.</p>` : ""}`,
    ),
    text: [
      callback ? "Žádost o zavolání" : "Nová poptávka",
      "",
      ...rows.map(([k, v]) => `${k}: ${v}`),
      "",
      `Otevřít v administraci: ${adminUrl}`,
    ].join("\n"),
  });
}

/**
 * Potvrzení tazateli, že poptávka dorazila. Bez e-mailu (zavolání) se nic
 * neposílá.
 *
 * Formulář může vyplnit kdokoli s cizí adresou. Aby přes něj nešel na
 * libovolnou adresu poslat vlastní text z naší domény, potvrzení nenese
 * nic, co návštěvník napsal: oslovení je bez jména a kopie údajů obsahuje
 * jen volby z nabídky formuláře (ne termín, telefon ani zprávu).
 *
 * Lhůta odpovědi je stejná jako v potvrzení na webu (FA_REPLY_TIME,
 * úprava 16 z auditu). Text skládá inquiryConfirmationEmail() zvlášť,
 * aby ho šlo otestovat bez Resendu (scripts/test-inquiry-action.mjs).
 */
export function inquiryConfirmationEmail(
  d: InquiryEmailData & { email: string },
): { subject: string; html: string; text: string } {
  const rows = inquiryRows({
    id: d.id,
    kind: d.kind,
    name: "",
    licence: d.licence,
    packageLabel: d.packageLabel,
    pilotCount: d.pilotCount,
    companions: d.companions,
    referralSource: d.referralSource,
  });

  return {
    subject: "Děkujeme za poptávku - FLY America",
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:20px">Děkujeme, poptávka je odeslaná.</h1>
       <p style="margin:0 0 16px">Dobrý den,</p>
       <p style="margin:0 0 16px">Honza se vám ozve na e-mail <strong>${esc(d.email)}</strong> ${FA_REPLY_TIME}.
         Kdybyste chtěli něco doplnit, odpovězte na tento e-mail nebo napište na
         <a href="mailto:${FA_EMAIL}" style="color:#1D252D">${FA_EMAIL}</a>.</p>
       ${rows.length ? `<p style="margin:0 0 8px">Co jste ve formuláři vybrali:</p>${rowsHtml(rows)}` : ""}`,
    ),
    text: [
      `Dobrý den,`,
      ``,
      `děkujeme, poptávka je odeslaná. Honza se vám ozve na e-mail ${d.email} ${FA_REPLY_TIME}.`,
      `Kdybyste chtěli něco doplnit, odpovězte na tento e-mail nebo napište na ${FA_EMAIL}.`,
      ...(rows.length ? [``, `Co jste ve formuláři vybrali:`, ...rows.map(([k, v]) => `${k}: ${v}`)] : []),
      ``,
      `FLY America, Jan Čermák`,
      `${FA_EMAIL}, ${FA_PHONE}`,
    ].join("\n"),
  };
}

export async function sendInquiryConfirmation(d: InquiryEmailData): Promise<boolean> {
  if (!d.email) return false;
  return send({
    to: d.email,
    replyTo: FA_EMAIL,
    logLabel: `potvrzení poptávky ${d.id}`,
    ...inquiryConfirmationEmail({ ...d, email: d.email }),
  });
}
