import type { Photo } from "./photos";

/**
 * Fotky z fotobanky (../fotobanka/fotobanka.json) pro oblast čtecích stránek:
 * články Z cest, Váš mentor a zásady.
 *
 * Klíč je "z-cest/<id z fotobanky>", soubor public/img/z-cest/<id>.jpg:
 * největší potřebná varianta JPG z fotobanky (obvykle 1600, přes celou
 * šířku 2400) přejmenovaná na id bez velikosti. Menší velikosti, WebP
 * a AVIF dělá next/image. Fotky s „osoby: ano, souhlas nutný“ nepoužívat.
 * alt je pole alt z fotobanky, caption pole popisek (viditelný popisek).
 * Postup v README (Veřejný web, Fotky).
 */
export const articlePhotos = {
  // Váš mentor: velká fotka pod záhlavím (přes celý kontejner, proto 2400). Osoby: jen Honza, kvalita 4.
  "z-cest/honza-knoxville-04": {
    src: "/img/z-cest/honza-knoxville-04.jpg",
    width: 2400,
    height: 1800,
    alt: "Honza u proudového letadla Cirrus Vision Jet N52CV na stojánce",
    caption: "Po prvním letu na Cirrus Vision Jet, Knoxville, Tennessee, USA",
  },
  // Váš mentor: galerie (místo stejné fotky Vision Jetu z modelu). Osoby: jen Honza, kvalita 4.
  "z-cest/honza-key-west-09": {
    src: "/img/z-cest/honza-key-west-09.jpg",
    width: 1600,
    height: 1200,
    alt: "Honza v červené kšiltovce u vchodu do Hemingwayova domu na Key Westu",
    caption: "Ernest Hemingway Home and Museum, Key West, Florida.",
  },
} as const satisfies Record<string, Photo>;
