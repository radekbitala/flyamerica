import type { PhotoName } from "@/data/photos";

/**
 * Destinace stránky Kam letět (dřív Tipy na výlety) z Honzova „Výběru
 * destinací kam letět“ (../podklady-od-Honzy/2026-10-10_balicky-o-mne-destinace.md).
 * Texty Zajímavosti a Proč je dobré tam letět a tip pro piloty u sedmi
 * destinací jsou z Honzových nových textů ze 14. 10. 2026
 * (../podklady-od-Honzy/2026-10-14_destinace-texty-a-tipy-pro-piloty.md),
 * Orlando North (FA83) v nich není a zůstává z 10. 10. Názvy, kódy letišť
 * a texty doslova, jen s opraveným pravopisem (rozhodnutí Radka 14. 10. 2026:
 * překlepy a gramatika, formulace, čárky a zápis času „1:30 minut“ beze změny)
 * a se dvěma smajlíky z Honzova dokumentu (za „plachetnic“ a „salátem“).
 * Běžné mezery: pevné mezery doplní při vykreslení czechNbspText()
 * (src/lib/typography.ts).
 *
 * Kód je vždy tak, jak ho napsal Honza. U Palatky ho 14. 10. 2026 opravil na
 * 28J (dřív KFLZ). Key West: Honza EYW, letecký kód KEYW, oprava čeká na
 * Honzovo potvrzení. Archivní popisky fotek s jiným kódem (K28J, KEYW, MCOI,
 * CDK) se na web jako viditelný popisek nedávají (_PRAVIDLA.md, část 3).
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
  /** Kód letiště doslova od Honzy (FA83, KCDK, …, 28J, EYW). */
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
  /** Text pod whyHeading doslova, po odstavcích (Merritt Island má dva). */
  why: readonly string[];
  /** Výňatek do dlaždice: první věta (nebo celé) Zajímavosti, doslova. */
  teaser: string;
  /**
   * „Tip pro piloty“ doslova (Honzovy texty ze 14. 10. 2026): kudy se letí
   * z Orlanda a jak dlouho. Na detailu destinace jako krátký blok pod textem.
   * FA83 ho nemá.
   */
  pilotTip?: string;
  /** Co ještě chybí od Honzy, na webu jako „[doplnit: …]“. */
  todo?: string;
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
    why: [
      "Perfektní logistika pro starty bez zdržování v hustém provozu, přátelská místní atmosféra a okamžitý nálet do krásného floridského vzdušného prostoru.",
    ],
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
    why: [
      "Absolutní letecká klasika - přistanete a kousek od letiště se můžete projít po dřevěných molech a dát si vyhlášené čerstvé ústřice a mořské plody v místních rodinných restauracích. Připomíná to tu spíše Karibik než americké městečko.",
    ],
    pilotTip:
      "Z Orlanda létáme zpravidla přes letiště Inverness a Crystal River, kde si náš let obvykle zpestříme několika letmými přistáními touch&go. Za hodinu letu jsme v Cedar Key po vzletu z Orlando North.",
    teaser: "Unikátní asfaltová dráha doslova na krok od Mexického zálivu.",
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
    why: [
      "Přiblížení s výhledem na nedaleké mrakodrapy a tyrkysovou hladinu zálivu je nezapomenutelný zážitek. Letiště má skvělou restauraci s terasou přímo na ploše, odkud můžete sledovat provoz na dráze a skvěle poobědvat.",
    ],
    pilotTip:
      "Let z Orlanda North si obvykle zpestřujeme přistáním ve Winter Haven, Wauchula nebo případně Lakeland pro zkušenost s řízeným letištěm. POZOR: Občas je potřeba se vyhnout stěžňům plachetnic 😀. Délka letu pak záleží jak moc se cestou zdržíme, ale obvykle jsme za 1:30 minut již na terase v restauraci.",
    teaser:
      "Městské letiště umístěné přímo na nábřeží v zálivu Tampa Bay, jen pár kroků od muzea Salvadora Dalího a přístavu.",
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
      "Moderní a výborně vybavené regionální letiště s několika drahami nedaleko pobřeží Atlantiku, které dýchá bohatou historií spojenou s výcvikem pilotů a leteckým průmyslem. Sídlí zde společnost Piper a většina těchto strojů, které u nás potkáváme opustila jednoho dne právě tuto továrnu.",
    whyHeading: "Proč je dobré tam letět",
    why: [
      "Spojení perfektní infrastruktury s okamžitou dostupností krásných klidných pláží a příjemných restaurací u oceánu. Dobrá letištní restaurace s vynikajícím Caesar salátem 😀.",
    ],
    pilotTip:
      "Řízené letiště s občas hustým výcvikovým provozem. Nedaleké jezero Okeechobee je zážitek, protože svou velikostí připomíná spíše moře. Cestou z Orlanda si procvičíme průlet (transition) řízeným prostorem letiště Kissimmee. Doba letu je pak cca 0:50 minut.",
    teaser:
      "Moderní a výborně vybavené regionální letiště s několika drahami nedaleko pobřeží Atlantiku, které dýchá bohatou historií spojenou s výcvikem pilotů a leteckým průmyslem.",
    tile: "vero-beach-stojanka",
    gallery: ["vero-beach-stojanka", "vero-beach-po-bource", "vero-beach-nase-letadlo"],
    galleryColumns: 3,
  },
  {
    slug: "palatka",
    code: "28J",
    name: "Palatka Municipal Airport / Kay Larkin Airport",
    shortName: "Palatka",
    highlights:
      "Někdy klidné a někdy rušnější neřízené letiště ležící v blízkosti řeky St. Johns, obklopené typickou floridskou přírodou a historickým městem Palatka.",
    whyHeading: "Proč je dobré tam letět",
    why: [
      "Ideální zastávka pro piloty, kteří mají rádi nekomplikované přistání, zelené scenérie severovýchodní Floridy a možnost odpočinout si od rušnějších řízených letišť.",
    ],
    pilotTip:
      "Z Orlanda si cestou zkusíme přistát (nebo dle potřeby dotankovat) na neřízeném letišti Umatilla a za cca 45 minut budeme na okruhu v Palatce.",
    teaser:
      "Někdy klidné a někdy rušnější neřízené letiště ležící v blízkosti řeky St. Johns, obklopené typickou floridskou přírodou a historickým městem Palatka.",
    todo: "fotky letiště Palatka",
    // Archivní fotka „Letiště Palatka Larkin (K28J)“ jen jako dlaždice: archivní popisek má kód K28J, Honza 28J.
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
      "Rušnější a perfektně vybavené řízené letiště jižně od Orlanda, které je oblíbenou základnou pro soukromá a byznysová letadla, ale skvěle připravené i pro menší stroje našeho typu.",
    whyHeading: "Proč je dobré tam letět",
    why: [
      "Leží strategicky blízko zábavních parků a atrakcí střední Floridy a nabízí zajímavou zkušenost z trochu více vytíženého letiště.",
    ],
    pilotTip:
      "Z naší základny Orlando North je to opravdu kousek asi jen 20 minut letu na jihovýchod. Jen krátce podletíme řízené prostory mezinárodního letiště KMCO (Orlando McCoy international) a jsme připraveni sednout na jednu z mnoha místních drah.",
    teaser:
      "Rušnější a perfektně vybavené řízené letiště jižně od Orlanda, které je oblíbenou základnou pro soukromá a byznysová letadla, ale skvěle připravené i pro menší stroje našeho typu.",
    todo: "další fotka letiště Kissimmee",
    tile: "kissimmee-falcon",
    gallery: ["kissimmee-falcon"],
    galleryColumns: 3,
  },
  {
    slug: "merritt-island",
    code: "KCOI",
    name: "Merritt Island Airport",
    shortName: "Merritt Island",
    highlights:
      "Letiště situované na stejnojmenném ostrově v zálivu u Atlantiku v těsné blízkosti vesmírného pobřeží (Space Coast).",
    whyHeading: "Proč je dobré tam letět",
    why: [
      "Je to ideální a nejbližší letecká brána pro cca půldenní exkurzi do Kennedy Space Center. Z letiště se dá snadno zajistit doprava a během chvíle stojíte pod obřími raketami Saturn V nebo u odpalovacích ramp.",
      "Na stojánce jsou někdy k vidění zajímavá letadla nejen na amerických značkách.",
    ],
    pilotTip:
      "Z Orlanda přes Kissimmee jsme za 45 minut v Merritt Islandu, zde se obvykle zařadíme do hustého výcvikového provozu a dáme si několik letmých přistání. Sídlí zde poměrně značně vytížená škola na Piper 28 a mladíci z celého světa zde získávají své licence.",
    teaser:
      "Letiště situované na stejnojmenném ostrově v zálivu u Atlantiku v těsné blízkosti vesmírného pobřeží (Space Coast).",
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
    why: [
      "Let nad celým řetězcem ostrovů Florida Keys (Overseas Highway z ptačí perspektivy nemá konkurenci). Kombinace s návštěvou Everglades, kde si objednáte jízdu na rychlém člunu (airboat) mezi mangrovy a zblízka pozorujete aligátory, tvoří absolutní vrchol každé floridské expedice.",
    ],
    pilotTip:
      "Jedná se asi o nejvzdálenější destinaci z naší základny, ale nikde není dáno, že nemůžeme na Key Westu nebo kdekoliv jinde přespat. Cestou si děláme kromě přistání v Everglades i cvičná přistání v Marco Island, Arcadia, Page Field apod.",
    teaser: "Přistání na Key Westu nabízí ikonické panorama korálových ostrovů a tyrkysového moře pod křídly.",
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
