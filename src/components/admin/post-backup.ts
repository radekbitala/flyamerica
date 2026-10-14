// Záloha rozepsaného článku v prohlížeči (localStorage), úprava 10 z auditu.
// Honza píše i z hotelové a letištní Wi-Fi: když se uložení nepovede, panel
// se zavře nebo telefon stránku uspí, text zůstane v prohlížeči a při
// dalším otevření článku ho formulář nabídne k obnovení. Jen v tomto
// prohlížeči, na server ani k jiným zařízením nejde. Každé čtení i zápis je
// v try/catch: v anonymním okně, při zakázaných datech webu nebo plném
// úložišti localStorage nefunguje a formulář musí jet i bez zálohy.

const PREFIX = "fa-admin-clanek:";

export interface PostBackup<V> {
  /** Kdy se záloha naposledy zapsala (ISO). */
  savedAt: string;
  values: V;
}

/** Klíč zálohy podle id článku, u nového článku „new“. */
export function backupKey(postId: string | undefined): string {
  return `${PREFIX}${postId ?? "new"}`;
}

export function readBackup(key: string): PostBackup<unknown> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (
      typeof data === "object" &&
      data !== null &&
      "savedAt" in data &&
      typeof data.savedAt === "string" &&
      "values" in data
    ) {
      return { savedAt: data.savedAt, values: data.values };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeBackup(key: string, values: unknown): void {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ savedAt: new Date().toISOString(), values }),
    );
  } catch {
    // Plné nebo zakázané úložiště: bez zálohy, formulář funguje dál.
  }
}

export function removeBackup(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Viz writeBackup.
  }
}

/** „14:32“, u zálohy z jiného dne „13. 10. 14:32“ (místní čas prohlížeče). */
export function backupTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "dřívějška";
  const time = date.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? time
    : `${date.getDate()}. ${date.getMonth() + 1}. ${time}`;
}
