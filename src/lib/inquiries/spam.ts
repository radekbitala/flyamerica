import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Ochrana veřejných formulářů na stránce Kontakt proti robotům.
 *
 * Token ve skrytém poli nese čas vykreslení formuláře podepsaný klíčem
 * AUTH_SECRET, takže ho robot nepodvrhne. Stránka s formulářem ho musí
 * vytvářet při každém požadavku (await connection() z next/server), jinak by
 * v něm zůstal čas buildu. Captchu nepoužíváme, poptávek je málo a captcha
 * by odradila i piloty.
 */

/** Rychleji formulář na tři kroky vyplnit nejde, rychleji ho odešle jen robot. */
export const MIN_FILL_MS = 3_000;

/** Starší token se nepřijme. Kdo nechá formulář otevřený přes noc, dostane nový. */
export const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

/** Poptávek a žádostí o zavolání z jedné IP za hodinu. */
export const MAX_PER_IP_PER_HOUR = 5;

// Hodiny serverů se můžou mírně rozcházet, token „z budoucnosti" do minuty projde.
const CLOCK_SKEW_MS = 60_000;

function signingKey(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Chybí AUTH_SECRET, bez něj nejde podepsat formulář.");
  }
  return secret;
}

function sign(issuedAt: number): string {
  // Předpona odděluje tenhle podpis od jiných použití stejného klíče.
  return createHmac("sha256", signingKey())
    .update(`flyamerica:inquiry-form:${issuedAt}`)
    .digest("base64url");
}

export function createFormToken(issuedAt: number = Date.now()): string {
  return `${issuedAt}.${sign(issuedAt)}`;
}

/**
 * ok: token je platný a formulář se vyplňoval dost dlouho,
 * too-fast: odesláno moc brzy po vykreslení,
 * expired: náš token, jen starší než MAX_FORM_AGE_MS,
 * invalid: token chybí, je podvržený nebo z budoucnosti.
 */
export type FormTokenCheck = "ok" | "too-fast" | "expired" | "invalid";

export function checkFormToken(token: string, now: number = Date.now()): FormTokenCheck {
  const [rawTime, signature, ...rest] = token.split(".");
  const issuedAt = Number(rawTime);
  if (rest.length || !signature || !/^\d{1,16}$/.test(rawTime ?? "")) return "invalid";

  const expected = Buffer.from(sign(issuedAt));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return "invalid";
  }

  const age = now - issuedAt;
  if (age < -CLOCK_SKEW_MS) return "invalid";
  if (age > MAX_FORM_AGE_MS) return "expired";
  if (age < MIN_FILL_MS) return "too-fast";
  return "ok";
}

/**
 * Otisk IP pro omezení četnosti. Samotnou IP neukládáme. Bez soli by šel
 * otisk dopočítat zpátky, IPv4 adres je jen pár miliard.
 *
 * Když IP_HASH_SALT chybí (lokálně ho npm run db:local nezapisuje), poslouží
 * jako sůl AUTH_SECRET. Bez obou se omezení vypne, poptávka se ale přijme.
 */
export function hashIp(ip: string): string | null {
  const salt = process.env.IP_HASH_SALT || process.env.AUTH_SECRET;
  if (!salt) return null;
  return createHash("sha256").update(ip + salt).digest("hex");
}

/**
 * IP návštěvníka z hlaviček. Na Vercelu obě hlavičky nastavuje platforma
 * a klient je nepodvrhne. Na jiném hostingu by se musela ověřit proxy.
 */
export function clientIp(headers: Headers): string | null {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}
