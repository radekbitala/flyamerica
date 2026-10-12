export const SITE_NAME = "FLY America";

/**
 * Adresa webu bez lomítka na konci: canonical, og:url, og:image, mapa webu
 * a odkazy v e-mailech. Hlavní doména je www.flyamerica.cz (rozhodnutí
 * 12. 10. 2026), doména bez www se na ni přesměruje v nastavení domén ve
 * Vercelu (README, Spuštění webu). Jinou adresu (náhled, testy) jde nastavit
 * přes NEXT_PUBLIC_SITE_URL. Hodnota se do kódu vloží při buildu, po změně
 * je potřeba nový build.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.flyamerica.cz").replace(/\/+$/, "");

/** Hostitel webu bez protokolu pro texty („www.flyamerica.cz/z-cest/…“ v administraci). */
export const SITE_HOST = new URL(SITE_URL).host;

/**
 * Smí web do vyhledávačů? Výchozí je ne, dokud web neběží na hlavní doméně:
 * robots.txt zakáže celý web (src/app/robots.ts), stránky mají meta robots
 * noindex, nofollow (SITE_ROBOTS v src/lib/metadata.ts) a odpovědi
 * hlavičku X-Robots-Tag: noindex (next.config.ts). Zapíná se při spuštění
 * webu proměnnou NEXT_PUBLIC_ALLOW_INDEXING=true ve Vercelu. Hodnota se do
 * kódu vloží při buildu, po změně je potřeba nové nasazení.
 */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

/** Honzův kontakt na webu, v hláškách formulářů a v e-mailech. */
export const FA_EMAIL = "flywithme@seznam.cz";
export const FA_PHONE = "+420 602 214 719";
/** Telefon pro odkaz tel: (bez mezer). */
export const FA_PHONE_HREF = `tel:${FA_PHONE.replaceAll(" ", "")}`;

/** Barva lišty prohlížeče na mobilu (Grafit z fa-tokeny.css). */
export const THEME_COLOR = "#1D252D";
