import { connection } from "next/server";
import { PageHead } from "@/components/web/PageHead";
import { getTrip } from "@/data/trips";
import { PACKAGES, PACKAGE_SLUGS, packageFromParam, type PackageSlug } from "@/lib/inquiries/options";
import { createFormToken } from "@/lib/inquiries/spam";
import { pageMetadata } from "@/lib/metadata";
import {
  FA_COMPANY_COURT,
  FA_COMPANY_FILE_NO,
  FA_COMPANY_SEAT,
  FA_EMAIL,
  FA_PHONE,
  FA_PHONE_HREF,
  FA_WHATSAPP_HREF,
} from "@/lib/site";
import { NBSP, czechNbspText } from "@/lib/typography";
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

/** „6 dní“, u kratšího výletu „4 dny“ nebo „1 den“. */
function daysLabel(days: number): string {
  return `${days} ${days === 1 ? "den" : days < 5 ? "dny" : "dní"}`;
}

/**
 * Popisky voleb výletu v kroku 2 poptávky (úprava 8 z auditu, rozhodnutí
 * 14. 10. 2026): název, délka a cena od přímo z dat výletu
 * (src/data/trips.ts), „Florida Week & Fly - 6 dní, od 7 400 USD za osobu“.
 * „Zatím nevím“ a volba bez výletu v datech mají popisek z options.ts.
 * Skládá je server, aby formulář v prohlížeči nestahoval texty výletů.
 * Shrnutí po odeslání, e-maily a administrace mají dál PACKAGES.formLabel
 * a název výletu.
 */
function packageOptionLabels(): Record<PackageSlug, string> {
  const entries = PACKAGE_SLUGS.map((slug) => {
    const trip = getTrip(slug);
    const label = trip
      ? `${trip.name} - ${daysLabel(trip.numbers.days)}, od ${trip.price.from} za osobu`
      : PACKAGES[slug].formLabel;
    return [slug, czechNbspText(label)] as const;
  });
  return Object.fromEntries(entries) as Record<PackageSlug, string>;
}

/** První hodnota parametru adresy (?vylet=a&vylet=b dá „a“). */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Kontakt (rozhodnutí 12. 10. 2026, bod 7): poptávka je hlavní obsah,
 * pod ní menší blok „Nechte číslo, Honza zavolá“, vpravo krátký sloupec
 * s kontakty, který na počítači jede při posouvání s formulářem. Na mobilu
 * pod sebou v pořadí HTML: úvod s telefonem, poptávka, zavolání, kontakty.
 * Rozložení je v src/styles/pages/contact.css.
 */
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
        <div className="fa-wrap split kt-layout">
          {/* Hlavní sloupec: poptávka a pod ní menší blok „Nechte číslo, Honza zavolá“. */}
          <div className="kt-main">
            {/* Jiný výlet v adrese (přechod z jiné stránky výletu) = nový formulář s novým předvyplněním. */}
            <InquiryForm
              key={preset ?? ""}
              token={token}
              preset={preset}
              packageLabels={packageOptionLabels()}
            />

            <section className="aside kt-call" aria-labelledby="zavolam-nadpis">
              <span className="lbl">Raději telefonem</span>
              <h2 id="zavolam-nadpis">Nechte číslo, Honza zavolá</h2>
              <p>Stačí jméno a&nbsp;telefon.</p>
              <CallbackForm token={token} />
            </section>
          </div>

          {/*
            Krátký sloupec s kontakty, na počítači přilepený vedle formulářů (contact.css).
            Sekce, ne <aside> (úprava 38 z auditu): kontakty patří k obsahu stránky,
            čtečka je má najít v osnově pod nadpisem Kontakt, ne jako doplňkový panel.
          */}
          <section className="kt-contacts" aria-labelledby="kontakt-nadpis">
            <div className="kt-contacts-in">
              <h2 id="kontakt-nadpis">Kontakt</h2>
              <dl className="kt-facts">
                <div>
                  <dt>Jméno</dt>
                  <dd>Jan Čermák</dd>
                </div>
                <div>
                  <dt>Telefon</dt>
                  <dd>
                    <a className="kt-nowrap" href={FA_PHONE_HREF}>
                      {phone}
                    </a>
                  </dd>
                </div>
                {/* WhatsApp jen jako řádek s odkazem, bez plovoucí bubliny (úprava 21, rozhodnutí 14. 10. 2026), text jako v ContactList. */}
                <div>
                  <dt>WhatsApp</dt>
                  <dd>
                    <a href={FA_WHATSAPP_HREF}>
                      Napsat zprávu<span className="vh"> na WhatsApp</span>
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>
                    <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>
                  </dd>
                </div>
              </dl>

              <h3>Provozovatel</h3>
              <dl className="kt-facts">
                <div>
                  <dt>Firma</dt>
                  <dd>SKYSHARE s.r.o.</dd>
                </div>
                <div>
                  <dt>IČO</dt>
                  <dd>03725235</dd>
                </div>
                <div>
                  <dt>Sídlo</dt>
                  <dd>{FA_COMPANY_SEAT}</dd>
                </div>
                {/* Zápis v obchodním rejstříku (§ 435 občanského zákoníku, úprava 7), ověřeno v ARES 14. 10. 2026. */}
                <div>
                  <dt>Spisová značka</dt>
                  <dd>
                    {FA_COMPANY_FILE_NO}, {FA_COMPANY_COURT}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
