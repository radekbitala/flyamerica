import type { Photo } from "./photos";

/**
 * Fotky z fotobanky (../fotobanka/fotobanka.json) pro oblast úvodní stránky.
 *
 * Klíč je "uvod/<id z fotobanky>", soubor public/img/uvod/<id>.jpg:
 * největší potřebná varianta JPG z fotobanky (obvykle 1600, přes celou
 * šířku 2400) přejmenovaná na id bez velikosti. Menší velikosti, WebP
 * a AVIF dělá next/image. Fotky s „osoby: ano, souhlas nutný“ nepoužívat.
 * alt je pole alt z fotobanky, caption pole popisek (viditelný popisek).
 * Postup v README (Veřejný web, Fotky). Fotky karet výletů na úvodu jsou
 * stejné jako na přehledu výletů (src/app/(web)/letecke-vylety/_data/trip-media.ts).
 *
 * Vzor:
 *   "uvod/letadla-winter-haven-01": {
 *     src: "/img/uvod/letadla-winter-haven-01.jpg",
 *     width: 1600,
 *     height: 1200,
 *     alt: "Cessna 182 N24658 na stojánce letiště Winter Haven, …",
 *     caption: "Naše expediční Cessna 182 na letišti ve Winter Haven (KGIF)",
 *   },
 */
export const homePhotos = {
  // Co za vás zařídíme: Honza u Cessny 182 (téma Honza, kvalita 5, osoby „jen Honza“). Výřez 960 x 1280 (3 : 4)
  // z varianty 2400 (od x 965, y 240), bez metadat. Na přídi je nálepka expedice s portrétem a jménem spolupilota
  // (stejná jako u honza-pinal-airpark-01, kde fotobanka žádá souhlas), proto výřez bez ní. Imatrikulace N24658
  // ve výřezu není, alt je bez ní, jinak doslova z fotobanky.
  "uvod/honza-death-valley-02": {
    src: "/img/uvod/honza-death-valley-02.jpg",
    width: 960,
    height: 1280,
    alt: "Honza u Cessny 182 před hangárem letiště Furnace Creek v Death Valley",
    caption: "Furnace Creek, Death Valley",
  },
} as const satisfies Record<string, Photo>;
