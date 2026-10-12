import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { DESTINATIONS, getDestination } from "@/data/destinations";
import { pageMetadata } from "@/lib/metadata";
import { ROUTES, destinationPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { DestinationBody, DestinationRoute } from "../_components/DestinationBody";

// Detail destinace jako celá stránka: přímá adresa /kam-letet/<slug>
// (sdílený odkaz, nové načtení). Při prokliku na webu se stejný obsah může
// ukázat v okně přes slot @modal (src/app/(web)/@modal). Texty doslova
// ze src/data/destinations.ts.

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
  return pageMetadata({
    title: destination.shortName,
    description: destination.teaser,
    path: destinationPath(destination.slug),
  });
}

export default async function DestinationPage({ params }: DestinationPageProps) {
  const destination = getDestination((await params).slug);
  if (!destination) notFound();

  return (
    <>
      {/* Drobečky jsou jediná polohová tabule v záběru, kód letiště proto bez pole, jen trasa v Overpass Mono pod h1. */}
      <PageHead
        crumbs={{ href: ROUTES.destinations, label: "Kam letět", current: czechNbspText(destination.shortName) }}
        title={czechNbspText(destination.name)}
      >
        <div style={{ marginTop: 20 }}>
          <DestinationRoute destination={destination} />
        </div>
      </PageHead>

      {/* Text navazuje přímo na záhlaví (mezeru dává záhlaví), jako úvod stránky Váš mentor. */}
      <section className="sec sec--tight dest" style={{ paddingTop: 0 }} aria-label="Destinace">
        <div className="fa-wrap">
          <DestinationBody destination={destination} />
          <p className="dest-back">
            <Link className="fa-link" href={ROUTES.destinations}>
              Všechny destinace
            </Link>
          </p>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
