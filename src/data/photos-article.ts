import type { Photo } from "./photos";

/**
 * Fotky z fotobanky (../fotobanka/fotobanka.json) pro oblast článků Z cest (fotky ke dnům v článku 2017 a podobně).
 *
 * Klíč je "z-cest/<id z fotobanky>", soubor public/img/z-cest/<id>.jpg:
 * největší potřebná varianta JPG z fotobanky (obvykle 1600, přes celou
 * šířku 2400) přejmenovaná na id bez velikosti. Menší velikosti, WebP
 * a AVIF dělá next/image. Fotky s „osoby: ano, souhlas nutný“ nepoužívat.
 * alt je pole alt z fotobanky, caption pole popisek (viditelný popisek).
 * Postup v README (Veřejný web, Fotky).
 *
 * Vzor:
 *   "z-cest/letadla-winter-haven-01": {
 *     src: "/img/z-cest/letadla-winter-haven-01.jpg",
 *     width: 1600,
 *     height: 1200,
 *     alt: "Cessna 182 N24658 na stojánce letiště Winter Haven, …",
 *     caption: "Naše expediční Cessna 182 na letišti ve Winter Haven (KGIF)",
 *   },
 */
export const articlePhotos = {} as const satisfies Record<string, Photo>;
