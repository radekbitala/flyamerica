import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { ContactList } from "@/components/web/ContactList";
import { HonzaWho } from "@/components/web/HonzaWho";
import { inquiryHref } from "@/components/web/nav";
import type { TripSlug } from "@/data/trip-slugs";

/**
 * Panel Poptávka vedle tabulky cen na stránce výletu (.pk-ask), doslova
 * z modelu. Jediná výzva na obrazovce, grafitová na Papíru, vede na
 * formulář s předvyplněným výletem (?vylet=). Nadpis má id "ask-nadpis",
 * na stránce smí být jen jednou.
 *
 * Panel je <section> s názvem z nadpisu, ne <aside> (úprava 38 z auditu,
 * rozhodnutí 14. 10. 2026): je to hlavní výzva stránky, ne doplňkový obsah.
 * Vzhled se nemění (třídy .aside .pk-ask).
 */
export function TripAsk({ trip }: { trip: TripSlug }) {
  return (
    <section className="aside pk-ask" aria-labelledby="ask-nadpis">
      <span className="lbl">Poptávka</span>
      <h3 id="ask-nadpis">Napište, kdy chcete letět.</h3>
      <p>Odpoví vám přímo Honza. Poptávka má tři krátké kroky, termín a&nbsp;podrobnosti doladíte spolu.</p>
      <HonzaWho />
      <Link className="fa-dir fa-dir--grafit" href={inquiryHref(trip)}>
        <span className="t">Poptat tento výlet</span>
        <Arrow />
      </Link>
      <ContactList />
    </section>
  );
}
