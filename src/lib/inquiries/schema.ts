import { z } from "zod";
import {
  COMPANIONS,
  LICENCES,
  PACKAGE_SLUGS,
  PILOT_COUNTS,
  REFERRAL_SOURCES,
} from "./options";
import { MAX_LENGTH, MESSAGES, MIN_PHONE_DIGITS, digitCount, singleLine } from "./fields";

/**
 * Validace formulářů ze stránky Kontakt na serveru: poptávka „Poptat termín"
 * na tři kroky a krátké „Nechte číslo, Honza zavolá".
 *
 * Pole, hlášky, délky a stav formuláře jsou v fields.ts (bez zod), odkud je
 * bere i formulář v prohlížeči. Povinná pole, formáty a hlášky odpovídají
 * klikacímu modelu (prototyp/kontakt.html a js/kontakt.js), aby prohlížeč
 * i server hlásily totéž. Soubor nezávisí na Next.js ani na serveru: použije
 * ho i test scripts/test-inquiry-action.mjs.
 *
 * Souhlas se zpracováním údajů se nezaškrtává (rozhodnutí 10. 10. 2026
 * v prototyp/kontakt.html): údaje slouží jen k odpovědi na poptávku,
 * formulář má místo zaškrtávátka informační větu s odkazem na zásady.
 */

// Dřívější importy ze schema.ts fungují dál.
export {
  CALLBACK_FIELDS,
  HONEYPOT_FIELD,
  INQUIRY_FIELDS,
  MESSAGES,
  TEXT_MAX,
  TOKEN_FIELD,
  initialCallbackState,
  initialInquiryState,
  type CallbackField,
  type CallbackFormState,
  type FormState,
  type InquiryField,
  type InquiryFormState,
} from "./fields";

const name = z
  .string()
  .overwrite(singleLine)
  .min(1, MESSAGES.name)
  .max(MAX_LENGTH.name, MESSAGES.tooLong(MAX_LENGTH.name));

const longText = (max: number) => z.string().trim().max(max, MESSAGES.tooLong(max));

/** Nepovinný výběr: prázdná hodnota, nebo jedna z nabízených. */
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(["", ...values], { error: MESSAGES.option });

export const inquirySchema = z.object({
  licence: z.enum(LICENCES, { error: MESSAGES.licence }),
  aboutPilot: longText(MAX_LENGTH.aboutPilot),

  packageSlug: z.enum(PACKAGE_SLUGS, { error: MESSAGES.packageSlug }),
  travelDate: z
    .string()
    .overwrite(singleLine)
    .min(1, MESSAGES.travelDate)
    .max(MAX_LENGTH.travelDate, MESSAGES.tooLong(MAX_LENGTH.travelDate)),
  pilotCount: z.enum(PILOT_COUNTS, { error: MESSAGES.pilotCount }),
  companions: optionalChoice(COMPANIONS),

  name,
  // Přísnější než vzor v prototypu (z.email nepustí třeba dvě tečky za sebou),
  // protože na adresu odchází potvrzení a Resend by ji odmítl.
  email: z
    .string()
    .trim()
    .max(MAX_LENGTH.email, MESSAGES.email)
    .pipe(z.email({ error: MESSAGES.email })),
  phone: z
    .string()
    .overwrite(singleLine)
    .max(MAX_LENGTH.phone, MESSAGES.tooLong(MAX_LENGTH.phone))
    .refine((v) => v === "" || digitCount(v) >= MIN_PHONE_DIGITS, MESSAGES.phone),
  referralSource: optionalChoice(REFERRAL_SOURCES),
  message: longText(MAX_LENGTH.message),
});

export const callbackSchema = z.object({
  name,
  phone: z
    .string()
    .overwrite(singleLine)
    .max(MAX_LENGTH.phone, MESSAGES.tooLong(MAX_LENGTH.phone))
    .refine((v) => digitCount(v) >= MIN_PHONE_DIGITS, MESSAGES.callbackPhone),
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
