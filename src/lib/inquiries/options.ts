import type { TripSlug } from "@/data/trip-slugs";
import type { inquiries } from "@/lib/db/schema";

/**
 * Volby formulářů na stránce Kontakt a popisky pro administraci a e-maily.
 * Hodnoty jsou doslova z klikacího modelu (prototyp/kontakt.html), ukládají
 * se do databáze tak, jak je formulář pošle.
 */

export const LICENCES = ["PPL", "CPL/ATPL", "Ultralight", "Jiná", "Nemám"] as const;

/**
 * Volby „Výlet“ v poptávce: letecké výlety (slugy ze src/data/trip-slugs.ts)
 * a „Zatím nevím“. V kódu a v databázi se jmenují package (sloupec
 * package_slug), na webu výlet.
 */
export const PACKAGES = {
  "florida-week": {
    name: "Florida Week & Fly",
    formLabel: "Florida Week & Fly, 6 dní, 12 letových hodin",
  },
  "grand-tour": {
    name: "Florida Grand Tour & Fly",
    formLabel: "Florida Grand Tour & Fly, 9 dní, 20 letových hodin",
  },
  nevim: {
    name: "Zatím neví",
    formLabel: "Zatím nevím, poradíme se",
  },
} as const satisfies Record<TripSlug | "nevim", { name: string; formLabel: string }>;

export type PackageSlug = keyof typeof PACKAGES;

export const PACKAGE_SLUGS = Object.keys(PACKAGES) as [PackageSlug, ...PackageSlug[]];

/** Název výletu pro člověka. Neznámý slug (výlet z webu zmizel) vrátí beze změny. */
export function packageName(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return slug in PACKAGES ? PACKAGES[slug as PackageSlug].name : slug;
}

// Odkazy „Poptat tento výlet“ vedou na /kontakt?vylet=...#poptavka (dřív
// ?balicek=, platí dál). Kratší tvary převzaté z js/kontakt.js, aby
// fungovaly i ručně psané adresy.
const PACKAGE_ALIASES: Record<string, PackageSlug> = {
  "florida-week": "florida-week",
  week: "florida-week",
  "1": "florida-week",
  "grand-tour": "grand-tour",
  grand: "grand-tour",
  "2": "grand-tour",
  nevim: "nevim",
};

/** Výlet předvyplněný z parametru ?vylet= (nebo dřívějšího ?balicek=) v adrese. */
export function packageFromParam(param: string | null | undefined): PackageSlug | null {
  if (!param) return null;
  return PACKAGE_ALIASES[param.toLowerCase()] ?? null;
}

export const PILOT_COUNTS = ["1", "2", "3 a víc"] as const;

export const COMPANIONS = ["Ano", "Ne", "Ještě nevím"] as const;

export const REFERRAL_SOURCES = [
  "Od známého nebo dřívějšího klienta",
  "Od Honzy osobně",
  "Z časopisu Flying Revue",
  "Z vyhledávače",
  "Ze sociálních sítí",
  "Jinak",
] as const;

// ---------------------------------------------------------------------------
// Administrace
// ---------------------------------------------------------------------------

type Inquiry = typeof inquiries.$inferSelect;
export type InquiryStatus = Inquiry["status"];
export type InquiryKind = Inquiry["kind"];

// Typ z databázového enumu: nový stav ve schématu bez popisku tady neprojde typovou kontrolou.
export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "Nová",
  in_progress: "Rozpracovaná",
  done: "Vyřízená",
  archived: "Archivovaná",
};

export const INQUIRY_STATUSES = Object.keys(INQUIRY_STATUS_LABELS) as [
  InquiryStatus,
  ...InquiryStatus[],
];

export const INQUIRY_KIND_LABELS: Record<InquiryKind, string> = {
  inquiry: "Poptávka",
  callback: "Zavolat zpět",
};
