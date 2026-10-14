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

/**
 * Honzův kontakt na webu, v hláškách formulářů a v e-mailech.
 *
 * FA_EMAIL je zároveň místo pro e-mail na doméně flyamerica.cz (úprava 21
 * z auditu): schránka zatím neexistuje, po jejím založení se vymění jen tato
 * hodnota (../design/audit-2026-10-13/BACKLOG-po-spusteni.md).
 */
export const FA_EMAIL = "flywithme@seznam.cz";
export const FA_PHONE = "+420 602 214 719";
/** Telefon pro odkaz tel: (bez mezer). */
export const FA_PHONE_HREF = `tel:${FA_PHONE.replaceAll(" ", "")}`;
/** Odkaz na WhatsApp na Honzově čísle (úprava 21, rozhodnutí 14. 10. 2026), wa.me chce jen číslice. */
export const FA_WHATSAPP_HREF = `https://wa.me/${FA_PHONE.replace(/\D/g, "")}`;

/**
 * Za jak dlouho se Honza ozve (úprava 16, rozhodnutí 14. 10. 2026): potvrzení
 * poptávky a Nechte číslo. Pevná mezera mezi číslem a slovem je rovnou v textu.
 */
export const FA_REPLY_TIME = "do 2\u00a0dnů";

/**
 * Sídlo provozovatele SKYSHARE s.r.o. (IČO 03725235) doslova od Honzy
 * (13. 10. 2026, ověřeno v ARES). Pevné mezery jsou rovnou v textu
 * (\u00a0): řádek se zalomí jen za čárkou, město s PSČ zůstane pohromadě.
 * Na Kontaktu, v patičce a v zásadách.
 */
export const FA_COMPANY_SEAT = "Mezibranská\u00a0375, Kutná\u00a0Hora\u00a0284\u00a001";

/**
 * Zápis SKYSHARE s.r.o. v obchodním rejstříku (úprava 7, identifikace
 * provozovatele), pevné mezery rovnou v textu. Ověřeno v ARES 14. 10. 2026
 * (ekonomicke-subjekty-vr/03725235: soud MSPH, oddíl C, vložka 236725, sídlo
 * shodné s FA_COMPANY_SEAT).
 */
export const FA_COMPANY_FILE_NO = "C\u00a0236725";
export const FA_COMPANY_COURT = "Městský soud v\u00a0Praze";

/** Barva lišty prohlížeče na mobilu (Grafit z fa-tokeny.css). */
export const THEME_COLOR = "#1D252D";
