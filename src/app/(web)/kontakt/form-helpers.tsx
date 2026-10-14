import { HONEYPOT_FIELD, MIN_FILL_MS, TOKEN_FIELD, readFields, type FormState } from "@/lib/inquiries/fields";
import { FA_PHONE } from "@/lib/site";

/*
 * Společné kousky obou formulářů stránky Kontakt (InquiryForm, CallbackForm).
 * Běží v prohlížeči, server action dostane jen hodnoty polí.
 */

/**
 * Hlášky, když odeslání neprojde z jiného důvodu než kvůli údajům ve
 * formuláři: výpadek sítě, chyba serveru, odpověď, které prohlížeč
 * nerozumí. Telefon jako jistota, když web zrovna nejde.
 */
export const SEND_FAILED = {
  inquiry: `Poptávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte Honzovi: ${FA_PHONE}.`,
  callback: `Číslo se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte Honzovi: ${FA_PHONE}.`,
} as const;

/** Kdy prohlížeč ukázal formulář s daným tokenem ze stránky (Date.now()). */
const tokenShownAt = new Map<string, number>();

/** Rezerva navíc k MIN_FILL_MS (časovač prohlížeče, zaokrouhlení). */
const MIN_FILL_MARGIN_MS = 250;

/**
 * Zapamatuje si, kdy prohlížeč ukázal formulář s tokenem ze stránky (volá
 * se po hydrataci). Token vznikl na serveru ještě dřív, takže když v prohlížeči
 * uběhne MIN_FILL_MS, na serveru uběhlo aspoň tolik. Návrat na stránku se
 * stejným tokenem čas nepřepíše.
 */
export function rememberTokenShown(token: string | undefined) {
  if (token && !tokenShownAt.has(token)) tokenShownAt.set(token, Date.now());
}

/**
 * Server odmítne odeslání dřív než MIN_FILL_MS od vykreslení formuláře jako
 * robota („Zkontrolujte prosím údaje a odešlete formulář znovu.“). Obnovenou
 * rozepsanou poptávku (sessionStorage) ale člověk odešle hned po načtení
 * stránky. Odeslání se proto pozdrží o zbytek doby, tlačítko mezitím
 * ukazuje Odesílám… (nález funkce:F3 z kontroly 14. 10. 2026). Token, který
 * prohlížeč neviděl při načtení stránky (nový po vypršení platí hned), se
 * nečeká.
 */
async function waitForMinFill(token: FormDataEntryValue | null) {
  const shownAt = typeof token === "string" ? tokenShownAt.get(token) : undefined;
  if (shownAt === undefined) return;
  const left = shownAt + MIN_FILL_MS + MIN_FILL_MARGIN_MS - Date.now();
  if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
}

/**
 * Odeslání formuláře se skriptem. Když server action selže výjimkou (výpadek
 * sítě, chyba na serveru, chybová stránka místo odpovědi Next), React by
 * chybu poslal do error.tsx a návštěvník by přišel o vyplněné údaje. Místo
 * toho vrátí chybový stav s hláškou, s hodnotami z odeslaného formuláře
 * a s tokenem, se kterým formulář přišel (je pořád platný). Odeslání hned
 * po načtení stránky počká, až uplyne MIN_FILL_MS (waitForMinFill). Bez
 * skriptu formulář odesílá prohlížeč rovnou server action a tohle se
 * nepoužije.
 */
export function withSendFallback<F extends string>(
  action: (prev: FormState<F>, formData: FormData) => Promise<FormState<F>>,
  fields: readonly F[],
  message: string,
): (prev: FormState<F>, formData: FormData) => Promise<FormState<F>> {
  return async (prev, formData) => {
    try {
      await waitForMinFill(formData.get(TOKEN_FIELD));
      return await action(prev, formData);
    } catch (error) {
      // Jen do konzole prohlížeče. Chyba ze serveru je v produkci bez podrobností.
      console.warn("[poptavka] odeslání selhalo", error);
      const token = formData.get(TOKEN_FIELD);
      return {
        ok: false,
        errors: {},
        values: readFields(formData, fields),
        formError: message,
        token: typeof token === "string" && token !== "" ? token : prev.token,
      };
    }
  };
}

/**
 * Rozepsaný formulář v sessionStorage (úprava 8 z auditu): když návštěvník
 * odejde jinam na webu, nebo telefon kartu na pozadí zahodí, po návratu
 * najde vyplněné údaje a krok, kde skončil. Úložiště patří jen té kartě
 * a zavřením karty zmizí. Nic se neposílá na server, ukládají se jen pole
 * formuláře (ne token ani past na roboty). Po odeslání a po „Poslat další
 * poptávku“ se smaže. Prohlížeč může úložiště zakázat nebo mít plné
 * (soukromé okno, blokovaná data webu), proto je každé čtení i zápis
 * v try/catch a formulář funguje i bez něj, jen si rozepsané nepamatuje.
 */
export const DRAFT_KEYS = { inquiry: "fa-poptavka", callback: "fa-zavolam" } as const;

export interface Draft<F extends string> {
  /** Krok poptávky (Nechte číslo má jen 0). */
  step: number;
  /** Vyplněná pole, prázdná se neukládají. */
  values: Partial<Record<F, string>>;
}

/** Uložený rozepsaný formulář, nebo null (nic uloženého, nečitelné, zakázané úložiště). */
export function readDraft<F extends string>(key: string, fields: readonly F[]): Draft<F> | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const { step, values } = data as { step?: unknown; values?: unknown };
    const out: Partial<Record<F, string>> = {};
    if (values && typeof values === "object") {
      for (const field of fields) {
        const value = (values as Record<string, unknown>)[field];
        if (typeof value === "string" && value !== "") out[field] = value;
      }
    }
    const savedStep = typeof step === "number" && Number.isInteger(step) && step > 0 ? step : 0;
    if (savedStep === 0 && Object.keys(out).length === 0) return null;
    return { step: savedStep, values: out };
  } catch {
    return null;
  }
}

/** Uloží aktuální hodnoty polí formuláře a krok. Prázdný formulář na začátku záznam smaže. */
export function writeDraft<F extends string>(key: string, form: HTMLFormElement, fields: readonly F[], step = 0) {
  try {
    const values = Object.fromEntries(
      Object.entries(readFields(new FormData(form), fields)).filter(([, value]) => value !== ""),
    );
    if (step === 0 && Object.keys(values).length === 0) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify({ step, values }));
  } catch {
    // Plné nebo zakázané úložiště: formulář funguje dál, jen si rozepsané nepamatuje.
  }
}

/** Smaže rozepsaný formulář (po odeslání, po „Poslat další poptávku“). */
export function clearDraft(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Zakázané úložiště: není co mazat.
  }
}

/** Text tlačítka a ohlášení čtečce během odesílání (úprava 8). */
export const SENDING = "Odesílám…";

/**
 * Ohlášení odesílání čtečce. Oblast je v HTML pořád (aria-live ohlásí až
 * změnu obsahu) a stojí za formulářem, ne v něm: formulář má během
 * odesílání aria-busy a čtečka by změny uvnitř něj mohla odložit, až
 * odesílání skončí a text zmizí. Skrytá třídou vh (position: absolute),
 * takže v mřížce ani v panelu nezabírá místo. Div, ne odstavec: styly
 * odstavců panelu (.kt-call > p) se jí netýkají.
 */
export function SendingStatus({ pending }: { pending: boolean }) {
  return (
    <div className="vh" aria-live="polite">
      {pending ? SENDING : ""}
    </div>
  );
}

/** Hodnota pole podle name. U skupiny přepínačů zaškrtnutá volba, nebo "". */
export function fieldValue(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name);
  if (el instanceof RadioNodeList) return el.value;
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return el.value;
  }
  return "";
}

/** Fokus na pole podle name, u skupiny přepínačů na první volbu (jako model). */
export function focusField(form: HTMLFormElement, name: string) {
  const el = form.elements.namedItem(name);
  const target = el instanceof RadioNodeList ? el[0] : el;
  if (target instanceof HTMLElement) target.focus();
}

/** Fokus na hlášku, která se netýká jednoho pole (vypršelý formulář, limit). */
export function focusFormError(form: HTMLFormElement) {
  form.querySelector<HTMLElement>("[data-form-error]")?.focus();
}

/** Třídy obalu pole jako v modelu: fa-field, wide, is-error. */
export function fieldClass(error: string | undefined, wide = false): string {
  return ["fa-field", wide ? "wide" : "", error ? "is-error" : ""].filter(Boolean).join(" ");
}

/** aria-describedby: nápověda a při chybě i hláška (js/kontakt.js, setError). */
export function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined;
}

/**
 * Skrytá pole proti robotům (src/lib/inquiries/spam.ts): past, kterou člověk
 * nevidí ani neslyší a robot ji vyplní, a podepsaný čas vykreslení
 * formuláře. Past je schovaná přes CSS (.vh), ne type="hidden", jinak by ji
 * roboti přeskočili.
 */
export function FormGuard({ id, token }: { id: string; token: string | undefined }) {
  return (
    <>
      <div className="vh" aria-hidden="true">
        <label htmlFor={id}>Web</label>
        <input id={id} type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input type="hidden" name={TOKEN_FIELD} value={token ?? ""} />
    </>
  );
}
