import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { DESTINATIONS, getDestination } from "@/data/destinations";
import { ROUTES } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { DestinationBody, DestinationPager, DestinationRoute } from "../_components/DestinationBody";
import { destinationMetadata, destinationNeighbours } from "../_components/destination-nav";

// Detail destinace jako celá stránka: přímá adresa /kam-letet/<slug>
// (sdílený odkaz, nové načtení, vyhledávač). Při prokliku na webu se stejný
// obsah ukáže v okně nad stránkou přes slot @modal
// (src/app/(web)/@modal/(.)kam-letet/[slug]). Texty doslova
// ze src/data/destinations.ts.
//
// Čtecí sloupec je uprostřed, fotky jsou širší než text (rozhodnutí
// 12. 10. 2026, bod 6). Drobečky jsou jediná polohová tabule v záběru, kód
// letiště proto bez pole, jen trasa v Overpass Mono pod h1 (DESIGN.md,
// The Three Signs Rule). Kód s polem má detail v okně.

interface DestinationPageProps {
  params: Promise<{ slug: string }>;
}

/** Jen destinace ze src/data/destinations.ts, jiná adresa je 404. */
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return DESTINATIONS.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({ params }: DestinationPageProps): Promise<Metadata> {
  const destination = getDestination((await params).slug);
  if (!destination) notFound();
  return destinationMetadata(destination);
}

export default async function DestinationPage({ params }: DestinationPageProps) {
  const destination = getDestination((await params).slug);
  if (!destination) notFound();
  const items = DESTINATIONS.map(({ slug, shortName }) => ({ slug, name: shortName }));
  const { prev, next } = destinationNeighbours(items, DESTINATIONS.indexOf(destination));

  return (
    <div className="kl-page">
      <PageHead
        crumbs={{ href: ROUTES.destinations, label: "Kam letět", current: czechNbspText(destination.shortName) }}
        title={czechNbspText(destination.name)}
      >
        <DestinationRoute destination={destination} className="kl-page-route" />
      </PageHead>

      {/* Text navazuje přímo na záhlaví (mezeru dává záhlaví), jako úvod stránky Váš mentor. */}
      <div className="sec sec--tight kl-main">
        <div className="fa-wrap">
          <DestinationBody destination={destination} variant="page" />
          <DestinationPager prev={prev} next={next} />
          <p className="dest-back">
            <Link className="fa-link" href={ROUTES.destinations}>
              Všechny destinace
            </Link>
          </p>
        </div>
      </div>

      <CtaSection />
    </div>
  );
}
