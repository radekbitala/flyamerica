import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { HonzaWho } from "@/components/web/HonzaWho";
import { inquiryHref } from "@/components/web/nav";
import type { TripSlug } from "@/data/trip-slugs";
import { FA_EMAIL, FA_PHONE, FA_PHONE_HREF } from "@/lib/site";
import { NBSP } from "@/lib/typography";

/**
 * Panel Poptávka vedle tabulky cen na stránce výletu (.pk-ask), doslova
 * z modelu. Jediná výzva na obrazovce, grafitová na Papíru, vede na
 * formulář s předvyplněným výletem (?vylet=). Nadpis má id "ask-nadpis",
 * na stránce smí být jen jednou.
 */
export function TripAsk({ trip }: { trip: TripSlug }) {
  return (
    <aside className="aside pk-ask" aria-labelledby="ask-nadpis">
      <span className="lbl">Poptávka</span>
      <h3 id="ask-nadpis">Napište, kdy chcete letět.</h3>
      <p>Odpoví vám přímo Honza. Poptávka má tři krátké kroky, termín a&nbsp;podrobnosti doladíte spolu.</p>
      <HonzaWho />
      <Link className="fa-dir fa-dir--grafit" href={inquiryHref(trip)}>
        <span className="t">Poptat tento výlet</span>
        <Arrow />
      </Link>
      <ul className="contact-list">
        <li>
          <span className="k">Telefon</span> <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", NBSP)}</a>
        </li>
        <li>
          <span className="k">E-mail</span> <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>
        </li>
      </ul>
    </aside>
  );
}
