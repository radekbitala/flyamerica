import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/web/ArrowSymbol";
import { Crumbs } from "@/components/web/PageHead";
import { Photo } from "@/components/web/Photo";
import { PilotRequirements } from "@/components/web/PilotRequirements";
import { TripAsk } from "@/components/web/TripAsk";
import { inquiryHref } from "@/components/web/nav";
import {
  AIRCRAFT,
  TRIPS,
  formatTripSubtitle,
  getTrip,
  otherTrip,
  splitPrice,
  type Trip,
  type TripTable,
} from "@/data/trips";
import { pageMetadata } from "@/lib/metadata";
import { ROUTES, tripPath } from "@/lib/routes";
import { NBSP, czechNbspText } from "@/lib/typography";
import { TripPhotoRow } from "../_components/TripPhotoRow";
import { TripRoute } from "../_components/TripRoute";
import { TRIP_MEDIA } from "../_data/trip-media";

// Detail leteckého výletu (dřív stránky balíčků, prototyp/balicek-*.html).
// Texty, tabulky a ceny doslova od Honzy ze src/data/trips.ts, pevné mezery
// doplní czechNbspText(). Florida Week má navíc průběh přípravy (Honza ho
// napsal jen k výletu 1).
//
// Úpravy 12. 10. 2026: pod záhlavím posuvná řada fotek destinací z trasy
// (_components/PhotoRow.tsx) místo jedné velké fotky, vedle přehledu
// programu destinace na trase s odkazem na Kam letět, letadlo jednou
// (AIRCRAFT, popis z výletu 1).
// Polohová tabule (nejvýš jedna v záběru) je jen v drobečcích záhlaví. Kam dál
// je poslední sekce nad patičkou s kódem FA83 (také polohová tabule), proto
// má šedý štítek (DESIGN.md, The One Location Sign Rule).

interface TripPageProps {
  params: Promise<{ slug: string }>;
}

/** Jen výlety ze src/data/trips.ts, jiná adresa je 404. */
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return TRIPS.map((trip) => ({ slug: trip.slug }));
}

export async function generateMetadata({ params }: TripPageProps): Promise<Metadata> {
  const trip = getTrip((await params).slug);
  if (!trip) notFound();
  return pageMetadata({ title: trip.name, description: trip.description, path: tripPath(trip.slug) });
}

/** sizes dlaždice v Kam dál (.pk-next, 2 sloupce). */
const NEXT_SIZES = "(max-width: 600px) 100vw, 564px";

export default async function TripPage({ params }: TripPageProps) {
  const trip = getTrip((await params).slug);
  if (!trip) notFound();
  const other = otherTrip(trip.slug);
  const otherCard = TRIP_MEDIA[other.slug].card;

  return (
    <>
      {/* ===== ZÁHLAVÍ ===== */}
      <header className="page-head">
        <div className="fa-wrap pk-head">
          <Crumbs href={ROUTES.trips} label="Letecké výlety" current={czechNbspText(trip.name)} />
          <div className="pk-head-text">
            <h1>{czechNbspText(trip.name)}</h1>
            <p className="pk-sub">{formatTripSubtitle(trip.subtitle)}</p>
            <p className="perex">{czechNbspText(trip.intro)}</p>
          </div>
          {/* Cena a výzva hned v záhlaví (nález Impeccable 2): na počítači vpravo vedle perexu, pod 961 px pod perexem a nad řadou fotek.
               V záběru 3 tabulové prvky: logo, drobečky Letecké výlety a tato výzva.
               Pod výzvou dva textové odkazy se stejným názvem u obou výletů (úprava 14, rozhodnutí 14. 10. 2026): na tabulku
               variant (Honzův nadpis je „Varianty a cena“, nebo jen „Cena“) a na tabulku Co zahrnuje cena / Co je v ceně. */}
          <aside className="aside pk-sum" aria-labelledby="cena-od">
            <span className="lbl" id="cena-od">Cena od</span>
            <p className="pk-price">{czechNbspText(trip.price.from)}</p>
            <p className="pk-price-note">{czechNbspText(trip.price.note)}</p>
            <Link className="fa-dir fa-dir--grafit" href={inquiryHref(trip.slug)}><span className="t">Poptat tento výlet</span><Arrow /></Link>
            <ul className="pk-sum-more">
              <li><a className="fa-link" href="#cena">Ceny pro 1&nbsp;a&nbsp;2&nbsp;piloty <Arrow /></a></li>
              <li><a className="fa-link" href="#v-cene">Co zahrnuje cena <Arrow /></a></li>
            </ul>
          </aside>
        </div>
      </header>

      {/* ===== FOTKY DESTINACÍ: posuvná řada bez automatického přetáčení ===== */}
      <TripPhotoRow trip={trip} />

      {/* ===== PŘEHLED PROGRAMU (letadlo jednotně z AIRCRAFT) a destinace na trase ===== */}
      <section className="sec sec--tight" aria-labelledby="program">
        <div className="fa-wrap">
          <div className="split">
            <div>
              <h2 id="program" className="pk-h2">Přehled programu</h2>
              <dl className="pk-data">
                <Overview trip={trip} />
              </dl>
              {/* Honzovy požadavky na piloty (13. 10. 2026), stejné u obou výletů, text v src/data/pilot-requirements.ts */}
              <div className="pk-req">
                <h3>Požadavky na piloty</h3>
                <PilotRequirements className="pk-req-text" />
              </div>
            </div>
            <TripRoute trip={trip} />
          </div>
        </div>
      </section>

      {/* ===== CO ZAHRNUJE CENA (tabulka doslova podle Honzy) ===== */}
      <section className="sec sec--tight sec--white" aria-labelledby="v-cene">
        <div className="fa-wrap">
          {trip.included.intro ? (
            <div className="sec-head">
              <div><h2 id="v-cene">{czechNbspText(trip.included.title)}</h2></div>
              <p>{czechNbspText(trip.included.intro)}</p>
            </div>
          ) : (
            <h2 id="v-cene" className="pk-h2">{czechNbspText(trip.included.title)}</h2>
          )}
          <PriceTable table={trip.included} labelledBy="v-cene" />
        </div>
      </section>

      {/* ===== VARIANTY A CENA + výzva vedle tabulky (jediná výzva na obrazovce, grafitová na Papíru) ===== */}
      <section className="sec sec--tight" id="cena" aria-labelledby="cena-nadpis">
        <div className="fa-wrap split">
          <div>
            <h2 id="cena-nadpis" className="pk-h2">{czechNbspText(trip.variants.title)}</h2>
            <PriceTable table={trip.variants} labelledBy="cena-nadpis" priceColumn={1} />
            {trip.variants.note ? <p className="pk-note">{czechNbspText(trip.variants.note)}</p> : null}
          </div>
          <TripAsk trip={trip.slug} />
        </div>
      </section>

      {/* ===== PRŮBĚH PŘÍPRAVY (jen Florida Week, jediná tmavá sekce stránky) ===== */}
      {trip.preparation ? (
        <section className="sec sec--tight sec--dark steps on-dark" id="priprava" aria-labelledby="priprava-nadpis">
          <div className="fa-wrap">
            <div className="sec-head">
              <div><span className="lbl">Jak to probíhá</span><h2 id="priprava-nadpis">Průběh přípravy</h2></div>
            </div>
            <ol className="fa-steps" style={{ "--n": String(trip.preparation.length) } as CSSProperties}>
              {trip.preparation.map((step, index) => (
                <li key={step.when}>
                  <span className="fa-step-n" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{czechNbspText(step.when)}</h3>
                  <p>{czechNbspText(step.text)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* ===== KAM DÁL: druhý výlet a Kam letět. Bez tmavé sekce nad sebou s linkou.
           Šedý štítek, ne polohová tabule: sekce je těsně nad patičkou a s kódem FA83 by byla v jednom záběru
           (na 768 x 1024 vždy, na 1440 x 900 skoro). ===== */}
      <section className={trip.preparation ? "sec sec--tight" : "sec sec--tight sec--line"} aria-labelledby="dal-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Kam dál</span><h2 id="dal-nadpis">Další výlet a&nbsp;kam letět</h2></div>
          </div>
          <div className="grid-2 pk-next">
            <Link className="tip" href={tripPath(other.slug)}>
              <div className="tip-img">
                <Photo
                  photo={otherCard.photo}
                  alt={otherCard.alt}
                  sizes={NEXT_SIZES}
                  style={otherCard.position ? { objectPosition: otherCard.position } : undefined}
                />
              </div>
              <span className="lbl">Další výlet</span>
              <h3>{czechNbspText(other.name)}</h3>
              <p>{formatTripSubtitle(other.subtitle)}</p>
            </Link>
            <Link className="tip" href={ROUTES.destinations}>
              <div className="tip-img"><Photo photo="fa83-orlando-north-letecky" sizes={NEXT_SIZES} /></div>
              <span className="lbl">Kam letět</span>
              <h3>Kam z&nbsp;Orlanda doletět</h3>
              <p>Cedar Key, Albert Whitted, Vero Beach, Palatka, Kissimmee, Merritt Island, Key&nbsp;West a&nbsp;Everglades.</p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** Přehled programu: Honzovy řádky a letadlo (stejné u obou výletů) jako druhý řádek, kde ho Honza měl. */
function Overview({ trip }: { trip: Trip }) {
  const [first, ...rest] = trip.overview;
  const row = (term: string, text: string) => (
    <div key={term}>
      <dt>{term}</dt>
      <dd>{czechNbspText(text)}</dd>
    </div>
  );
  return (
    <>
      {first ? row(first.term, first.text) : null}
      {row("Letadlo", `${AIRCRAFT.name} - ${AIRCRAFT.description}`)}
      {rest.map((fact) => row(fact.term, fact.text))}
    </>
  );
}

/**
 * Tabulka z Honzova podkladu (.fa-table .pk-table). Na mobilu se řádky
 * skládají a popisek buňky je z data-label. priceColumn = sloupec s cenou,
 * částka v něm tabulkovými číslicemi (.num).
 */
function PriceTable({ table, labelledBy, priceColumn }: { table: TripTable; labelledBy: string; priceColumn?: number }) {
  return (
    <table className="fa-table pk-table" aria-labelledby={labelledBy}>
      <thead>
        <tr>
          {table.columns.map((column) => (
            <th key={column} scope="col">{czechNbspText(column)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, index) => (
              <td key={index} data-label={table.columns[index]}>
                {index === priceColumn ? <PriceCell cell={cell} /> : czechNbspText(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Buňka ceny: částka tabulkovými číslicemi, „za osobu“ se jako v modelu nezalamuje. */
function PriceCell({ cell }: { cell: string }) {
  const { amount, rest } = splitPrice(cell);
  if (!amount) return <>{czechNbspText(cell)}</>;
  return (
    <>
      <span className="num">{czechNbspText(amount)}</span>
      {czechNbspText(rest).replace(" za osobu", ` za${NBSP}osobu`)}
    </>
  );
}
