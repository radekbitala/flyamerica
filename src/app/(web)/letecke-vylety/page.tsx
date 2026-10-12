import Link from "next/link";
import type { CSSProperties } from "react";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { Photo } from "@/components/web/Photo";
import { TRIPS, formatTripSubtitle, type Trip } from "@/data/trips";
import { pageMetadata } from "@/lib/metadata";
import { ROUTES, tripPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { TripCompare } from "./_components/TripCompare";
import { TRIP_MEDIA } from "./_data/trip-media";

// Přehled leteckých výletů (sekce menu Letecké výlety): záhlaví s polohovou
// tabulí, karty obou výletů s fotkou destinace a srovnání výletů
// (délka, nálet, možné cíle, cena od, letadlo jednou pro oba) ze
// src/data/trips.ts doslova.
export const metadata = pageMetadata({
  title: "Letecké výlety",
  description:
    "Letecké výlety po Floridě s mentorem Honzou Čermákem: Florida Week & Fly na 6 dní a Florida Grand Tour & Fly na 9 dní, Cessna 182.",
  path: ROUTES.trips,
});

/** sizes fotky karty (.pkgs: 2 sloupce, pod 601 px jeden). */
const CARD_SIZES = "(max-width: 600px) 100vw, 580px";

export default function TripsPage() {
  return (
    <>
      {/* Perex doslova z Honzova podkladu (výlet 2, věta nad tabulkou Co je v ceně, platí pro oba výlety). */}
      <PageHead
        label="Letecké výlety"
        title={<>Letecké výlety po Floridě</>}
        perex={czechNbspText(
          "V ceně je letadlo, palivo, pilot-mentor, letištní poplatky, pojištění a pronájem auta. Letenky a ubytování si klient hradí samostatně.",
        )}
      />

      <section className="sec sec--tight vy-list" aria-label="Výlety">
        <div className="fa-wrap">
          <div className="pkgs">
            {TRIPS.map((trip) => (
              <TripCard key={trip.slug} trip={trip} />
            ))}
          </div>
        </div>
      </section>

      {/* Srovnání na bílé ploše: čísla obou výletů vedle sebe, cena „od“ jen tady (karty jsou o místech a programu). */}
      <section className="sec sec--tight sec--white" aria-labelledby="srovnani">
        <div className="fa-wrap">
          <h2 id="srovnani" className="pk-h2">Srovnání výletů</h2>
          <TripCompare labelledBy="srovnani" />
          <p className="pk-note">
            {czechNbspText("Cena nezahrnuje letenky, ubytování, stravu ani správní poplatek FAA za validaci průkazu.")}
          </p>
        </div>
      </section>

      <CtaSection />
    </>
  );
}

/**
 * Karta výletu (.pkg z úvodu): fotka destinace (ne letadla, to je u obou
 * stejné a je ve srovnání), název, Honzův podtitul a úvod a odkaz na detail.
 * Celá karta není odkaz, aby se text dal označit; odkaz je jen „Detail výletu“.
 */
function TripCard({ trip }: { trip: Trip }) {
  const headingId = `vylet-${trip.slug}`;
  const card = TRIP_MEDIA[trip.slug].card;
  return (
    <article className="pkg vy-card" aria-labelledby={headingId}>
      <div className="pkg-img">
        <Photo
          photo={card.photo}
          alt={card.alt}
          sizes={CARD_SIZES}
          priority={trip.order === 1}
          style={card.position ? ({ objectPosition: card.position } as CSSProperties) : undefined}
        />
      </div>
      <h2 id={headingId}>{czechNbspText(trip.name)}</h2>
      <p className="sub">{formatTripSubtitle(trip.subtitle)}</p>
      <p>{czechNbspText(trip.teaser)}</p>
      <Link className="fa-link" href={tripPath(trip.slug)}>
        Detail výletu <Arrow />
      </Link>
    </article>
  );
}
