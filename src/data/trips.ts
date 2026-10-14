import type { DestinationSlug } from "@/data/destinations";
import { TRIP_SLUGS, type TripSlug } from "@/data/trip-slugs";
import { NBSP, czechNbspText } from "@/lib/typography";

export { TRIP_SLUGS, type TripSlug };

/**
 * Letecké výlety (dřív balíčky) z Honzova podkladu
 * (../podklady-od-Honzy/2026-10-10_balicky-o-mne-destinace.md, Balíček 1
 * a Balíček 2). Texty, tabulky a ceny doslova, s běžnými mezerami: pevné
 * mezery doplní při vykreslení czechNbspText() (src/lib/typography.ts).
 *
 * Povolené úpravy proti podkladu (rozhodnutí 12. 10. 2026): slovo „balíček“
 * zmizelo z nadpisů a štítků („Varianty a cena balíčku“ -> „Varianty
 * a cena“, „Cena balíčku“ -> „Cena“, „Balíček 1:“ pryč). Letadlo je u obou
 * výletů stejné a uvádí se jednou a stejně (AIRCRAFT, Radkův bod 3 z 12. 10.
 * 2026): řádek „Letadlo“ v přehledu programu chybí a podtitul Grand Tour je
 * bez posledního údaje „• Cessna 182“ (Honza: „9 dní na Floridě • 20
 * letových hodin • Cessna 182“). Tabulky „Co zahrnuje cena“ a „Co je v ceně“
 * zůstávají doslova i s letadlem („Pronájem C182 a palivo 12 hodin“).
 *
 * Fotky výletů (karty a posuvná řada) jsou ve
 * src/app/(web)/letecke-vylety/_data/trip-media.ts, tady jen texty.
 *
 * Slug je zároveň hodnota ?vylet= (dřív ?balicek=) v poptávce
 * (src/lib/inquiries/options.ts) a adresa /letecke-vylety/<slug>.
 */

/**
 * Letadlo obou výletů, jeden údaj. Název z Honzova přehledu programu (oba
 * výlety „Cessna 182 Skylane“), popis z výletu 1 (Florida Week & Fly)
 * doslova. Na stránce: „Cessna 182 Skylane - prostorný čtyřmístný…“.
 */
export const AIRCRAFT = {
  name: "Cessna 182 Skylane",
  description: "prostorný čtyřmístný stroj vhodný pro delší lety ve 2-3 lidech.",
} as const;

/** Tabulka z podkladu: hlavička a řádky po třech buňkách, doslova. */
export interface TripTable {
  /** Nadpis tabulky (Honzův, bez slova balíček). */
  title: string;
  /** Věta nad tabulkou (Grand Tour u „Co je v ceně“), doslova. */
  intro?: string;
  columns: readonly [string, string, string];
  rows: readonly (readonly [string, string, string])[];
  /** Věta pod tabulkou, doslova. */
  note?: string;
}

/** Řádek přehledu programu: pojem a text, doslova (bez řádku Letadlo, viz AIRCRAFT). */
export interface TripFact {
  term: string;
  text: string;
}

export interface Trip {
  slug: TripSlug;
  /** Pořadí na webu (karty, Kam dál). Číslo se nevypisuje. */
  order: number;
  /** Název výletu doslova. */
  name: string;
  /** Honzův podtitul pod názvem, doslova (u Grand Tour bez letadla, viz úvod souboru). */
  subtitle: string;
  /** Úvodní odstavec (perex stránky), doslova. */
  intro: string;
  /**
   * Text karty výletu na úvodu. U Florida Week bez poslední věty úvodu
   * („O veškerou organizaci…“), ta je doslova v záhlaví úvodní stránky.
   */
  teaser: string;
  /** Čísla z Honzova přehledu pro karty a porovnání (dny celkem, letové a volné dny, letové hodiny). */
  numbers: { days: number; flightDays: number; freeDays: number; hours: number };
  /** Přehled programu bez řádku Letadlo, pojmy a texty doslova. */
  overview: readonly TripFact[];
  /** Cena „od“ přesně podle Honzy (Florida Week s $, Grand Tour bez) a naše poznámka pod ní. */
  price: { from: string; note: string };
  /** Tabulka „Co zahrnuje cena“ / „Co je v ceně“. */
  included: TripTable;
  /** Tabulka variant a cen. Buňka ceny začíná částkou („$7 400 USD za osobu“), viz splitPrice(). */
  variants: TripTable;
  /** Průběh přípravy, jen u Florida Week (Honza ho napsal jen k výletu 1). */
  preparation?: readonly { when: string; text: string }[];
  /**
   * Destinace z „Kam letět“ (src/data/destinations.ts), které Honza
   * v textu výletu jmenuje (úvod, Možné cíle), v pořadí podle textu.
   */
  destinations: readonly DestinationSlug[];
  /** Popis stránky pro vyhledávače a náhled odkazu (náš text). */
  description: string;
}

export const TRIPS: readonly Trip[] = [
  {
    slug: "florida-week",
    order: 1,
    name: "Florida Week & Fly",
    subtitle: "Létání v USA na zkoušku • od 12 letových hodin",
    intro:
      "Zažijte týden VFR létání na Floridě. Procvičíte si anglickou leteckou frazeologii na amerických letištích, přistanete na ikonických ostrovních drahách, jako jsou Cedar Key nebo Albert Whitted v St. Petersburgu, a proletíte se podél pobřeží Mexického zálivu. O veškerou organizaci a servis se postaráme a v kabině vás bude doprovázet zkušený mentor.",
    teaser:
      "Zažijte týden VFR létání na Floridě. Procvičíte si anglickou leteckou frazeologii na amerických letištích, přistanete na ikonických ostrovních drahách, jako jsou Cedar Key nebo Albert Whitted v St. Petersburgu, a proletíte se podél pobřeží Mexického zálivu.",
    numbers: { days: 6, flightDays: 4, freeDays: 2, hours: 12 },
    overview: [
      { term: "Délka pobytu", text: "6 dní - 4 letové a 2 volné dny na pláž, nákupy nebo návštěvu Universal Studios." },
      { term: "Letový nálet", text: "12 hodin" },
      {
        term: "Náplň programu",
        text: "VFR frazeologie v USA, provoz v řízeném i neřízeném vzdušném prostoru, práce s ForeFlight a příprava letadla.",
      },
    ],
    price: { from: "$7 400 USD", note: "za osobu při 2 pilotech. Pro 1 pilota $13 900 USD." },
    included: {
      title: "Co zahrnuje cena",
      columns: ["Položka nebo služba", "V ceně?", "Co je zahrnuto"],
      rows: [
        ["Pilot-mentor a doprovod", "ANO", "Briefing, navigační příprava, frazeologie a podpora přímo v kabině"],
        ["Pronájem C182 a palivo 12 hodin", "ANO", "Celkem 12 letových hodin v C182"],
        [
          "Pojištění letadla a poplatky FBO",
          "ANO",
          "Pojištění podle podmínek půjčovny včetně přistávacích a tie-down poplatků",
        ],
        ["Místní pronájem auta", "ANO", "Včetně rezervace a paliva"],
        ["Příprava a ForeFlight", "ANO", "Pomoc s validací FAA a naplánováním tras"],
        ["Ubytování a letenka", "NE", "Klient si hradí samostatně podle svých preferencí"],
      ],
    },
    variants: {
      title: "Varianty a cena",
      columns: ["Varianta", "Cena", "Letové hodiny a organizace"],
      rows: [
        [
          "2 piloti (DOPORUČENO)",
          "$7 400 USD za osobu",
          "Každý pilot absolvuje 6 hodin jako PIC. Mentor i auto jsou společné.",
        ],
        [
          "1 pilot (individuální varianta)",
          "$13 900 USD",
          "Všech 12 hodin absolvujete jako PIC. Partnerka nebo jiný doprovod může cestovat s vámi.",
        ],
      ],
      note: "Cena nezahrnuje letenky, ubytování, stravu ani správní poplatek FAA za validaci průkazu.",
    },
    preparation: [
      {
        when: "6-8 týdnů před odletem",
        text: "Zahájíme ověření zahraniční pilotní licence u FAA (Foreign Pilot Verification).",
      },
      { when: "2 týdny před odletem", text: "Online probereme trasy, pravidla VFR v USA a možnosti ubytování." },
      { when: "Po příletu na Floridu", text: "Převezmete auto, ubytujete se a zahájíte letový program." },
    ],
    destinations: ["cedar-key", "albert-whitted"],
    description:
      "Letecký výlet na 6 dní po Floridě, 12 letových hodin v Cessně 182 s pilotem-mentorem. Co zahrnuje cena, varianty a průběh přípravy.",
  },
  {
    slug: "grand-tour",
    order: 2,
    name: "Florida Grand Tour & Fly",
    subtitle: "9 dní na Floridě • 20 letových hodin",
    intro:
      "Intenzivní letecký pobyt zaměřený na delší navigační lety, americkou VFR komunikaci a létání v řízených prostorech. Trasy mohou vést podél pobřeží, přes Everglades, na Florida Keys nebo na sever ke St. Augustine.",
    teaser:
      "Intenzivní letecký pobyt zaměřený na delší navigační lety, americkou VFR komunikaci a létání v řízených prostorech. Trasy mohou vést podél pobřeží, přes Everglades, na Florida Keys nebo na sever ke St. Augustine.",
    numbers: { days: 9, flightDays: 6, freeDays: 3, hours: 20 },
    overview: [
      { term: "Délka", text: "9 dní - 6 letových a 3 volné dny." },
      { term: "Nálet", text: "20 hodin, přibližně 3-3,5 hodiny za letový den." },
      {
        term: "Možné cíle",
        text: "Cedar Key, St. Petersburg, Florida Keys, Key West, pobřeží, Everglades nebo St. Augustine.",
      },
      {
        term: "Výcvik",
        text: "americká VFR frazeologie, prostory Class B/C/D, ForeFlight, ostrovní přistání a příprava na BFR.",
      },
      { term: "Volné dny", text: "pláž, Universal Studios, Kennedy Space Center nebo nákupy." },
    ],
    price: { from: "10 800 USD", note: "za osobu při 2 pilotech. Pro 1 pilota 20 100 USD." },
    included: {
      title: "Co je v ceně",
      intro:
        "V ceně je letadlo, palivo, pilot-mentor, letištní poplatky, pojištění a pronájem auta. Letenky a ubytování si klient hradí samostatně.",
      columns: ["Služba", "Zahrnuto", "Rozsah"],
      rows: [
        ["Pilot-mentor a doprovod", "Ano", "Briefingy, navigace, frazeologie a doprovod v kabině po celých 9 dní."],
        ["Cessna 182 a palivo", "Ano", "20 letových hodin včetně paliva."],
        ["Pojištění a letištní poplatky", "Ano", "Pojištění, přistávací poplatky a parkování letadla."],
        ["Pronájem auta", "Ano", "Auto na 9 dní včetně paliva a mýtného SunPass."],
        ["Příprava a ForeFlight", "Ano", "Pomoc s FAA validací a přípravou tratí."],
        ["Ubytování a letenky", "Ne", "Klient si je vybírá a hradí samostatně."],
      ],
    },
    variants: {
      title: "Cena",
      columns: ["Varianta", "Cena", "Nálet"],
      rows: [
        [
          "2 piloti (doporučená varianta)",
          "10 800 USD za osobu",
          "Každý pilot získá 10 hodin jako PIC. Sdílejí mentora a auto.",
        ],
        ["1 pilot (samostatná varianta)", "20 100 USD", "Všech 20 hodin jako PIC. Lze vzít partnerku nebo jiný doprovod."],
      ],
    },
    destinations: ["cedar-key", "albert-whitted", "key-west-everglades"],
    description:
      "Letecký výlet na 9 dní po Floridě, 20 letových hodin v Cessně 182 s pilotem-mentorem. Co je v ceně a cena.",
  },
];

/**
 * Honzovy pojmy z přehledu programu pro stejný údaj obou výletů: Florida
 * Week a Grand Tour ho pojmenovávají různě („Délka pobytu“ / „Délka“).
 */
export const TRIP_FACT_TERMS = {
  length: ["Délka pobytu", "Délka"],
  hours: ["Letový nálet", "Nálet"],
} as const satisfies Record<string, readonly string[]>;

export type TripFactKey = keyof typeof TRIP_FACT_TERMS;

/** Text údaje z přehledu programu (délka, nálet) doslova, undefined když ho výlet nemá. */
export function tripFact(trip: Trip, fact: TripFactKey): string | undefined {
  const terms: readonly string[] = TRIP_FACT_TERMS[fact];
  return trip.overview.find((item) => terms.includes(item.term))?.text;
}

/** Výlet podle slugu, undefined u neznámého. */
export function getTrip(slug: string): Trip | undefined {
  return TRIPS.find((trip) => trip.slug === slug);
}

/** Druhý výlet (Kam dál na stránce výletu). */
export function otherTrip(slug: TripSlug): Trip {
  const other = TRIPS.find((trip) => trip.slug !== slug);
  if (!other) throw new Error("Na webu musí být aspoň dva výlety.");
  return other;
}

/**
 * Buňka ceny z tabulky variant rozdělená na částku a zbytek:
 * „$7 400 USD za osobu“ -> { amount: "$7 400 USD", rest: " za osobu" }.
 * Částka se sází tabulkovými číslicemi (.num) a nezalamuje se.
 */
export function splitPrice(cell: string): { amount: string; rest: string } {
  const match = /^(\$?\d[\d ]*\d USD)(.*)$/.exec(cell);
  return match ? { amount: match[1], rest: match[2] } : { amount: "", rest: cell };
}

/**
 * Podtitul s pevnými mezerami jako v modelu. Řádek údajů s tečkami
 * („9 dní na Floridě • 20 letových hodin“) se láme jen za tečkou, každý
 * údaj drží pohromadě. Jiný podtitul jako běžný text.
 */
export function formatTripSubtitle(subtitle: string): string {
  if (!subtitle.includes(" • ")) return czechNbspText(subtitle);
  return subtitle
    .split(" • ")
    .map((part) => part.replaceAll(" ", NBSP))
    .join(`${NBSP}• `);
}
