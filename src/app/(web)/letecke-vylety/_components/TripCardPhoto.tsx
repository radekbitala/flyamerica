import Link from "next/link";
import { Photo } from "@/components/web/Photo";
import type { Trip } from "@/data/trips";
import { tripPath } from "@/lib/routes";
import { TRIP_MEDIA } from "../_data/trip-media";

/**
 * Fotka karty výletu (.pkg na úvodu i na přehledu /letecke-vylety) jako
 * odkaz na detail výletu (úprava 28 z auditu, rozhodnutí 14. 10. 2026).
 * Odkaz pro čtečky a klávesnici je nadpis karty, fotka je jen větší plocha
 * pro myš a prst: mimo pořadí Tab (tabIndex -1) a skrytá čtečkám
 * (aria-hidden), takže se odkaz neohlásí dvakrát. Karta se celá odkazem
 * nepřekrývá, text jde dál označit. Vzhled a najetí myší v trips.css (.pkg).
 */
export function TripCardPhoto({ trip, sizes, priority }: { trip: Trip; sizes: string; priority?: boolean }) {
  const card = TRIP_MEDIA[trip.slug].card;
  return (
    <Link className="pkg-img" href={tripPath(trip.slug)} tabIndex={-1} aria-hidden="true">
      <Photo
        photo={card.photo}
        alt={card.alt}
        sizes={sizes}
        priority={priority}
        style={card.position ? { objectPosition: card.position } : undefined}
      />
    </Link>
  );
}
