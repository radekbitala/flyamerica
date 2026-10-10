export const SITE_NAME = "FLY America";

/**
 * Adresa webu bez lomítka na konci: canonical, og:url, og:image a odkazy
 * v e-mailech. Hlavní doména ještě není rozhodnutá (flyamerica.cz, nebo
 * www.flyamerica.cz s přesměrováním z té druhé), proto jde přepsat přes
 * NEXT_PUBLIC_SITE_URL ve Vercelu. Hodnota se do kódu vloží při buildu,
 * po změně je potřeba nový build.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://flyamerica.cz").replace(/\/+$/, "");

/** Honzův kontakt na webu, v hláškách formulářů a v e-mailech. */
export const FA_EMAIL = "flywithme@seznam.cz";
export const FA_PHONE = "+420 602 214 719";
/** Telefon pro odkaz tel: (bez mezer). */
export const FA_PHONE_HREF = `tel:${FA_PHONE.replaceAll(" ", "")}`;

/** Barva lišty prohlížeče na mobilu (Grafit z fa-tokeny.css). */
export const THEME_COLOR = "#1D252D";
