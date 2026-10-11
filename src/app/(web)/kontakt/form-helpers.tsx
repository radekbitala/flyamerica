import { HONEYPOT_FIELD, TOKEN_FIELD } from "@/lib/inquiries/fields";

/*
 * Společné kousky obou formulářů stránky Kontakt (InquiryForm, CallbackForm).
 * Běží v prohlížeči, server action dostane jen hodnoty polí.
 */

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
