import type { PhotoName } from "@/data/photos";
import type { TripSlug } from "@/data/trip-slugs";

/**
 * Fotky leteckých výletů: posuvná řada fotek destinací v záhlaví stránky
 * výletu a fotka karty výletu (úvod, přehled /letecke-vylety, Kam dál na
 * stránce druhého výletu, všude stejná). Rozhodnutí 12. 10. 2026: místo fotek letadla (u obou
 * výletů stejná Cessna) fotky destinací, o kterých Honza u výletu píše.
 *
 * Jen fotky z fotobanky (../fotobanka/fotobanka.json) bez „osoby: ano,
 * souhlas nutný“. Fotky, které už web má z klikacího modelu, se berou
 * odtud (bez druhé kopie souboru), nové jsou v src/data/photos-trips.ts.
 * Texty z fotobanky: alt = pole alt, caption = pole popisek doslova.
 * Výjimka: dva archivní popisky s překlepem mají opravený pravopis podle
 * rozhodnutí z 10. 10. 2026 (prototyp/_ZMENY_popisky_2026-10-10.md, č. 2 a 6),
 * stejně jako na stránce Kam letět. Archivní popisky s jiným kódem letiště,
 * než píše Honza (CDK, KEYW), tu nejsou (prototyp/_PRAVIDLA.md, část 3).
 *
 * Výlety jsou v src/data/trips.ts, tady je jen jejich výběr fotek, aby se
 * fotky dalo měnit bez zásahu do Honzových textů.
 */

/** Fotka s texty z fotobanky. */
export interface TripPhoto {
  /** Fotka ze src/data/photos.ts. */
  photo: PhotoName;
  /** Pole alt z fotobanky. Bez něj alt fotky z photos.ts. */
  alt?: string;
  /** Pole popisek z fotobanky (viditelný popisek). Bez něj popisek fotky z photos.ts. */
  caption?: string;
  /** Výřez fotky (object-position), výchozí střed. */
  position?: string;
}

export interface TripMedia {
  /** Fotka karty výletu (úvod, přehled a Kam dál; 16 : 9, bez popisku). */
  card: TripPhoto;
  /** Posuvná řada v záhlaví výletu (3-6 fotek, 4 : 3). První se načítá hned. */
  slides: readonly TripPhoto[];
}

/** Florida Week & Fly: Albert Whitted v St. Petersburgu, Cedar Key a pobřeží Mexického zálivu (úvod výletu). */
const FLORIDA_WEEK_SLIDES: readonly TripPhoto[] = [
  {
    // fotobanka destinace-st-petersburg-06
    photo: "albert-whitted-letecky",
    alt: "Letiště Albert Whitted na nábřeží St. Petersburgu z výšky, za ním mrakodrapy a přístav",
    caption: "Malebné letiště u Tampy a St. Petersburgu se jmenuje Albert Whitted Field (KSPG)",
  },
  {
    // fotobanka destinace-cedar-key-04
    photo: "cedar-key-okoli",
    alt: "Ostrůvky a mokřady u Cedar Key z ptačí perspektivy",
    caption:
      "Okolí Cedar Key, kde se nachází letiště Lewis (KCDK). Toto místo v Mexickém zálivu působí velmi exoticky.",
  },
  {
    // fotobanka destinace-cedar-key-05
    photo: "cedar-key-cessna-170",
    alt: "Modrobílá Cessna 170 těsně nad dráhou v Cedar Key, v pozadí moře",
    caption:
      "Přistávající Cessna 170 na letišti Lewis, Cedar Key (KCDK), kterou provozuje jeden nadšený důchodce a o víkendech nabízí kolemjdoucím vyhlídkové lety",
  },
  // fotobanka florida-z-vysky-crystal-river-07 (alt a popisek v photos-trips.ts)
  { photo: "vylety/florida-z-vysky-crystal-river-07" },
  {
    // fotobanka destinace-st-petersburg-07, „Sant“ -> „Saint“ (_ZMENY č. 2)
    photo: "albert-whitted-vyhled-z-restaurace",
    alt: "Naše Cessna 182 na stojánce letiště Albert Whitted, výhled z letištní restaurace",
    caption: "Výhled z letištní restaurace v Saint Petersburgu, Albert Whitted (KSPG)",
  },
];

/** Florida Grand Tour & Fly: Florida Keys, Key West, Everglades a St. Augustine (úvod výletu a Možné cíle). */
const GRAND_TOUR_SLIDES: readonly TripPhoto[] = [
  {
    // fotobanka destinace-florida-keys-17, pravopis opravený (_ZMENY č. 6)
    photo: "tipy-florida-keys-silnice",
    alt: "Dlouhý most Overseas Highway nad tyrkysovým mořem Florida Keys z výšky",
    caption: "Dobře známá silnice spojující Miami s nejjižnějším cípem kontinentálních USA, tedy Key West.",
  },
  {
    // fotobanka destinace-key-west-16
    photo: "key-west-plaz",
    alt: "Písečná pláž s palmami a rozcestníkem na Key Westu",
    caption: "Floridský Key West je jedno z mála míst v USA s celoročně subtropickým až tropickým klimatem.",
  },
  // fotobanka destinace-everglades-19, destinace-everglades-20 a florida-z-vysky-st-augustine-10 (photos-trips.ts)
  { photo: "vylety/destinace-everglades-19" },
  { photo: "vylety/destinace-everglades-20" },
  { photo: "vylety/florida-z-vysky-st-augustine-10" },
];

/**
 * Karta Florida Week je zátoka Crystal River (pobřeží Mexického zálivu, kolem
 * kterého výlet vede), ne letecký snímek Albert Whitted: ten má na úvodu
 * dlaždice destinace pod kartami. Výřez nechává okraj křídla mimo.
 */
export const TRIP_MEDIA: Record<TripSlug, TripMedia> = {
  "florida-week": {
    card: { ...FLORIDA_WEEK_SLIDES[3], position: "50% 60%" },
    slides: FLORIDA_WEEK_SLIDES,
  },
  "grand-tour": {
    card: GRAND_TOUR_SLIDES[0],
    slides: GRAND_TOUR_SLIDES,
  },
};
