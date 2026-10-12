import { TRIP_SLUGS, type TripSlug } from "@/data/trip-slugs";
import { ROUTES } from "@/lib/routes";

/**
 * Menu webu (hlavička na počítači, mobilní menu, patička) a adresy výzev.
 * Menu podle rozhodnutí z 12. 10. 2026: Letecké výlety, Kam letět, Z cest,
 * Váš mentor, Kontakt. Adresy jsou v src/lib/routes.ts.
 */

export interface NavItem {
  href: string;
  label: string;
  /**
   * aria-current podle cesty: "page" na stránce sekce, "true" na detailu
   * v sekci (_PRAVIDLA.md, část 2). undefined = položka není aktivní.
   */
  current: (pathname: string) => "page" | "true" | undefined;
}

/** Položka menu pro sekci s adresou base: "page" na base, "true" na base/cokoli. */
function section(href: string, label: string): NavItem {
  return {
    href,
    label,
    current: (pathname) => {
      const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
      if (path === href) return "page";
      return path.startsWith(`${href}/`) ? "true" : undefined;
    },
  };
}

export const NAV_ITEMS: readonly NavItem[] = [
  section(ROUTES.trips, "Letecké výlety"),
  section(ROUTES.destinations, "Kam letět"),
  section(ROUTES.posts, "Z cest"),
  section(ROUTES.mentor, "Váš mentor"),
  section(ROUTES.contact, "Kontakt"),
];

/** Výlet podle cesty stránky (/letecke-vylety/florida-week), null mimo stránky výletů. */
export function tripFromPath(pathname: string): TripSlug | null {
  const slug = new RegExp(`^${ROUTES.trips}/([a-z0-9-]+)/?$`).exec(pathname)?.[1];
  return TRIP_SLUGS.find((trip) => trip === slug) ?? null;
}

/**
 * Adresa poptávkového formuláře. S výletem ho formulář předvyplní
 * („Poptáváte: …“), na ni vedou všechny výzvy „Poptat termín“ a „Poptat
 * tento výlet“. Dřívější ?balicek= formulář přijímá dál (staré odkazy).
 */
export function inquiryHref(trip?: TripSlug | null): string {
  return trip ? `${ROUTES.contact}?vylet=${trip}#poptavka` : `${ROUTES.contact}#poptavka`;
}
