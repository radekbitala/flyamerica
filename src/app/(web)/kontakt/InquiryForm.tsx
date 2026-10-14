"use client";

import Link from "next/link";
import {
  Fragment,
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Arrow } from "@/components/web/ArrowSymbol";
import { PILOT_REQUIREMENTS_NO_LICENCE } from "@/data/pilot-requirements";
import {
  INQUIRY_FIELDS,
  INQUIRY_STEPS,
  checkInquiryField,
  singleLine,
  type InquiryField,
  type InquiryFormState,
} from "@/lib/inquiries/fields";
import {
  COMPANIONS,
  LICENCES,
  PACKAGES,
  PACKAGE_SLUGS,
  PILOT_COUNTS,
  REFERRAL_SOURCES,
  type PackageSlug,
} from "@/lib/inquiries/options";
import { ROUTES } from "@/lib/routes";
import { FA_PHONE, FA_PHONE_HREF } from "@/lib/site";
import { NBSP, czechNbspText } from "@/lib/typography";
import { submitInquiry } from "./actions";
import {
  FormGuard,
  SEND_FAILED,
  describedBy,
  fieldClass,
  fieldValue,
  focusField,
  focusFormError,
  withSendFallback,
} from "./form-helpers";

/*
 * Poptávka „Poptat termín“ na tři kroky podle prototyp/kontakt.html
 * a js/kontakt.js. Odesílá ji server action submitInquiry přes
 * useActionState: se skriptem z onSubmit, bez skriptu přes <form action>.
 * Tahle komponenta jen řídí kroky:
 *
 * 1. Pokračovat zkontroluje pole aktuálního kroku (fields.ts, stejné hlášky
 *    jako server), Zpět vrátí o krok, fokus jde na nadpis kroku. Odeslat
 *    zkontroluje i dřívější kroky (krok 1 jde přeskočit tlačítkem Změnit).
 * 2. Předvyplněný výlet z ?vylet= nebo dřívějšího ?balicek= (stránka ho
 *    pošle jako preset). Při příchodu z odkazu na výlet je nad kroky
 *    „Poptáváte: …“ s tlačítkem
 *    Změnit, změna v kroku 2 ho přepíše, u „Zatím nevím“ zmizí.
 * 3. Chyby ze serveru: formulář přejde na krok s první chybou a dá na ni
 *    fokus. Hodnoty se vrátí do polí ze state.values. Výpadek sítě nebo
 *    chyba serveru je hláška u tlačítka Odeslat a vyplněné údaje zůstanou
 *    (withSendFallback ve form-helpers.tsx), ne chybová stránka.
 * 4. Po odeslání potvrzení se shrnutím a místo „Upravit poptávku“ z modelu
 *    „Poslat další poptávku“ (prázdný formulář od kroku 1, _PRAVIDLA.md 7).
 * 5. Po volbě licence Ultralight nebo Nemám je pod volbami nápověda: Honzův
 *    odstavec z požadavků na piloty pro piloty UL a zájemce bez licence
 *    (src/data/pilot-requirements.ts). Bez skriptu až po návratu ze serveru.
 *
 * Kroky jsou skryté už v HTML ze serveru (třídy kt-js a is-current), aby se
 * formulář po načtení skriptu neskládal. Bez skriptu je ukáže <noscript>
 * styl na stránce (page.tsx): všechny kroky pod sebou bez tlačítek
 * Pokračovat a Zpět, kontroluje jen server a chyby přijdou u polí.
 */

type Errors = Partial<Record<InquiryField, string>>;
type Values = Partial<Record<InquiryField, string>>;

/** Odeslání se skriptem: výpadek sítě nebo chyba serveru vrátí hlášku místo chybové stránky. */
const sendInquiry = withSendFallback(submitInquiry, INQUIRY_FIELDS, SEND_FAILED.inquiry);

const LAST_STEP = INQUIRY_STEPS.length - 1;

const STEP_OF = Object.fromEntries(
  INQUIRY_STEPS.flatMap((fields, step) => fields.map((field) => [field, step])),
) as Record<InquiryField, number>;

/** Názvy kroků v ukazateli, doslova z modelu. */
const STEP_LABELS: ReactNode[] = [
  <>Licence a&nbsp;pár slov o&nbsp;vás</>,
  <>Výlet a&nbsp;termín</>,
  "Kontakt",
];

/** id polí z modelu (hlášky mají id s příponou -chyba). */
const IDS: Record<InquiryField, string> = {
  licence: "f-licence",
  aboutPilot: "f-onas",
  packageSlug: "f-vylet",
  travelDate: "f-kdy",
  pilotCount: "f-piloti",
  companions: "f-doprovod",
  name: "f-jmeno",
  email: "f-email",
  phone: "f-telefon",
  referralSource: "f-odkud",
  message: "f-zprava",
};

const errorId = (field: InquiryField) => `${IDS[field]}-chyba`;

/** Licence, po jejichž volbě je pod volbami nápověda pro piloty UL a zájemce bez licence. */
const NO_LICENCE_NOTE_FOR: readonly string[] = ["Ultralight", "Nemám"] satisfies (typeof LICENCES)[number][];
const LICENCE_NOTE_ID = "f-licence-pozn";

const PILOT_LABELS: Record<string, ReactNode> = {
  "1": "1",
  "2": "2",
  "3 a víc": <>3&nbsp;a&nbsp;víc</>,
} satisfies Record<(typeof PILOT_COUNTS)[number], ReactNode>;

const isPackage = (slug: string | undefined): slug is PackageSlug =>
  slug !== undefined && (PACKAGE_SLUGS as readonly string[]).includes(slug);

/** Popisek výletu ve volbě a ve shrnutí s pevnými mezerami jako model. */
const packageLabel = (slug: PackageSlug) => czechNbspText(PACKAGES[slug].formLabel);

/** Název výletu v řádku „Poptáváte“, jen u skutečného výletu (ne „Zatím nevím“). */
function chosenName(slug: string): string | undefined {
  if (slug !== "florida-week" && slug !== "grand-tour") return undefined;
  return czechNbspText(PACKAGES[slug].name);
}

function firstErrorField(errors: Errors): InquiryField | undefined {
  return INQUIRY_FIELDS.find((field) => errors[field]);
}

/**
 * Co formulář ukazuje. Patří k jednomu stavu ze serveru (source): nový stav
 * po odeslání z něj odvodí nový pohled (krok s první chybou, chyby, výlet).
 */
interface View {
  source: InquiryFormState;
  /**
   * Verze polí. Nový stav ze serveru pole vykreslí znovu (key), aby měla
   * výchozí hodnoty z nového stavu. React u <select> změnu defaultValue
   * po prvním vykreslení nepřenese.
   */
  rev: number;
  step: number;
  errors: Errors;
  /** Zaškrtnutý výlet (kvůli řádku „Poptáváte“). */
  pkg: string;
  /** Zaškrtnutá licence (kvůli nápovědě u Ultralight a Nemám). */
  licence: string;
  /** Poslední platný token, chybový stav nese nový, úspěch žádný. */
  token: string | undefined;
  /** Po „Poslat další poptávku“: místo potvrzení prázdný formulář. */
  again: boolean;
}

function viewFor(state: InquiryFormState, prev?: View): View {
  const errorField = firstErrorField(state.errors);
  let step = prev?.step ?? 0;
  if (state.ok) step = 0;
  else if (errorField) step = STEP_OF[errorField];
  else if (state.formError) step = LAST_STEP;
  return {
    source: state,
    rev: prev ? prev.rev + 1 : 0,
    step,
    errors: state.errors,
    pkg: state.ok ? "" : (state.values.packageSlug ?? ""),
    licence: state.ok ? "" : (state.values.licence ?? ""),
    token: state.token ?? prev?.token,
    again: false,
  };
}

type FocusTarget = { kind: "step" } | { kind: "done" } | { kind: "field"; field: InquiryField };

function moveFocus(form: HTMLFormElement, target: FocusTarget) {
  if (target.kind === "field") {
    focusField(form, target.field);
    return;
  }
  // Jako model: když je začátek formuláře nad obrazovkou, posunout na něj,
  // a fokus na nadpis kroku nebo potvrzení bez dalšího posunu.
  if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ block: "start" });
  const heading = form.querySelector<HTMLElement>(
    target.kind === "done" ? ".kt-done h2" : ".kt-step.is-current .kt-step-h h2",
  );
  heading?.focus({ preventScroll: true });
}

/** Zkontroluje pole kroku, chyby zapíše do errors. Vrací první chybné pole. */
function checkStep(form: HTMLFormElement, step: number, errors: Errors): InquiryField | undefined {
  let first: InquiryField | undefined;
  for (const field of INQUIRY_STEPS[step]) {
    const message = checkInquiryField(field, fieldValue(form, field));
    if (message) {
      errors[field] = message;
      first ??= field;
    } else {
      delete errors[field];
    }
  }
  return first;
}

export function InquiryForm({
  token,
  preset,
}: {
  /** Podepsaný čas vykreslení (createFormToken), stránka ho vytváří při každém požadavku. */
  token: string;
  /** Výlet z ?vylet= (nebo ?balicek=) v adrese. */
  preset: PackageSlug | null;
}) {
  // Bez skriptu formulář odešle prohlížeč rovnou server action (action
  // formuláře) a výsledek přijde v HTML nové stránky jako serverState.
  const [serverState, serverAction] = useActionState(submitInquiry, {
    ok: false,
    errors: {},
    values: preset ? { packageSlug: preset } : {},
    token,
  });
  // Se skriptem odesílá onSubmit přes send, který zachytí výpadek sítě.
  const [state, send, pending] = useActionState(sendInquiry, serverState);
  const [saved, setSaved] = useState(() => viewFor(state));
  const view = saved.source === state ? saved : viewFor(state, saved);
  const update = (patch: Partial<View>) => setSaved({ ...view, ...patch });

  const formRef = useRef<HTMLFormElement>(null);
  const firstState = useRef(state);
  const pendingFocus = useRef<FocusTarget | null>(null);

  const done = state.ok && !view.again;
  // Po odeslání prázdná pole (pro další poptávku), při chybě vyplněné hodnoty.
  const values: Values = state.ok ? {} : state.values;
  const chosen = preset && !done ? chosenName(view.pkg) : undefined;
  const licenceNote = NO_LICENCE_NOTE_FOR.includes(view.licence);
  const err = (field: InquiryField) => view.errors[field];

  // Fokus po přepnutí kroku nebo po chybě v prohlížeči (po vykreslení).
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target && formRef.current) moveFocus(formRef.current, target);
  });

  // Odpověď serveru: potvrzení, nebo první chyba. Ne při prvním vykreslení.
  useEffect(() => {
    const form = formRef.current;
    if (state === firstState.current || !form) return;
    const errorField = firstErrorField(state.errors);
    if (state.ok) moveFocus(form, { kind: "done" });
    else if (errorField) moveFocus(form, { kind: "field", field: errorField });
    else if (state.formError) focusFormError(form);
  }, [state]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const stop = (patch: Partial<View>, focus: FocusTarget) => {
      e.preventDefault();
      update(patch);
      pendingFocus.current = focus;
    };
    // Odeslaná poptávka ještě běží, druhé odeslání by ji zdvojilo.
    if (pending) {
      e.preventDefault();
      return;
    }
    const errors = { ...view.errors };
    const bad = checkStep(form, view.step, errors);
    if (bad) return stop({ errors }, { kind: "field", field: bad });
    if (view.step < LAST_STEP) return stop({ errors, step: view.step + 1 }, { kind: "step" });
    for (let step = 0; step < LAST_STEP; step++) {
      const field = checkStep(form, step, errors);
      if (field) return stop({ errors, step }, { kind: "field", field });
    }
    // Všechno v pořádku. Odeslání přes send místo action formuláře, ta by
    // výpadek sítě nechala dojít až na chybovou stránku.
    e.preventDefault();
    update({ errors });
    const formData = new FormData(form);
    startTransition(() => send(formData));
  }

  // Chyba zmizí, jakmile pole opraví. Změna výletu přepíše řádek „Poptáváte“.
  function onChange(e: ChangeEvent<HTMLFormElement>) {
    const name = (e.target as unknown as { name?: string }).name ?? "";
    if (!(INQUIRY_FIELDS as readonly string[]).includes(name)) return;
    const field = name as InquiryField;
    const value = fieldValue(e.currentTarget, field);
    const patch: Partial<View> = {};
    if (field === "packageSlug") patch.pkg = value;
    if (field === "licence") patch.licence = value;
    if (view.errors[field]) {
      const errors = { ...view.errors };
      const message = checkInquiryField(field, value);
      if (message) errors[field] = message;
      else delete errors[field];
      patch.errors = errors;
    }
    if (Object.keys(patch).length > 0) update(patch);
  }

  function goTo(step: number) {
    update({ step });
    pendingFocus.current = { kind: "step" };
  }

  function sendAnother(e: MouseEvent<HTMLAnchorElement>) {
    // Bez skriptu odkaz načte prázdnou stránku Kontakt, se skriptem stačí ukázat formulář.
    e.preventDefault();
    update({ again: true, step: 0, errors: {}, pkg: "", licence: "" });
    pendingFocus.current = { kind: "step" };
  }

  const stepClass = (step: number) =>
    !done && step === view.step ? "form kt-step is-current" : "form kt-step";

  const fieldError = (field: InquiryField) => {
    const message = err(field);
    return message ? (
      <span className="fa-err" id={errorId(field)}>
        {czechNbspText(message)}
      </span>
    ) : null;
  };

  /** Atributy pole: aria-invalid a aria-describedby s nápovědou a hláškou. */
  const a11y = (field: InquiryField, hint?: string) => ({
    "aria-invalid": err(field) ? true : undefined,
    "aria-describedby": describedBy(hint, err(field) && errorId(field)),
  });

  const radios = (field: InquiryField, options: readonly string[], label: (value: string) => ReactNode) =>
    options.map((value, i) => (
      <label key={value}>
        <input
          type="radio"
          name={field}
          value={value}
          required={i === 0}
          defaultChecked={values[field] === value}
          {...a11y(field)}
        />{" "}
        {label(value)}
      </label>
    ));

  const back = (
    <button className="fa-link kt-btn" type="button" data-kt-js="" onClick={() => goTo(view.step - 1)}>
      Zpět
    </button>
  );
  const next = (
    <button className="fa-dir fa-dir--grafit" type="submit" data-kt-js="">
      <span className="t">Pokračovat</span>
      <Arrow />
    </button>
  );

  const summary: [string, ReactNode][] = [
    ["Licence", state.values.licence],
    ["Výlet", isPackage(state.values.packageSlug) ? packageLabel(state.values.packageSlug) : ""],
    ["Termín", singleLine(state.values.travelDate ?? "")],
    ["Počet pilotů", PILOT_LABELS[state.values.pilotCount ?? ""] ?? state.values.pilotCount],
    ["Doprovod", state.values.companions],
    ["Jméno", singleLine(state.values.name ?? "")],
    ["E-mail", (state.values.email ?? "").trim()],
    ["Telefon", singleLine(state.values.phone ?? "")],
  ];

  return (
    <form
      ref={formRef}
      className="kt-form kt-js"
      id="poptavka"
      action={serverAction}
      noValidate
      aria-labelledby="poptavka-nadpis"
      onSubmit={onSubmit}
      onChange={onChange}
    >
      <h2 className="vh" id="poptavka-nadpis">
        Poptávkový formulář
      </h2>
      <p className="kt-chosen" id="kt-vybrano" hidden={!chosen}>
        <span>
          Poptáváte: <strong>{chosen}</strong>
        </span>
        <button className="fa-link kt-btn" type="button" data-kt-js="" onClick={() => goTo(1)}>
          Změnit
        </button>
      </p>
      <ol className="kt-steps" aria-label="Kroky poptávky" hidden={done}>
        {STEP_LABELS.map((label, step) => (
          <li
            key={step}
            aria-current={!done && step === view.step ? "step" : undefined}
            className={step < view.step ? "is-done" : undefined}
          >
            <span className="n" aria-hidden="true">
              {String(step + 1).padStart(2, "0")}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <Fragment key={view.rev}>
        {/* Krok 1 */}
        <div className={stepClass(0)} id="krok-1" role="group" aria-labelledby="krok-1-h" hidden={done}>
          <div className="kt-step-h">
            <h2 id="krok-1-h" tabIndex={-1}>
              <span className="vh">Krok&nbsp;1 ze 3: </span>Pilotní licence a&nbsp;pár slov o&nbsp;vás
            </h2>
          </div>
          <fieldset
            className={fieldClass(err("licence"), true)}
            id="f-licence"
            aria-describedby={describedBy("f-licence-hint", licenceNote && LICENCE_NOTE_ID)}
          >
            <legend>Pilotní licence</legend>
            <div className="checks">{radios("licence", LICENCES, (v) => v)}</div>
            <span className="fa-hint" id="f-licence-hint">
              Jinou licenci napište do pole Pár slov o&nbsp;vás.
            </span>
            {/* Oblast je v HTML pořád (aria-live ohlásí nápovědu po volbě), prázdná nezabírá místo (contact.css). */}
            <div className="kt-licence-note" aria-live="polite">
              {licenceNote ? (
                <p className="fa-hint" id={LICENCE_NOTE_ID}>
                  {czechNbspText(PILOT_REQUIREMENTS_NO_LICENCE)}
                </p>
              ) : null}
            </div>
            {fieldError("licence")}
          </fieldset>
          <div className={fieldClass(err("aboutPilot"), true)}>
            <label htmlFor="f-onas">
              Pár slov o&nbsp;vás <span className="fa-hint">(nepovinné)</span>
            </label>
            <textarea
              className="fa-input"
              id="f-onas"
              name="aboutPilot"
              defaultValue={values.aboutPilot ?? ""}
              {...a11y("aboutPilot", "f-onas-hint")}
            />
            <span className="fa-hint" id="f-onas-hint">
              Třeba kolik máte nalétáno, na čem létáte a&nbsp;co od Floridy čekáte.
            </span>
            {fieldError("aboutPilot")}
          </div>
          <div className="kt-nav">{next}</div>
        </div>

        {/* Krok 2 */}
        <div className={stepClass(1)} id="krok-2" role="group" aria-labelledby="krok-2-h" hidden={done}>
          <div className="kt-step-h">
            <h2 id="krok-2-h" tabIndex={-1}>
              <span className="vh">Krok&nbsp;2 ze 3: </span>O&nbsp;jaký výlet máte zájem a&nbsp;kdy
            </h2>
          </div>
          <fieldset className={fieldClass(err("packageSlug"), true)} id="f-vylet">
            <legend>Výlet</legend>
            <div className="checks kt-col">
              {radios("packageSlug", PACKAGE_SLUGS, (v) => packageLabel(v as PackageSlug))}
            </div>
            <span className="fa-hint">
              <span className="todo">[doplnit: 3. výlet od Honzy]</span>{" "}
              <Link href={ROUTES.trips}>Porovnat výlety</Link>
            </span>
            {fieldError("packageSlug")}
          </fieldset>
          <div className={fieldClass(err("travelDate"))}>
            <label htmlFor="f-kdy">Kdy chcete letět</label>
            <input
              className="fa-input"
              id="f-kdy"
              name="travelDate"
              required
              placeholder="třeba březen 2027"
              defaultValue={values.travelDate ?? ""}
              {...a11y("travelDate", "f-kdy-hint")}
            />
            <span className="fa-hint" id="f-kdy-hint">
              Stačí měsíc nebo rozmezí.
            </span>
            {fieldError("travelDate")}
          </div>
          <fieldset className={fieldClass(err("pilotCount"))} id="f-piloti">
            <legend>Kolik pilotů poletí</legend>
            <div className="checks">{radios("pilotCount", PILOT_COUNTS, (v) => PILOT_LABELS[v])}</div>
            {fieldError("pilotCount")}
          </fieldset>
          <fieldset className={fieldClass(err("companions"), true)} id="f-doprovod" aria-describedby="f-doprovod-hint">
            <legend>
              Pojede s&nbsp;vámi doprovod? <span className="fa-hint">(nepovinné)</span>
            </legend>
            <div className="checks">
              {COMPANIONS.map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="companions"
                    value={value}
                    defaultChecked={values.companions === value}
                    {...a11y("companions")}
                  />{" "}
                  {value}
                </label>
              ))}
            </div>
            <span className="fa-hint" id="f-doprovod-hint">
              Partner, rodina nebo přátelé, kteří nebudou pilotovat.
            </span>
            {fieldError("companions")}
          </fieldset>
          <div className="kt-nav">
            {next}
            {back}
          </div>
        </div>

        {/* Krok 3 */}
        <div className={stepClass(2)} id="krok-3" role="group" aria-labelledby="krok-3-h" hidden={done}>
          <div className="kt-step-h">
            <h2 id="krok-3-h" tabIndex={-1}>
              <span className="vh">Krok&nbsp;3 ze 3: </span>Jak vás zastihneme
            </h2>
          </div>
          <div className={fieldClass(err("name"))}>
            <label htmlFor="f-jmeno">Jméno a&nbsp;příjmení</label>
            <input
              className="fa-input"
              id="f-jmeno"
              name="name"
              autoComplete="name"
              required
              defaultValue={values.name ?? ""}
              {...a11y("name")}
            />
            {fieldError("name")}
          </div>
          <div className={fieldClass(err("email"))}>
            <label htmlFor="f-email">E-mail</label>
            <input
              className="fa-input"
              id="f-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              defaultValue={values.email ?? ""}
              {...a11y("email")}
            />
            {fieldError("email")}
          </div>
          <div className={fieldClass(err("phone"))}>
            <label htmlFor="f-telefon">
              Telefon <span className="fa-hint">(nepovinné)</span>
            </label>
            <input
              className="fa-input"
              id="f-telefon"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              defaultValue={values.phone ?? ""}
              {...a11y("phone")}
            />
            {fieldError("phone")}
          </div>
          <div className={fieldClass(err("referralSource"))}>
            <label htmlFor="f-odkud">
              Odkud o&nbsp;nás víte <span className="fa-hint">(nepovinné)</span>
            </label>
            <span className="kt-select">
              <select
                className="fa-input"
                id="f-odkud"
                name="referralSource"
                defaultValue={values.referralSource ?? ""}
                {...a11y("referralSource")}
              >
                <option value="">Vyberte</option>
                {REFERRAL_SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </span>
            {fieldError("referralSource")}
          </div>
          <div className={fieldClass(err("message"), true)}>
            <label htmlFor="f-zprava">
              Chcete ještě něco dodat? <span className="fa-hint">(nepovinné)</span>
            </label>
            <textarea
              className="fa-input"
              id="f-zprava"
              name="message"
              defaultValue={values.message ?? ""}
              {...a11y("message")}
            />
            {fieldError("message")}
          </div>
          {/* Rozhodnutí 10. 10. 2026: místo souhlasu se zpracováním údajů jen informační věta s odkazem na zásady. */}
          <p className="fa-hint wide">
            Údaje použijeme jen k&nbsp;odpovědi na poptávku.{" "}
            <Link href="/zasady-zpracovani-osobnich-udaju">Zásady zpracování osobních údajů</Link>
          </p>
          {state.formError ? (
            <p className="fa-err wide" role="alert" tabIndex={-1} data-form-error="">
              {czechNbspText(state.formError)}
            </p>
          ) : null}
          <div className="kt-nav">
            <button className="fa-dir fa-dir--grafit" type="submit">
              <span className="t">Odeslat poptávku</span>
              <Arrow />
            </button>
            {back}
          </div>
        </div>
      </Fragment>

      {done ? (
        <div className="kt-done" id="kt-hotovo">
          <h2 tabIndex={-1}>Děkujeme, poptávka je odeslaná</h2>
          <p>
            Honza se vám ozve na e-mail <strong>{(state.values.email ?? "").trim()}</strong>{" "}
            <span className="todo">[doplnit: do kdy se Honza ozve, od Honzy]</span>.
          </p>
          <p className="kt-done-tel">
            Spěcháte? Zavolejte Honzovi: <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", NBSP)}</a>
          </p>
          <dl>
            {summary
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
          {/* Odeslanou poptávku už upravit nejde (_PRAVIDLA.md, část 7). */}
          <a className="fa-link kt-btn" href="/kontakt#poptavka" onClick={sendAnother}>
            Poslat další poptávku
          </a>
        </div>
      ) : null}

      <FormGuard id="f-web" token={view.token ?? token} />
    </form>
  );
}
