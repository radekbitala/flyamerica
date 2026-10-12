import { connection } from "next/server";
import { Figure } from "@/components/web/Figure";
import { PageHead } from "@/components/web/PageHead";
import { packageFromParam } from "@/lib/inquiries/options";
import { createFormToken } from "@/lib/inquiries/spam";
import { pageMetadata } from "@/lib/metadata";
import { FA_EMAIL, FA_PHONE, FA_PHONE_HREF } from "@/lib/site";
import { NBSP } from "@/lib/typography";
import { CallbackForm } from "./CallbackForm";
import { InquiryForm } from "./InquiryForm";

export const metadata = pageMetadata({
  title: "Kontakt",
  description:
    "Poptávka létání na Floridě s mentorem Honzou Čermákem: formulář na tři kroky, telefon a e-mail.",
  path: "/kontakt",
});

/**
 * Bez skriptu všechny kroky poptávky pod sebou jako v modelu, bez tlačítek
 * Pokračovat, Zpět a Změnit a bez řádku „Poptáváte“ (ten hlídá skript).
 * Se skriptem jsou kroky skryté už v HTML ze serveru (InquiryForm).
 */
const NOSCRIPT_STEPS =
  "<style>" +
  ".kt-form.kt-js .kt-step:not([hidden]) { display: grid !important; }" +
  ".kt-form [data-kt-js], .kt-form .kt-chosen { display: none !important; }" +
  ".kt-steps li[aria-current] { color: var(--s600); border-top-color: var(--papir-t); }" +
  "</style>";

const phone = FA_PHONE.replaceAll(" ", NBSP);

/** První hodnota parametru adresy (?vylet=a&vylet=b dá „a“). */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { vylet, balicek } = await searchParams;
  // Token nese čas vykreslení, musí vzniknout při každém požadavku (spam.ts).
  await connection();
  const token = createFormToken();
  // ?vylet= z odkazů „Poptat tento výlet“, ?balicek= ze starších odkazů (platí dál).
  const preset = packageFromParam(firstParam(vylet)) ?? packageFromParam(firstParam(balicek));

  return (
    <>
      <PageHead
        label="Kontakt"
        title="Napište, kdy chcete letět."
        perex={<>Odpoví vám přímo Honza. Poptávka má tři krátké kroky, termín a&nbsp;podrobnosti doladíte spolu.</>}
      >
        <p className="kt-tel">
          Nebo zavolejte Honzovi: <a href={FA_PHONE_HREF}>{phone}</a>
        </p>
      </PageHead>

      <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT_STEPS }} />

      <section className="sec sec--tight sec--line" aria-label="Poptávka a kontakt">
        <div className="fa-wrap split">
          {/* Jiný výlet v adrese (přechod z jiné stránky výletu) = nový formulář s novým předvyplněním. */}
          <InquiryForm key={preset ?? ""} token={token} preset={preset} />

          <div className="kt-side">
            <section className="aside" aria-labelledby="zavolam-nadpis">
              <span className="lbl">Raději telefonem</span>
              <h2 id="zavolam-nadpis">Nechte číslo, Honza zavolá</h2>
              <p>Stačí jméno a&nbsp;telefon, Honza se vám ozve.</p>
              <CallbackForm token={token} />
            </section>

            <section aria-labelledby="kontakt-nadpis">
              <h2 id="kontakt-nadpis">Kontakt</h2>
              <Figure photo="honza-mustang-kalmar" sizes="360px" className="fig fig--43" />
              <ul className="contact-list">
                <li>
                  <span className="k">Jméno</span> Jan Čermák
                </li>
                <li>
                  <span className="k">Telefon</span> <a href={FA_PHONE_HREF}>{phone}</a>
                </li>
                <li>
                  <span className="k">E-mail</span> <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>
                </li>
              </ul>
            </section>

            <section aria-labelledby="provozovatel-nadpis">
              <h2 id="provozovatel-nadpis">Provozovatel</h2>
              <ul className="contact-list">
                <li>
                  <span className="k">Firma</span> SKYSHARE s.r.o.
                </li>
                <li>
                  <span className="k">IČO</span> 03725235
                </li>
                <li>
                  <span className="k">Sídlo</span> <span className="todo">[doplnit: sídlo firmy]</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
