/**
 * Název článku deníku pro zobrazení na webu.
 *
 * Titulky převedené z WordPressu mají na konci štítek s rokem
 * („Druhý přelet Atlantiku | 2017“, „Opět z východu na západ | Prosinec 2023“,
 * viz migrace/MIGRACE.md, otevřená otázka 3). Klikací model je ukazuje bez
 * štítku a rok bere z data článku („Druhý přelet Atlantiku, 2017“). V databázi
 * titulek zůstává doslova, štítek se ořízne jen při zobrazení. Ořízne se jen
 * část za posledním „ | “, která končí rokem, jiný titulek zůstane beze změny.
 */
export function postDisplayTitle(title: string): string {
  return title.replace(/\s+\|\s+[^|]*\d{4}\s*$/u, "");
}
