"use client";

import {
  Fragment,
  useActionState,
  useEffect,
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
import { czechNbspText } from "@/lib/typography";
import { submitCallback } from "./actions";
import {
  FormGuard,
  describedBy,
  fieldClass,
  fieldValue,
  focusField,
  focusFormError,
} from "./form-helpers";

/*
 * Krátký formulář „Nechte číslo, Honza zavolá“ (prototyp/kontakt.html,
 * chování .js-demo-form z js/web.js): jméno a telefon s aspoň 9 číslicemi.
 * Odeslání zkontroluje obě pole, ukáže chyby a fokus dá na první chybné,
 * chyba zmizí, jakmile pole opraví. Po odeslání potvrzení pod tlačítkem
 * (v modelu s dovětkem „Ukázka, nic se neodeslalo.“) a prázdná pole.
 * Bez skriptu kontroluje jen server, chyby přijdou u polí.
 */

type Errors = Partial<Record<CallbackField, string>>;

const IDS: Record<CallbackField, string> = { name: "z-jmeno", phone: "z-telefon" };
const errorId = (field: CallbackField) => `${IDS[field]}-chyba`;

interface View {
  source: CallbackFormState;
  /** Verze polí: nový stav ze serveru je vykreslí znovu s jeho hodnotami. */
  rev: number;
  errors: Errors;
  token: string | undefined;
}

const viewFor = (state: CallbackFormState, prev?: View): View => ({
  source: state,
  rev: prev ? prev.rev + 1 : 0,
  errors: state.errors,
  token: state.token ?? prev?.token,
});

export function CallbackForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(submitCallback, {
    ok: false,
    errors: {},
    values: {},
    token,
  });
  const [saved, setSaved] = useState(() => viewFor(state));
  const view = saved.source === state ? saved : viewFor(state, saved);

  const formRef = useRef<HTMLFormElement>(null);
  const firstState = useRef(state);
  const pendingFocus = useRef<CallbackField | null>(null);

  const values: Errors = state.ok ? {} : state.values;
  const err = (field: CallbackField) => view.errors[field];

  // Fokus na první chybné pole až po vykreslení hlášky (aria-describedby).
  useEffect(() => {
    const field = pendingFocus.current;
    pendingFocus.current = null;
    if (field && formRef.current) focusField(formRef.current, field);
  });

  // Odpověď serveru: fokus na první chybu. Potvrzení ohlásí role="status".
  useEffect(() => {
    const form = formRef.current;
    if (state === firstState.current || !form) return;
    const field = CALLBACK_FIELDS.find((f) => state.errors[f]);
    if (field) focusField(form, field);
    else if (state.formError) focusFormError(form);
  }, [state]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (pending) {
      e.preventDefault();
      return;
    }
    const errors: Errors = {};
    for (const field of CALLBACK_FIELDS) {
      const message = checkCallbackField(field, fieldValue(e.currentTarget, field));
      if (message) errors[field] = message;
    }
    setSaved({ ...view, errors });
    const first = CALLBACK_FIELDS.find((f) => errors[f]);
    if (first) {
      e.preventDefault();
      pendingFocus.current = first;
    }
  }

  function onChange(e: ChangeEvent<HTMLFormElement>) {
    const name = (e.target as unknown as { name?: string }).name ?? "";
    const field = CALLBACK_FIELDS.find((f) => f === name);
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

  return (
    <form
      ref={formRef}
      className="form kt-1"
      id="zavolam"
      action={formAction}
      noValidate
      aria-labelledby="zavolam-nadpis"
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
        <button className="fa-link kt-btn" type="submit">
          Zavolejte mi <Arrow />
        </button>
      </div>
      {/* Informace o zpracování údajů v místě sběru (čl. 13 GDPR), stejný tvar jako u poptávky. Model ji tu nemá. */}
      <p className="fa-hint">
        Údaje použijeme jen k&nbsp;odpovědi.{" "}
        <Link href="/zasady-zpracovani-osobnich-udaju">Zásady zpracování osobních údajů</Link>
      </p>
      {state.ok ? (
        <p className="form-ok" role="status">
          Děkujeme, Honza se vám ozve.
        </p>
      ) : null}
      <FormGuard id="z-web" token={view.token ?? token} />
    </form>
  );
}
