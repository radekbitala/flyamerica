import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DestinationBody } from "@/app/(web)/kam-letet/_components/DestinationBody";
import { DIALOG_TITLE_ID, destinationMetadata } from "@/app/(web)/kam-letet/_components/destination-nav";
import { DESTINATIONS, getDestination } from "@/data/destinations";
import { czechNbspText } from "@/lib/typography";

// Obsah okna s detailem destinace (rám okna je layout.tsx o úroveň výš).
// Stejný obsah jako celá stránka /kam-letet/<slug>, jen nadpis je h2 s kódem
// letiště s polem (.fa-code): v okně je to jediný tabulový prvek v záběru,
// polohová tabule stránky pod oknem je zakrytá (DESIGN.md, The Three Signs Rule).

interface DestinationModalPageProps {
  params: Promise<{ slug: string }>;
}

/** Jen destinace ze src/data/destinations.ts, stejně jako celá stránka. */
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return DESTINATIONS.map((destination) => ({ slug: destination.slug }));
}

/** Titulek a canonical jako celá stránka, adresa v okně je stejná (/kam-letet/<slug>). */
export async function generateMetadata({ params }: DestinationModalPageProps): Promise<Metadata> {
  const destination = getDestination((await params).slug);
  if (!destination) notFound();
  return destinationMetadata(destination);
}

export default async function DestinationModalPage({ params }: DestinationModalPageProps) {
  const destination = getDestination((await params).slug);
  if (!destination) notFound();

  return (
    <>
      <header className="dest-head">
        <span className="fa-code">{destination.code}</span>
        {/* tabIndex -1: po otevření okna a po přepnutí destinace sem jde fokus (DestinationDialog) */}
        <h2 id={DIALOG_TITLE_ID} tabIndex={-1}>
          {czechNbspText(destination.name)}
        </h2>
      </header>
      <DestinationBody destination={destination} variant="dialog" />
    </>
  );
}
