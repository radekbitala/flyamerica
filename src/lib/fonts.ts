import localFont from "next/font/local";

// Všechna písma jsou soubory z klikacího modelu (prototyp/fonts, src/fonts),
// next/font je jen hostuje spolu s webem. Nic se nestahuje z Googlu, ani při
// buildu. Na proměnné z web.css (--f-sans, --f-mono, --f-serif) je napojuje
// src/styles/fonts.css.
//
// Náhradní písma (adjustFontFallback) next/font negeneruje. Model má vlastní
// 'Overpass Fallback' (Arial zvlášť pro váhy 400, 600 a 700), 'Source Serif
// Fallback' (Georgia, na mobilu zvlášť pro 18 px) a 'Overpass Mono Fallback'
// (Courier New) s rozměry změřenými na textu stránek. Jsou v web.css (část 1)
// a fonts.css je řadí hned za webová písma. next/font umí jen jedno náhradní
// písmo pro celou rodinu, Arial nebo Times New Roman, a text by po načtení
// písma poskočil víc (porovnání v README, část Písma).
//
// Konstanty se schválně nejmenují overpass apod. Turbopack podle nich
// pojmenuje rodinu a 'Overpass' by se potkal s @font-face 'Overpass' ve
// web.css, který načítá stejný soubor z jiné adresy.
//
// Argumenty localFont() musí být doslovné hodnoty (next/font je čte při
// překladu), proto se rozsahy unicode-range opakují a nejsou v konstantě.

/** Overpass, proměnné písmo 400-900. Jediné přednačtené, je na každé stránce. */
export const faSans = localFont({
  src: "../fonts/overpass.woff2",
  weight: "400 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-overpass",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0100-02BA, U+02BB-02BC, U+02BD-02C5, U+02C6, U+02C7-02CC, U+02CE-02D7, U+02DA, U+02DC, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2000-206F, U+20A0-20AB, U+20AC, U+20AD-20C4, U+2113, U+2122, U+2191, U+2193, U+2212, U+2215, U+2C60-2C7F, U+A720-A7FF, U+FEFF, U+FFFD",
    },
  ],
});

// Overpass Mono a Source Serif 4 mají latin a latin-ext v samostatných
// souborech (podmnožiny z Google Fonts, rozsahy jako @font-face ve web.css).
// Každá podmnožina je vlastní rodina s vlastním unicode-range, v CSS jdou za
// sebou (latin první). Prohlížeč tak stáhne jen soubory se znaky, které na
// stránce jsou, stejně jako u @font-face v modelu.
//
// Soubory latin-ext mají od 14. 10. 2026 jen českou a slovenskou diakritiku
// mimo latin (úprava 32 z auditu): Č Ď Ě Ĺ Ľ Ň Ŕ Ř Š Ť Ů Ž a malá písmena.
// Jiné znaky z rozsahu latin-ext texty webu nemají (seznam vypisuje
// ../prototyp/_nastroje/pisma.py web, který soubory i rozsah vyrábí). Serif
// latin-ext klesl ze 40 na 8 kB, kurzíva ze 44 na 9 kB, Overpass Mono z 33
// na 4 kB. Znak mimo rozsah (třeba polské ł) by nakreslilo náhradní písmo,
// po takové změně textů skript spustit znovu a rozsah sem přepsat.

/** Overpass Mono 500-600, jen kódy letišť a čísla kroků. */
export const faMonoLatin = localFont({
  src: "../fonts/overpass-mono-latin.woff2",
  weight: "500 600",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  // Je jen na části stránek a v malém množství, přednačítat se nevyplatí.
  preload: false,
  variable: "--font-overpass-mono-latin",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const faMonoLatinExt = localFont({
  src: "../fonts/overpass-mono-latin-ext.woff2",
  weight: "500 600",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  variable: "--font-overpass-mono-latin-ext",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+010C-010F, U+011A-011B, U+0139-013A, U+013D-013E, U+0147-0148, U+0154-0155, U+0158-0159, U+0160-0161, U+0164-0165, U+016E-016F, U+017D-017E",
    },
  ],
});

/** Source Serif 4 400 a kurzíva, jen když mluví Honza. */
export const faSerifLatin = localFont({
  src: [
    { path: "../fonts/source-serif-4-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/source-serif-4-italic-latin.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  adjustFontFallback: false,
  // Normální řez a kurzíva po dvou podmnožinách by byly čtyři soubory navíc
  // na každé stránce, i tam, kde serif vůbec není.
  preload: false,
  variable: "--font-source-serif-latin",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const faSerifLatinExt = localFont({
  src: [
    { path: "../fonts/source-serif-4-latin-ext.woff2", weight: "400", style: "normal" },
    { path: "../fonts/source-serif-4-italic-latin-ext.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  variable: "--font-source-serif-latin-ext",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+010C-010F, U+011A-011B, U+0139-013A, U+013D-013E, U+0147-0148, U+0154-0155, U+0158-0159, U+0160-0161, U+0164-0165, U+016E-016F, U+017D-017E",
    },
  ],
});

/** Třídy pro <html> webu: nastaví proměnné --font-* všech písem. */
export const webFontVariables = [faSans, faMonoLatin, faMonoLatinExt, faSerifLatin, faSerifLatinExt]
  .map((font) => font.variable)
  .join(" ");

/** Třídy pro <html> administrace: Overpass a serif pro editor článků. */
export const adminFontVariables = [faSans, faSerifLatin, faSerifLatinExt]
  .map((font) => font.variable)
  .join(" ");
