import type { PhotoName } from "@/data/photos";

/**
 * Destinace stránky Kam letět (dřív Tipy na výlety) z Honzova „Výběru
 * destinací kam letět“ (../podklady-od-Honzy/2026-10-10_balicky-o-mne-destinace.md).
 * Názvy, kódy letišť a texty doslova, s běžnými mezerami: pevné mezery
 * doplní při vykreslení czechNbspText() (src/lib/typography.ts).
 *
 * Kód je vždy tak, jak ho napsal Honza, i když se liší od skutečného
 * (Palatka: Honza KFLZ, podle AirNav 28J; Key West: Honza EYW, letecký kód
 * KEYW). Oprava čeká na Honzovo potvrzení, do té doby se na web nedávají ani
 * archivní popisky fotek s jiným kódem (_PRAVIDLA.md, část 3).
 *
 * Slug je kotva na stránce Kam letět (#cedar-key) i adresa detailu
 * /kam-letet/<slug>. Pořadí je pořadí v Honzově podkladu.
 */

export type DestinationSlug =
  | "fa83"
  | "cedar-key"
  | "albert-whitted"
  | "vero-beach"
  | "palatka"
  | "kissimmee"
  | "merritt-island"
  | "key-west-everglades";

export interface Destination {
  slug: DestinationSlug;
  /** Kód letiště doslova od Honzy (FA83, KCDK, …, KFLZ, EYW). */
  code: string;
  /** Název z podkladu bez kódu v závorce („Albert Whitted Airport - St. Petersburg“). */
  name: string;
  /** Krátký název pro dlaždice na úvodu („Albert Whitted, St. Petersburg“). */
  shortName: string;
  /** Domovská základna FA83: trasa bez šipky, odkud se letí. */
  home?: boolean;
  /** „Zajímavosti“ doslova. */
  highlights: string;
  /** Nadpis druhé části doslova: „Proč je dobré tam letět“, u FA83 „Proč je dobré odtud létat“. */
  whyHeading: string;
  /** Text pod whyHeading doslova. */
  why: string;
  /** Výňatek do dlaždice: první věta (nebo celé) Zajímavosti, doslova. */
  teaser: string;
  /** Co ještě chybí od Honzy, na webu jako „[doplnit: …]“. */
  todo: string;
  /** Fotka dlaždice (4 : 3). */
  tile: PhotoName;
  /** Fotky v detailu destinace, s popisky z archivu. */
  gallery: readonly PhotoName[];
  /**
   * Sloupce galerie v detailu. 2 u dvou velkých fotek, 3 i u jedné nebo dvou
   * fotek, které mají jen 580 px (2010, větší originál v záloze není), aby
   * nebyly zvětšené (nález Impeccable 22).
   */
  galleryColumns: 2 | 3;
}

export const DESTINATIONS: readonly Destination[] = [
  {
    slug: "fa83",
    code: "FA83",
    name: "Orlando North Airpark - Naše domovská základna",
    shortName: "Orlando North Airpark",
    home: true,
    highlights:
      "Malé, komunitní a dříve zemědělské letiště s pohodovou atmosférou, které slouží jako ideální výchozí bod pro úniky z turistického shonu Orlanda. Žádné poplatky za odbavení, jen čistá letecká svoboda mezi floridskými jezery a sady s pomeranči.",
    whyHeading: "Proč je dobré odtud létat",
    why: "Perfektní logistika pro starty bez zdržování v hustém provozu, přátelská místní atmosféra a okamžitý nálet do krásného floridského vzdušného prostoru.",
    teaser:
      "Malé, komunitní a dříve zemědělské letiště s pohodovou atmosférou, které slouží jako ideální výchozí bod pro úniky z turistického shonu Orlanda.",
    todo: "jak daleko je to z Orlanda, tip pro piloty",
    tile: "fa83-orlando-north-letecky",
    gallery: ["fa83-orlando-north-letecky", "fa83-pripravy-pred-odletem"],
    galleryColumns: 2,
  },
  {
    slug: "cedar-key",
    code: "KCDK",
    name: "Cedar Key Airport",
    shortName: "Cedar Key",
    highlights:
      "Unikátní asfaltová dráha doslova na krok od Mexického zálivu. Městečko si zachovalo starou floridskou ospalou atmosféru bez velkých hotelových resortů.",
    whyHeading: "Proč je dobré tam letět",
    why: "Absolutní letecká klasika - přistanete a kousek od letiště se můžete projít po dřevěných molech a dát si vyhlášené čerstvé ústřice a mořské plody v místních rodinných restauracích.",
    teaser: "Unikátní asfaltová dráha doslova na krok od Mexického zálivu.",
    todo: "jak dlouho se letí z Orlanda, tip pro piloty",
    // Fotka „Letiště Lewis (CDK)“ jen jako dlaždice: popisek z archivu má jiný kód než Honza (KCDK).
    tile: "cedar-key-letecky",
    gallery: ["cedar-key-cessna-170", "cedar-key-okoli"],
    galleryColumns: 2,
  },
  {
    slug: "albert-whitted",
    code: "KSPG",
    name: "Albert Whitted Airport - St. Petersburg",
    shortName: "Albert Whitted, St. Petersburg",
    highlights:
      "Městské letiště umístěné přímo na nábřeží v zálivu Tampa Bay, jen pár kroků od muzea Salvadora Dalího a přístavu.",
    whyHeading: "Proč je dobré tam letět",
    why: "Přiblížení (approach) s výhledem na mrakodrapy a tyrkysovou hladinu zálivu je nezapomenutelný zážitek. Letiště má skvělou restauraci přímo na ploše, odkud můžete sledovat provoz na dráze a skvěle poobědvat.",
    teaser:
      "Městské letiště umístěné přímo na nábřeží v zálivu Tampa Bay, jen pár kroků od muzea Salvadora Dalího a přístavu.",
    todo: "jak dlouho se letí z Orlanda, tip pro piloty",
    tile: "albert-whitted-letecky",
    gallery: ["albert-whitted-letecky", "albert-whitted-vyhled-z-restaurace", "albert-whitted-budova"],
    galleryColumns: 3,
  },
  {
    slug: "vero-beach",
    code: "KVRB",
    name: "Vero Beach Regional Airport",
    shortName: "Vero Beach",
    highlights:
      "Moderní a výborně vybavené regionální letiště na pobřeží Atlantiku, které dýchá bohatou historií spojenou s výcvikem pilotů a leteckým průmyslem.",
    whyHeading: "Proč je dobré tam letět",
    why: "Spojení perfektní infrastruktury pro GA (general aviation) s okamžitou dostupností krásných klidných pláží a příjemných restaurací u oceánu. Skvělá a pohodová trať z vnitrozemí k východnímu pobřeží.",
    teaser:
      "Moderní a výborně vybavené regionální letiště na pobřeží Atlantiku, které dýchá bohatou historií spojenou s výcvikem pilotů a leteckým průmyslem.",
    todo: "jak dlouho se letí z Orlanda, tip pro piloty",
    tile: "vero-beach-stojanka",
    gallery: ["vero-beach-stojanka", "vero-beach-po-bource", "vero-beach-nase-letadlo"],
    galleryColumns: 3,
  },
  {
    slug: "palatka",
    code: "KFLZ",
    name: "Palatka Municipal Airport / Kay Larkin Airport",
    shortName: "Palatka",
    highlights:
      "Klidné letiště ležící v blízkosti řeky St. Johns, obklopené typickou floridskou přírodou a historickým městem Palatka.",
    whyHeading: "Proč je dobré tam letět",
    why: "Ideální zastávka pro piloty, kteří mají rádi nekomplikované přistání, zelené scenérie severovýchodní Floridy a možnost odpočinout si od rušnějších řízených letišť.",
    teaser:
      "Klidné letiště ležící v blízkosti řeky St. Johns, obklopené typickou floridskou přírodou a historickým městem Palatka.",
    todo: "jak dlouho se letí z Orlanda, tip pro piloty, fotky letiště Palatka",
    // Archivní fotka „Letiště Palatka Larkin (K28J)“ jen jako dlaždice: Honza uvádí KFLZ, kód čeká na potvrzení.
    tile: "palatka-tankovani",
    gallery: [],
    galleryColumns: 3,
  },
  {
    slug: "kissimmee",
    code: "KISM",
    name: "Kissimmee Gateway Airport",
    shortName: "Kissimmee",
    highlights:
      "Rušnější a perfektně vybavené řízené letiště jižně od Orlanda, které je oblíbenou základnou pro soukromá a byznysová letadla, ale skvěle připravené i pro menší stroje typu C182.",
    whyHeading: "Proč je dobré tam letět",
    why: "Leží strategicky blízko zábavních parků a atrakcí střední Floridy, nabízí perfektní zázemí, plné služby pro letadlo (fuel, parking) a rychlý odskok do celé oblasti.",
    teaser:
      "Rušnější a perfektně vybavené řízené letiště jižně od Orlanda, které je oblíbenou základnou pro soukromá a byznysová letadla, ale skvěle připravené i pro menší stroje typu C182.",
    todo: "jak dlouho se letí z Orlanda, tip pro piloty, další fotka letiště Kissimmee",
    tile: "kissimmee-falcon",
    gallery: ["kissimmee-falcon"],
    galleryColumns: 3,
  },
  {
    slug: "merritt-island",
    code: "KCOI",
    name: "Merritt Island Airport",
    shortName: "Merritt Island",
    highlights: "Letiště situované na stejnojmenném ostrově v těsné blízkosti vesmírného pobřeží (Space Coast).",
    whyHeading: "Proč je dobré tam letět",
    why: "Je to ideální a nejbližší letecká brána pro půldenní exkurzi do Kennedy Space Center. Z letiště se dá snadno zajistit doprava a během chvíle stojíte pod obřími raketami Saturn V nebo u odpalovacích ramp.",
    teaser: "Letiště situované na stejnojmenném ostrově v těsné blízkosti vesmírného pobřeží (Space Coast).",
    todo: "jak dlouho se letí z Orlanda, tip pro piloty",
    // Fotka „Přistání na Merritt Island (MCOI)“ jen jako dlaždice: Honza uvádí KCOI, kód čeká na potvrzení.
    tile: "merritt-island-pristani",
    gallery: ["merritt-island-space-coast", "merritt-island-fbo"],
    galleryColumns: 3,
  },
  {
    slug: "key-west-everglades",
    code: "EYW",
    name: "Key West International Airport & Everglades",
    shortName: "Key West & Everglades",
    highlights:
      "Přistání na Key Westu nabízí ikonické panorama korálových ostrovů a tyrkysového moře pod křídly. Oblast Everglades zase představuje unikátní, divoký ekosystém rozsáhlých mokřadů.",
    whyHeading: "Proč je dobré tam letět",
    why: "Let nad celým řetězcem ostrovů Florida Keys (Overseas Highway z ptačí perspektivy nemá konkurenci). Kombinace s návštěvou Everglades, kde si objednáte jízdu na rychlém člunu (airboat) mezi mangrovy a zblízka pozorujete aligátory, tvoří absolutní vrchol každé floridské expedice.",
    teaser: "Přistání na Key Westu nabízí ikonické panorama korálových ostrovů a tyrkysového moře pod křídly.",
    todo: "jak dlouho se letí z Orlanda, tip pro piloty",
    tile: "key-west-plaz",
    gallery: ["key-west-plaz", "tipy-florida-keys-silnice", "everglades-letecky"],
    galleryColumns: 3,
  },
];

export const DESTINATION_SLUGS = DESTINATIONS.map((destination) => destination.slug);

/** Kód domovské základny, odkud vedou trasy („FA83 → KCDK“). */
export const HOME_BASE_CODE = "FA83";

/** Destinace podle slugu, undefined u neznámého. */
export function getDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find((destination) => destination.slug === slug);
}
