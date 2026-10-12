import Link from "next/link";
import type { ReactNode } from "react";
import { AIRCRAFT, TRIPS, tripFact, type Trip, type TripFactKey } from "@/data/trips";
import { destinationPath, tripPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { tripDestinations } from "./TripRoute";

/**
 * Řádek srovnání: náš krátký název řádku a údaj z přehledu programu
 * (trips.ts, tripFact(): Florida Week a Grand Tour pojmenovávají stejný
 * údaj různě, „Délka pobytu“ / „Délka“).
 */
const FACT_ROWS: readonly { label: string; fact: TripFactKey }[] = [
  { label: "Délka", fact: "length" },
  { label: "Nálet", fact: "hours" },
];

/**
 * Možné cíle: Honzův řádek „Možné cíle“ (Grand Tour) doslova. Florida Week
 * ho nemá, místo něj destinace, které Honza jmenuje v úvodu výletu
 * (Cedar Key, Albert Whitted), s odkazem na Kam letět.
 */
function Destinations({ trip }: { trip: Trip }) {
  const text = trip.overview.find((item) => item.term === "Možné cíle")?.text;
  if (text) return <>{czechNbspText(text)}</>;
  return (
    <ul className="vy-compare-dest">
      {tripDestinations(trip).map((destination) => (
        <li key={destination.slug}>
          <Link href={destinationPath(destination.slug)}>{czechNbspText(destination.shortName)}</Link>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr role="row">
      <th role="rowheader" scope="row">
        {label}
      </th>
      {children}
    </tr>
  );
}

/**
 * Srovnání obou výletů na přehledu /letecke-vylety: délka (letové a volné
 * dny), nálet, možné cíle a cena „od“ z src/data/trips.ts doslova. Letadlo je
 * u obou stejné, proto jeden řádek přes oba sloupce (AIRCRAFT).
 *
 * Na mobilu se řádek skládá: název řádku přes celou šířku a hodnoty obou
 * výletů vedle sebe pod ním (CSS grid). Grid ruší výchozí roli prvků
 * tabulky v některých prohlížečích, proto mají role uvedené výslovně.
 */
export function TripCompare({ labelledBy }: { labelledBy: string }) {
  return (
    <table className="vy-compare" role="table" aria-labelledby={labelledBy}>
      <thead role="rowgroup">
        <tr role="row">
          <td role="cell" className="vy-compare-corner" />
          {TRIPS.map((trip) => (
            <th key={trip.slug} role="columnheader" scope="col">
              <Link href={tripPath(trip.slug)}>{czechNbspText(trip.name)}</Link>
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {FACT_ROWS.map((row) => (
          <Row key={row.label} label={row.label}>
            {TRIPS.map((trip) => (
              <td key={trip.slug} role="cell">
                {czechNbspText(tripFact(trip, row.fact) ?? "")}
              </td>
            ))}
          </Row>
        ))}
        <Row label="Možné cíle">
          {TRIPS.map((trip) => (
            <td key={trip.slug} role="cell">
              <Destinations trip={trip} />
            </td>
          ))}
        </Row>
        <Row label="Cena od">
          {TRIPS.map((trip) => (
            <td key={trip.slug} role="cell">
              <span className="vy-compare-price">{czechNbspText(trip.price.from)}</span>
              <span className="vy-compare-note">{czechNbspText(trip.price.note)}</span>
            </td>
          ))}
        </Row>
        <Row label="Letadlo">
          <td role="cell" colSpan={TRIPS.length} className="vy-compare-all">
            {czechNbspText(`${AIRCRAFT.name} - ${AIRCRAFT.description}`)}
          </td>
        </Row>
      </tbody>
    </table>
  );
}
