import { HONEYPOT_FIELD, TOKEN_FIELD, readFields, type FormState } from "@/lib/inquiries/fields";
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

/**
 * Odeslání formuláře se skriptem. Když server action selže výjimkou (výpadek
 * sítě, chyba na serveru, chybová stránka místo odpovědi Next), React by
 * chybu poslal do error.tsx a návštěvník by přišel o vyplněné údaje. Místo
 * toho vrátí chybový stav s hláškou, s hodnotami z odeslaného formuláře
 * a s tokenem, se kterým formulář přišel (je pořád platný). Bez skriptu
 * formulář odesílá prohlížeč rovnou server action a tohle se nepoužije.
 */
export function withSendFallback<F extends string>(
  action: (prev: FormState<F>, formData: FormData) => Promise<FormState<F>>,
  fields: readonly F[],
  message: string,
): (prev: FormState<F>, formData: FormData) => Promise<FormState<F>> {
  return async (prev, formData) => {
    try {
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
