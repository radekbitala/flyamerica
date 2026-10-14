import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { getDestination, type Destination } from "@/data/destinations";
import type { Trip } from "@/data/trips";
import { ROUTES, destinationPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";

/** Destinace z Kam letět, které Honza u výletu jmenuje (trips.ts, pole destinations), v pořadí textu. */
export function tripDestinations(trip: Trip): Destination[] {
  return trip.destinations.flatMap((slug) => getDestination(slug) ?? []);
}

/**
 * Panel vedle přehledu programu: destinace z Kam letět, o kterých Honza
 * u výletu píše, s kódem letiště doslova (Overpass Mono, bez štítku s polem)
 * a odkazem na detail destinace (na webu v okně nad stránkou). Vyplňuje
 * pravý sloupec .split, který dřív zůstával prázdný.
 *
 * Panel je <section> s názvem z nadpisu, ne <aside> (úprava 38 z auditu,
 * rozhodnutí 14. 10. 2026): destinace patří k programu výletu, nejsou
 * doplňkový obsah. Vzhled se nemění (třídy .aside .vy-route).
 */
export function TripRoute({ trip }: { trip: Trip }) {
  const destinations = tripDestinations(trip);
  if (destinations.length === 0) return null;
  return (
    <section className="aside vy-route" aria-labelledby="na-trase">
      <h3 id="na-trase">Destinace na trase</h3>
      <ul className="vy-route-list">
        {destinations.map((destination) => (
          <li key={destination.slug}>
            <Link href={destinationPath(destination.slug)}>
              <span className="vy-route-name">{czechNbspText(destination.shortName)}</span>
              <span className="mono vy-route-code">{destination.code}</span>
              <Arrow />
            </Link>
          </li>
        ))}
      </ul>
      <p className="vy-route-more">
        <Link className="fa-link" href={ROUTES.destinations}>
          Všechny destinace <Arrow />
        </Link>
      </p>
    </section>
  );
}
