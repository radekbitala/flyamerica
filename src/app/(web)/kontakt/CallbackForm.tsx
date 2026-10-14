"use client";

import {
  Fragment,
  startTransition,
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import {
  CALLBACK_FIELDS,
  checkCallbackField,
  type CallbackField,
  type CallbackFormState,
} from "@/lib/inquiries/fields";
import { FA_REPLY_TIME } from "@/lib/site";
import { czechNbspText } from "@/lib/typography";
import { submitCallback } from "./actions";
import {
  DRAFT_KEYS,
  FormGuard,
  SENDING,
  SEND_FAILED,
  SendingStatus,
  clearDraft,
  describedBy,
  fieldClass,
  fieldValue,
  focusField,
  focusFormError,
  readDraft,
  rememberTokenShown,
  withSendFallback,
  writeDraft,
} from "./form-helpers";

/*
 * Krátký formulář „Nechte číslo, Honza zavolá“ (prototyp/kontakt.html,
 * chování .js-demo-form z js/web.js): jméno a telefon s aspoň 9 číslicemi.
 * Odeslání zkontroluje obě pole, ukáže chyby a fokus dá na první chybné,
 * chyba zmizí, jakmile pole opraví. Po odeslání potvrzení pod tlačítkem
 * (v modelu s dovětkem „Ukázka, nic se neodeslalo.“) a prázdná pole.
 * Výpadek sítě nebo chyba serveru je hláška pod poli a vyplněné údaje
 * zůstanou (withSendFallback). Bez skriptu kontroluje jen server, chyby
 * přijdou u polí.
 *
 * Jako poptávka (úprava 8 z auditu): rozepsané jméno a telefon jsou
 * v sessionStorage karty a po návratu na stránku se obnoví (po hydrataci),
 * po odeslání se smažou. Během odesílání tlačítko „Odesílám…“
 * s aria-disabled, formulář aria-busy a ohlášení čtečce (SendingStatus).
 * Potvrzení říká, do kdy Honza zavolá (FA_REPLY_TIME, úprava 16).
 */

type Errors = Partial<Record<CallbackField, string>>;
type Values = Partial<Record<CallbackField, string>>;

/** Odeslání se skriptem: výpadek sítě nebo chyba serveru vrátí hlášku místo chybové stránky. */
const sendCallback = withSendFallback(submitCallback, CALLBACK_FIELDS, SEND_FAILED.callback);

const IDS: Record<CallbackField, string> = { name: "z-jmeno", phone: "z-telefon" };
const errorId = (field: CallbackField) => `${IDS[field]}-chyba`;

interface View {
  source: CallbackFormState;
  /** Verze polí: nový stav ze serveru je vykreslí znovu s jeho hodnotami. */
  rev: number;
  errors: Errors;
  token: string | undefined;
  /** Rozepsané údaje obnovené ze sessionStorage, nový stav ze serveru je zahodí. */
  restored?: Values;
}

const viewFor = (state: CallbackFormState, prev?: View): View => ({
  source: state,
  rev: prev ? prev.rev + 1 : 0,
  errors: state.errors,
  token: state.token ?? prev?.token,
});

export function CallbackForm({ token }: { token: string }) {
  // Bez skriptu odešle formulář prohlížeč rovnou server action (action
  // formuláře), se skriptem onSubmit přes send (jako InquiryForm).
  const [serverState, serverAction] = useActionState(submitCallback, {
    ok: false,
    errors: {},
    values: {},
    token,
  });
  const [state, send, pending] = useActionState(sendCallback, serverState);
  const [saved, setSaved] = useState(() => viewFor(state));
  const view = saved.source === state ? saved : viewFor(state, saved);

  const formRef = useRef<HTMLFormElement>(null);
  const firstState = useRef(state);
  const pendingFocus = useRef<CallbackField | null>(null);
  // Odeslání běží od kliknutí do odpovědi (druhé kliknutí hned za prvním, viz InquiryForm).
  const sending = useRef(false);

  const values: Values = view.restored ?? (state.ok ? {} : state.values);
  const err = (field: CallbackField) => view.errors[field];

  // Fokus na první chybné pole až po vykreslení hlášky (aria-describedby).
  useEffect(() => {
    const field = pendingFocus.current;
    pendingFocus.current = null;
    if (field && formRef.current) focusField(formRef.current, field);
  });

  // Čas, kdy prohlížeč ukázal formulář s tokenem ze stránky: odeslání
  // obnoveného formuláře hned po načtení počká na MIN_FILL_MS (form-helpers).
  useEffect(() => {
    rememberTokenShown(token);
  }, [token]);

  // Rozepsané jméno a telefon ze sessionStorage, až po hydrataci. Stav ze
  // serveru bez skriptu (chyby, potvrzení) má přednost.
  useLayoutEffect(() => {
    const initial = firstState.current;
    if (initial.ok) {
      clearDraft(DRAFT_KEYS.callback);
      return;
    }
    if (initial.formError || Object.keys(initial.errors).length > 0) return;
    const draft = readDraft(DRAFT_KEYS.callback, CALLBACK_FIELDS);
    if (!draft) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage jde číst až v prohlížeči po hydrataci
    setSaved((prev) => ({ ...prev, rev: prev.rev + 1, restored: draft.values }));
  }, []);

  // Odpověď serveru: fokus na první chybu. Potvrzení ohlásí role="status".
  useEffect(() => {
    const form = formRef.current;
    if (state === firstState.current || !form) return;
    sending.current = false;
    if (state.ok) clearDraft(DRAFT_KEYS.callback);
    const field = CALLBACK_FIELDS.find((f) => state.errors[f]);
    if (field) focusField(form, field);
    else if (state.formError) focusFormError(form);
  }, [state]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (pending || sending.current) {
      e.preventDefault();
      return;
    }
    const errors: Errors = {};
    for (const field of CALLBACK_FIELDS) {
      const message = checkCallbackField(field, fieldValue(e.currentTarget, field));
      if (message) errors[field] = message;
    }
    setSaved({ ...view, errors });
    // Odeslání vždy přes send, action formuláře je jen pro prohlížeč bez skriptu.
    e.preventDefault();
    const first = CALLBACK_FIELDS.find((f) => errors[f]);
    if (first) {
      pendingFocus.current = first;
      return;
    }
    const formData = new FormData(e.currentTarget);
    sending.current = true;
    startTransition(() => send(formData));
  }

  function onChange(e: ChangeEvent<HTMLFormElement>) {
    const name = (e.target as unknown as { name?: string }).name ?? "";
    const field = CALLBACK_FIELDS.find((f) => f === name);
    if (field) writeDraft(DRAFT_KEYS.callback, e.currentTarget, CALLBACK_FIELDS);
    if (!field || !view.errors[field]) return;
    const errors = { ...view.errors };
    const message = checkCallbackField(field, fieldValue(e.currentTarget, field));
    if (message) errors[field] = message;
    else delete errors[field];
    setSaved({ ...view, errors });
  }

  const a11y = (field: CallbackField) => ({
    "aria-invalid": err(field) ? true : undefined,
    "aria-describedby": describedBy(err(field) && errorId(field)),
  });

  const fieldError = (field: CallbackField) => {
    const message = err(field);
    return message ? (
      <span className="fa-err" id={errorId(field)}>
        {czechNbspText(message)}
      </span>
    ) : null;
  };

  const formElement = (
    <form
      ref={formRef}
      className="form kt-1"
      id="zavolam"
      action={serverAction}
      noValidate
      aria-labelledby="zavolam-nadpis"
      aria-busy={pending || undefined}
      onSubmit={onSubmit}
      onChange={onChange}
    >
      <Fragment key={view.rev}>
        <div className={fieldClass(err("name"))}>
          <label htmlFor="z-jmeno">Jméno</label>
          <input
            className="fa-input"
            id="z-jmeno"
            name="name"
            autoComplete="name"
            required
            defaultValue={values.name ?? ""}
            {...a11y("name")}
          />
          {fieldError("name")}
        </div>
        <div className={fieldClass(err("phone"))}>
          <label htmlFor="z-telefon">Telefon</label>
          <input
            className="fa-input"
            id="z-telefon"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            defaultValue={values.phone ?? ""}
            {...a11y("phone")}
          />
          {fieldError("phone")}
        </div>
      </Fragment>
      {state.formError ? (
        <p className="fa-err" role="alert" tabIndex={-1} data-form-error="">
          {czechNbspText(state.formError)}
        </p>
      ) : null}
      <div className="form-foot">
        {/* Během odesílání aria-disabled, ne disabled: fokus zůstane na tlačítku. */}
        <button className="fa-link kt-btn" type="submit" aria-disabled={pending || undefined}>
          {pending ? SENDING : "Zavolejte mi"} <Arrow />
        </button>
      </div>
      {/* Informace o zpracování údajů v místě sběru (čl. 13 GDPR), stejný tvar jako u poptávky. Model ji tu nemá. */}
      <p className="fa-hint">
        Údaje použijeme jen k&nbsp;odpovědi.{" "}
        <Link href="/zasady-zpracovani-osobnich-udaju">Zásady zpracování osobních údajů</Link>
      </p>
      {state.ok ? (
        <p className="form-ok" role="status">
          Děkujeme, Honza vám zavolá {FA_REPLY_TIME}.
        </p>
      ) : null}
      <FormGuard id="z-web" token={view.token ?? token} />
    </form>
  );

  // Ohlášení odesílání stojí za formulářem, ne v něm (aria-busy, SendingStatus).
  return (
    <>
      {formElement}
      <SendingStatus pending={pending} />
    </>
  );
}
