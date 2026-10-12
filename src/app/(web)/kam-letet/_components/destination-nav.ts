import type { Metadata } from "next";
import type { Destination } from "@/data/destinations";
import { pageMetadata } from "@/lib/metadata";
import { destinationPath } from "@/lib/routes";

/**
 * Společné pro celou stránku destinace (/kam-letet/[slug]) i okno s detailem
 * (@modal/(.)kam-letet/[slug]). Soubor nesmí mít "use client": konstanty
 * odsud čtou i serverové komponenty a z klientského modulu by dostaly jen
 * odkaz na klientskou komponentu, ne hodnotu.
 */

/** id nadpisu destinace v okně: aria-labelledby dialogu a cíl fokusu po otevření. */
export const DIALOG_TITLE_ID = "kam-letet-okno-nadpis";

/** Destinace v přepínání Předchozí / Další: slug a krátký název. */
export interface DestinationNavItem {
  slug: string;
  name: string;
}

/** Předchozí a další destinace v pořadí Honzova podkladu, dokola (po Key Westu zase FA83). */
export function destinationNeighbours<T>(items: readonly T[], index: number): { prev: T; next: T } {
  const count = items.length;
  return { prev: items[(index - 1 + count) % count], next: items[(index + 1) % count] };
}

/** Metadata detailu destinace. Stejná pro celou stránku i okno, adresa je v obou /kam-letet/<slug>. */
export function destinationMetadata(destination: Destination): Metadata {
  return pageMetadata({
    title: destination.shortName,
    description: destination.teaser,
    path: destinationPath(destination.slug),
  });
}
