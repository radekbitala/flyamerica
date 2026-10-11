import { postDisplayTitle } from "@/lib/post-title";

/**
 * Krátký název a popis článku deníku pro detail článku a metadata. Titulek
 * k zobrazení (bez přípony „ | 2016“) je postDisplayTitle() v post-title.ts.
 */

/**
 * Krátký název do drobečků a do <title>: část před dvojtečkou, jako model
 * („Další přelet oceánu: Tentokrát s dotykovou obrazovkou“ → „Další přelet
 * oceánu“). Titulek bez dvojtečky beze změny.
 */
export function postShortTitle(title: string): string {
  const full = postDisplayTitle(title).trim();
  const colon = full.indexOf(": ");
  return colon > 0 ? full.slice(0, colon).trim() : full;
}

/** Délka popisu stránky (meta description), který vyhledávače ještě ukážou celý. */
const DESCRIPTION_MAX = 160;
/** Kratší popis z celých vět je příliš krátký („Tak jsme se konečně dočkali.“), zkrátí se na slova. */
const DESCRIPTION_MIN = 90;

/**
 * Popisy stránek článků, které mají v klikacím modelu vlastní stránku,
 * doslova z jejich <meta name="description"> (prototyp/denik-*.html).
 * Ostatní články mají popis z perexu (postDescription).
 */
const MODEL_DESCRIPTIONS: Record<string, string> = {
  "druhy-prelet-atlantiku-2017":
    "Přelet nového Cirrusu SR-22 generace 6 z Knoxville do Prahy v říjnu 2017, článek s fotkami z cesty.",
  "dalsi-prelet-oceanu-2025":
    "Honza Čermák o přeletu nového Cirrusu SR22 sedmé generace z USA do Evropy a o avionice Garmin Perspective Touch+.",
};

/** Popis stránky článku z modelu podle adresy, jinak null. */
export function modelDescription(slug: string): string | null {
  return Object.hasOwn(MODEL_DESCRIPTIONS, slug) ? MODEL_DESCRIPTIONS[slug] : null;
}

// Konec věty: tečka, otazník, vykřičník nebo trojtečka, za nimi mezera
// a velké písmeno nebo uvozovky. „nové 6. generace“ tak větu neukončí.
const SENTENCE_END = /(?<=[.!?…]["“”»)]?)\s+(?=[\p{Lu}„"«(])/u;

/**
 * Popis stránky článku z perexu: celé věty, dokud se vejdou do 160 znaků.
 * Když je už první věta delší, nebo by celé věty daly méně než 90 znaků,
 * zkrátí se text na celá slova do 160 znaků a doplní „…“.
 */
export function postDescription(text: string): string {
  const clean = text.replace(/[\s ]+/g, " ").trim();
  if (clean.length <= DESCRIPTION_MAX) return clean;

  let out = "";
  for (const sentence of clean.split(SENTENCE_END)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > DESCRIPTION_MAX) break;
    out = next;
  }
  if (out.length >= DESCRIPTION_MIN) return out;

  const cut = clean.slice(0, DESCRIPTION_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[,;:]$/, "")}…`;
}
