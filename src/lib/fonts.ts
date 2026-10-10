import localFont from "next/font/local";
import { Overpass_Mono, Source_Serif_4 } from "next/font/google";

// Písma hostuje next/font spolu s webem, prohlížeč nic nestahuje z Googlu
// (Google Fonts se stáhnou jednou při buildu). Na proměnné z fa-tokeny.css je
// napojuje src/styles/fonts.css.

/**
 * Overpass, proměnné písmo 100-900 z klikacího modelu (OFL).
 *
 * Konstanta se schválně nejmenuje overpass. Turbopack pojmenuje rodinu
 * podle ní a "overpass" by se (velikost písmen se nerozlišuje) potkal
 * s @font-face 'Overpass' ve web.css, který načítá stejný soubor z jiné
 * adresy. Vyhrálo by pravidlo z web.css a přednačtený soubor by přišel
 * vniveč. Rodina 'Overpass' z web.css tak zůstane nepoužitá a nestahuje se.
 */
export const faSans = localFont({
  src: "../fonts/Overpass-wght.woff",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-overpass",
});

/** Jen kódy letišť a čísla. */
export const faMono = Overpass_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-overpass-mono",
  // Je jen na části stránek a v malém množství, přednačítat se nevyplatí.
  preload: false,
});

/** Jen když mluví Honza (deník, O Honzovi). */
export const faSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-source-serif",
  // Normální a kurzíva po dvou podmnožinách by byly čtyři soubory navíc
  // na každé stránce, i tam, kde serif vůbec není.
  preload: false,
});
