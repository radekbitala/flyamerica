import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { Photo } from "@/components/web/Photo";
import { AIRCRAFT, TRIPS, formatTripSubtitle, type Trip } from "@/data/trips";
import { pageMetadata } from "@/lib/metadata";
import { ROUTES, tripPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";

// Přehled leteckých výletů (sekce menu Letecké výlety). Zatím jednoduchý:
// záhlaví a karty obou výletů ze src/data/trips.ts ve stylu karet z úvodu.
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
      {/* Perex doslova z Honzova podkladu (výlet 2, věta nad tabulkou Co je v ceně). */}
      <PageHead
        label="Letecké výlety"
        title={<>Letecké výlety po Floridě</>}
        perex={czechNbspText(
          "V ceně je letadlo, palivo, pilot-mentor, letištní poplatky, pojištění a pronájem auta. Letenky a ubytování si klient hradí samostatně.",
        )}
      />

      <section className="sec sec--tight sec--line" aria-label="Výlety">
        <div className="fa-wrap">
          <div className="pkgs">
            {TRIPS.map((trip) => (
              <TripCard key={trip.slug} trip={trip} />
            ))}
          </div>
          <p className="pkgs-note">
            {czechNbspText(`Letadlo: ${AIRCRAFT.name} - ${AIRCRAFT.description}`)}{" "}
            {czechNbspText("Cena nezahrnuje letenky, ubytování, stravu ani správní poplatek FAA za validaci průkazu.")}
          </p>
        </div>
      </section>

      <CtaSection />
    </>
  );
}

/** Karta výletu (.pkg z úvodu): fotka, název, podtitul, úvod, cena „od“ a odkaz na detail. */
function TripCard({ trip }: { trip: Trip }) {
  const headingId = `vylet-${trip.slug}`;
  return (
    <article className="pkg" aria-labelledby={headingId}>
      <div className="pkg-img">
        <Photo photo={trip.cardPhoto} sizes={CARD_SIZES} />
      </div>
      <h3 id={headingId}>{czechNbspText(trip.name)}</h3>
      <p className="sub">{formatTripSubtitle(trip.subtitle)}</p>
      <p>{czechNbspText(trip.teaser)}</p>
      <div className="pkg-price">
        <span className="from">od</span>
        <strong>{czechNbspText(trip.price.from)}</strong>
        <span className="note">{czechNbspText(trip.price.note)}</span>
      </div>
      <Link className="fa-link" href={tripPath(trip.slug)}>
        Detail výletu <Arrow />
      </Link>
    </article>
  );
}
