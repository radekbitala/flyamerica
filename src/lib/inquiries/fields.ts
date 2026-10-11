import {
  COMPANIONS,
  LICENCES,
  PACKAGE_SLUGS,
  PILOT_COUNTS,
  REFERRAL_SOURCES,
} from "./options";

/**
 * Pole, hlášky, stav a rychlá kontrola formulářů ze stránky Kontakt, bez
 * knihovny zod. Načítá je formulář v prohlížeči (kontrola kroku před
 * Pokračovat), zod schéma na serveru (schema.ts) i test
 * scripts/test-inquiry-action.mjs. Prohlížeč tak nestahuje zod a obě strany
 * hlásí stejné texty z klikacího modelu (prototyp/kontakt.html).
 *
 * Pole mají anglické názvy podle sloupců tabulky inquiries. Formulář
 * v prototypu má české (o_vas, balicek, kdy, piloti, doprovod, jmeno,
 * telefon, odkud, zprava).
 */

/** Pole poptávky po krocích formuláře, v pořadí na stránce. */
export const INQUIRY_STEPS = [
  // Krok 1: Pilotní licence a pár slov o vás
  ["licence", "aboutPilot"],
  // Krok 2: O jaký balíček máte zájem a kdy
  ["packageSlug", "travelDate", "pilotCount", "companions"],
  // Krok 3: Jak vás zastihneme
  ["name", "email", "phone", "referralSource", "message"],
] as const;

export const INQUIRY_FIELDS = [
  "licence",
  "aboutPilot",
  "packageSlug",
  "travelDate",
  "pilotCount",
  "companions",
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

/** Nejvyšší délky polí. Jednořádková pole se měří po sloučení mezer. */
export const MAX_LENGTH = {
  aboutPilot: TEXT_MAX,
  travelDate: 120,
  name: 120,
  email: 254,
  phone: 40,
  message: TEXT_MAX,
} as const;

/** Telefon musí mít aspoň tolik číslic (v poptávce, když je vyplněný). */
export const MIN_PHONE_DIGITS = 9;

/** Hlášky doslova z prototyp/kontakt.html. Pevné mezery doplní formulář při vykreslení. */
export const MESSAGES = {
  licence: "Vyberte licenci, nebo možnost Nemám.",
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
export const singleLine = (s: string) => s.replace(/\s+/g, " ").trim();
export const digitCount = (s: string) => s.replace(/\D/g, "").length;

// Volnější vzor z prototypu (js/kontakt.js). Server kontroluje přísněji
// (z.email v schema.ts), jeho hlášku formulář ukáže po odeslání.
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const oneOf = (list: readonly string[], value: string) => list.includes(value);

/**
 * Kontrola jednoho pole poptávky v prohlížeči: stejná povinná pole, volby,
 * délky a hlášky jako zod schéma na serveru, jen e-mail volněji. Vrací
 * hlášku, nebo undefined, když je pole v pořádku.
 */
export function checkInquiryField(field: InquiryField, raw: string): string | undefined {
  switch (field) {
    case "licence":
      return oneOf(LICENCES, raw) ? undefined : MESSAGES.licence;
    case "packageSlug":
      return oneOf(PACKAGE_SLUGS, raw) ? undefined : MESSAGES.packageSlug;
    case "pilotCount":
      return oneOf(PILOT_COUNTS, raw) ? undefined : MESSAGES.pilotCount;
    case "companions":
      return raw === "" || oneOf(COMPANIONS, raw) ? undefined : MESSAGES.option;
    case "referralSource":
      return raw === "" || oneOf(REFERRAL_SOURCES, raw) ? undefined : MESSAGES.option;
    case "travelDate":
    case "name": {
      const value = singleLine(raw);
      if (value === "") return MESSAGES[field];
      return value.length > MAX_LENGTH[field] ? MESSAGES.tooLong(MAX_LENGTH[field]) : undefined;
    }
    case "email": {
      const value = raw.trim();
      return value.length > MAX_LENGTH.email || !EMAIL_SHAPE.test(value) ? MESSAGES.email : undefined;
    }
    case "phone": {
      const value = singleLine(raw);
      if (value.length > MAX_LENGTH.phone) return MESSAGES.tooLong(MAX_LENGTH.phone);
      return value !== "" && digitCount(value) < MIN_PHONE_DIGITS ? MESSAGES.phone : undefined;
    }
    case "aboutPilot":
    case "message":
      return raw.trim().length > MAX_LENGTH[field] ? MESSAGES.tooLong(MAX_LENGTH[field]) : undefined;
  }
}

/** Kontrola pole žádosti o zavolání v prohlížeči (jméno a povinný telefon). */
export function checkCallbackField(field: CallbackField, raw: string): string | undefined {
  if (field === "name") return checkInquiryField("name", raw);
  const value = singleLine(raw);
  if (value.length > MAX_LENGTH.phone) return MESSAGES.tooLong(MAX_LENGTH.phone);
  return digitCount(value) < MIN_PHONE_DIGITS ? MESSAGES.callbackPhone : undefined;
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
