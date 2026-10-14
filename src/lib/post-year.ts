import { formatDate, yearOf } from "@/lib/dates";
import { postDisplayTitle } from "@/lib/post-title";

// Rok cesty u článku Z cest (úprava 33 z auditu, rozhodnutí 14. 10. 2026).
// Článek 2022 („Po vynucené pauze opět v USA | 2022“) vyšel v listopadu 2023
// a web by u něj podle data publikace ukazoval rok 2023. Bez server-only,
// používá ho i administrace v prohlížeči.

/** Co postYear() a postDateLabel() potřebují z článku (PublicPostSummary i formulář administrace). */
export interface PostYearSource {
  title: string;
  /** Rok cesty z administrace, prázdný = rok z titulku nebo rok publikace. */
  tripYear?: number | null;
  publishedAt: Date;
}

/**
 * Rok ze štítku na konci titulku („Druhý přelet Atlantiku | 2017“,
 * „Opět z východu na západ | Prosinec 2023“), jinak null. Štítek pozná
 * stejně jako postDisplayTitle(): část za posledním „ | “, která končí rokem.
 */
export function titleLabelYear(title: string): number | null {
  const label = title.slice(postDisplayTitle(title).length);
  const match = /(\d{4})\s*$/u.exec(label);
  return match ? Number(match[1]) : null;
}

/** Rok cesty jako text („2022“): rok z administrace, jinak ze štítku titulku, jinak rok publikace. */
export function postYear({ title, tripYear, publishedAt }: PostYearSource): string {
  if (tripYear) return String(tripYear);
  const fromTitle = titleLabelYear(title);
  return fromTitle ? String(fromTitle) : yearOf(publishedAt);
}

/**
 * Datum publikace k článku („19. 11. 2023“ s pevnými mezerami). Když je rok
 * cesty jiný než rok publikace, s předponou „vydáno “, aby datum nevypadalo
 * jako datum cesty („vydáno 19. 11. 2023“ u článku 2022).
 */
export function postDateLabel(post: PostYearSource): string {
  const date = formatDate(post.publishedAt);
  return postYear(post) === yearOf(post.publishedAt) ? date : `vydáno ${date}`;
}
