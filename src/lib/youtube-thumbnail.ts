import "server-only";

/** Náhled videa z YouTube: adresa na i.ytimg.com a rozměry obrázku. */
export interface YouTubeThumbnail {
  src: string;
  width: number;
  height: number;
}

/**
 * Náhledy od největšího. maxresdefault (1280 x 720, 16 : 9) mají jen videa
 * nahraná v HD, sddefault (640 x 480) skoro všechna, hqdefault (480 x 360)
 * každé video. sd a hq jsou 4 : 3 s černými pruhy, web je ořízne na 16 : 9.
 */
const SIZES = [
  { name: "maxresdefault", width: 1280, height: 720 },
  { name: "sddefault", width: 640, height: 480 },
] as const;

const FALLBACK = { name: "hqdefault", width: 480, height: 360 } as const;

/** Jak dlouho čekat na odpověď YouTube, než se vezme hqdefault. */
const TIMEOUT_MS = 3000;

/**
 * Největší náhled, který video má. Chybějící velikost vrací i.ytimg.com jako
 * 404 (s malým šedým obrázkem), next/image by ji nezpracoval. Ověřuje to
 * server požadavkem HEAD při vykreslení stránky, prohlížeč návštěvníka se na
 * YouTube neptá. Odpověď je v cache Next.js (force-cache), náhledy se
 * nemění. Bez sítě (build bez připojení) nebo po chybě zůstává hqdefault.
 */
export async function youtubeThumbnail(id: string): Promise<YouTubeThumbnail> {
  for (const size of SIZES) {
    const src = thumbnailUrl(id, size.name);
    try {
      const response = await fetch(src, {
        method: "HEAD",
        cache: "force-cache",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) return { src, width: size.width, height: size.height };
    } catch {
      // Síť nebo časový limit: další menší velikost, nakonec hqdefault.
    }
  }
  return { src: thumbnailUrl(id, FALLBACK.name), width: FALLBACK.width, height: FALLBACK.height };
}

function thumbnailUrl(id: string, name: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${name}.jpg`;
}
