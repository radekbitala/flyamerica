import { NBSP } from "@/lib/typography";

// Data na webu jako v modelu: „21. 12. 2023“ s pevnými mezerami, v atributu
// datetime ISO „2023-12-21“. Vždy v pražském čase, ať server běží kdekoli
// (Vercel jede v UTC, článek publikovaný po půlnoci by měl jinak den předtím).

const TIME_ZONE = "Europe/Prague";

const czechDate = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const isoParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** „21. 12. 2023“ s pevnými mezerami (pravidlo R4). */
export function formatDate(date: Date): string {
  return czechDate.format(date).replace(/\s+/g, NBSP);
}

/** „2023-12-21“ pro <time dateTime>. */
export function isoDate(date: Date): string {
  return isoParts.format(date);
}

/** Rok publikace („2025“), když stránka ukazuje jen rok. */
export function yearOf(date: Date): string {
  return new Intl.DateTimeFormat("cs-CZ", { timeZone: TIME_ZONE, year: "numeric" }).format(date);
}
