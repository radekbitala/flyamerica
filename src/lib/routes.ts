/**
 * Adresy stránek veřejného webu. Jediné místo, kde jsou napsané: menu,
 * odkazy na stránkách, mapa webu, obnova cache po změně článku, e-maily
 * i testy berou adresy odsud (testy mají vlastní kopii seznamu).
 *
 * Menu a adresy podle rozhodnutí z 12. 10. 2026: Letecké výlety, Kam letět,
 * Z cest, Váš mentor, Kontakt. Dřívější adresy (/balicek-florida-week,
 * /tipy-na-vylety, /denik, /o-honzovi) trvale přesměrovává
 * src/data/redirects.json.
 */

export const ROUTES = {
  home: "/",
  /** Přehled leteckých výletů, detail je tripPath(). */
  trips: "/letecke-vylety",
  /** Rozcestník destinací, detail je destinationPath(). */
  destinations: "/kam-letet",
  /** Články (dřív Deník), detail je postPath(). */
  posts: "/z-cest",
  mentor: "/vas-mentor",
  contact: "/kontakt",
  privacy: "/zasady-zpracovani-osobnich-udaju",
} as const;

/** Detail leteckého výletu: /letecke-vylety/florida-week. */
export function tripPath(slug: string): string {
  return `${ROUTES.trips}/${slug}`;
}

/** Detail destinace: /kam-letet/cedar-key (na webu v okně, přímá adresa celá stránka). */
export function destinationPath(slug: string): string {
  return `${ROUTES.destinations}/${slug}`;
}

/** Článek: /z-cest/oblet-ameriky-2016. */
export function postPath(slug: string): string {
  return `${ROUTES.posts}/${slug}`;
}
