import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { PRICE_EXCLUDES, PRICE_INCLUDES, TRIPS, formatTripSubtitle, type Trip } from "@/data/trips";
import { pageMetadata } from "@/lib/metadata";
import { ROUTES, tripPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { TripCardPhoto } from "./_components/TripCardPhoto";
import { TripCompare } from "./_components/TripCompare";

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
      {/* Perex ze dvou Honzových vět beze změny slov (úprava 23, rozhodnutí 14. 10. 2026): co je v ceně (výlet 2,
           věta nad tabulkou Co je v ceně) a co v ní není (výlet 1, poznámka pod tabulkou variant). Platí pro oba výlety,
           proto poznámka pod Srovnáním výletů odpadla. */}
      <PageHead
        label="Letecké výlety"
        title={<>Letecké výlety po Floridě</>}
        perex={czechNbspText(`${PRICE_INCLUDES} ${PRICE_EXCLUDES}`)}
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
        </div>
      </section>

      <CtaSection />
    </>
  );
}

/**
 * Karta výletu (.pkg z úvodu): fotka destinace (ne letadla, to je u obou
 * stejné a je ve srovnání), název, Honzův podtitul a úvod a odkaz na detail.
 * Celá karta není odkaz, aby se text dal označit. Na detail vede nadpis,
 * fotka (mimo pořadí Tab, TripCardPhoto) a „Detail výletu“ (úprava 28).
 */
function TripCard({ trip }: { trip: Trip }) {
  const headingId = `vylet-${trip.slug}`;
  return (
    <article className="pkg vy-card" aria-labelledby={headingId}>
      <TripCardPhoto trip={trip} sizes={CARD_SIZES} priority={trip.order === 1} />
      <h2 id={headingId}>
        <Link href={tripPath(trip.slug)}>{czechNbspText(trip.name)}</Link>
      </h2>
      <p className="sub">{formatTripSubtitle(trip.subtitle)}</p>
      <p>{czechNbspText(trip.teaser)}</p>
      <Link className="fa-link" href={tripPath(trip.slug)}>
        Detail výletu <Arrow />
      </Link>
    </article>
  );
}
