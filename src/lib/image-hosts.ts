/**
 * Odkud smí být fotky deníku (titulní fotka, fotky v textu a v galeriích).
 *
 * Stejná pravidla jako images.remotePatterns v next.config.ts: bucket
 * "denik" našeho projektu Supabase (SUPABASE_URL), při vývoji navíc
 * placehold.co (ukázková data ze scripts/local-db.mjs) a 127.0.0.1:8816
 * (fotky z migrace, README, Import deníku). Administrace podle toho
 * kontroluje adresy při uložení článku, web podle toho rozhoduje, které
 * fotky jdou přes next/image. Cizí adresa by jinak na webu načítala fotku
 * z cizího serveru (IP návštěvníků, smíšený obsah přes http).
 */

/** Cesta veřejných souborů bucketu "denik" (DENIK_BUCKET v src/lib/supabase/admin.ts). */
const DENIK_PUBLIC_PATH = "/storage/v1/object/public/denik/";

function parseUrl(src: string): URL | null {
  try {
    return new URL(src);
  } catch {
    return null;
  }
}

/** Fotka z bucketu "denik" našeho projektu Supabase. Bez SUPABASE_URL žádná. */
function isDiaryBucketUrl(url: URL): boolean {
  const supabase = process.env.SUPABASE_URL ? parseUrl(process.env.SUPABASE_URL) : null;
  return (
    supabase !== null &&
    url.protocol === "https:" &&
    url.hostname === supabase.hostname &&
    url.port === supabase.port &&
    url.pathname.startsWith(DENIK_PUBLIC_PATH) &&
    url.pathname.length > DENIK_PUBLIC_PATH.length &&
    url.username === "" &&
    url.password === ""
  );
}

/** Lokální fotky jen při next dev (stejně jako remotePatterns v next.config.ts). */
function isDevImageUrl(url: URL): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (url.protocol === "https:" && url.hostname === "placehold.co") return true;
  return url.protocol === "http:" && url.hostname === "127.0.0.1" && url.port === "8816";
}

/**
 * Smí článek fotku z téhle adresy uložit? Jen absolutní adresa z bucketu
 * "denik", při vývoji i z lokálních zdrojů. Kontroluje se při uložení
 * článku (src/app/admin/(dashboard)/posts/actions.ts), ne při vykreslení.
 */
export function isAllowedImageUrl(src: string): boolean {
  const url = parseUrl(src);
  return url !== null && (isDiaryBucketUrl(url) || isDevImageUrl(url));
}

/**
 * Smí fotka přes optimalizaci next/image? Soubory webu (/img/…) a adresy
 * podle isAllowedImageUrl. Jiná adresa by v next/image skončila chybou,
 * taková fotka se vykreslí obyčejným <img loading="lazy">.
 */
export function canOptimizeImage(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  return isAllowedImageUrl(src);
}
