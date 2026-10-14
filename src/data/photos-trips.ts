import type { Photo } from "./photos";

/**
 * Fotky z fotobanky (../fotobanka/fotobanka.json) pro oblast leteckých výletů (přehled a detail výletu).
 *
 * Klíč je "vylety/<id z fotobanky>", soubor public/img/vylety/<id>.jpg:
 * největší potřebná varianta JPG z fotobanky (obvykle 1600, přes celou
 * šířku 2400) přejmenovaná na id bez velikosti. Menší velikosti, WebP
 * a AVIF dělá next/image. Fotky s „osoby: ano, souhlas nutný“ nepoužívat.
 * alt je pole alt z fotobanky, caption pole popisek (viditelný popisek).
 * Postup v README (Veřejný web, Fotky).
 *
 * Vzor:
 *   "vylety/letadla-winter-haven-01": {
 *     src: "/img/vylety/letadla-winter-haven-01.jpg",
 *     width: 1600,
 *     height: 1200,
 *     alt: "Cessna 182 N24658 na stojánce letiště Winter Haven, …",
 *     caption: "Naše expediční Cessna 182 na letišti ve Winter Haven (KGIF)",
 *   },
 */
export const tripPhotos = {
  // Posuvná řada fotek na stránce výletu (src/app/(web)/letecke-vylety/_data/trip-media.ts).
  // Florida Week & Fly: pobřeží Mexického zálivu mezi Orlandem a Cedar Key.
  "vylety/florida-z-vysky-crystal-river-07": {
    src: "/img/vylety/florida-z-vysky-crystal-river-07.jpg",
    width: 1600,
    height: 1200,
    alt: "Zátoka Crystal River s ostrůvky a loděmi pod křídlem letadla",
    caption: "Zátoka Crystal River u Mexického zálivu se hemží vodní technikou různého druhu po většinu roku",
  },
  // Karta Florida Week (úvod, přehled výletů, Kam dál na Grand Tour): výřez 16 : 9 stejné fotky (úprava 27 z auditu,
  // rozhodnutí 14. 10. 2026). Karta má 16 : 9, fotka 4 : 3, takže object-position může výřez posunout jen svisle a pak
  // je vidět buď křídlo nahoře, nebo napůl rám okna kabiny vpravo dole. Výřez 2080 x 1170 z varianty 2400 (od x 0,
  // y 250) zmenšený na 1600 x 900, bez metadat, nemá ani jedno. Alt a popisek doslova z fotobanky.
  "vylety/florida-z-vysky-crystal-river-07-karta": {
    src: "/img/vylety/florida-z-vysky-crystal-river-07-karta.jpg",
    width: 1600,
    height: 900,
    alt: "Zátoka Crystal River s ostrůvky a loděmi pod křídlem letadla",
    caption: "Zátoka Crystal River u Mexického zálivu se hemží vodní technikou různého druhu po většinu roku",
  },
  // Florida Grand Tour & Fly: Everglades a St. Augustine.
  "vylety/destinace-everglades-19": {
    src: "/img/vylety/destinace-everglades-19.jpg",
    width: 1600,
    height: 1200,
    alt: "Řeka v Everglades s dřevěnými moly a domky na kůlech mezi mangrovy",
    caption: "Everglades",
  },
  "vylety/destinace-everglades-20": {
    src: "/img/vylety/destinace-everglades-20.jpg",
    width: 1600,
    height: 1200,
    alt: "Aligátor odpočívající v trávě na břehu bažiny v Everglades",
    caption: "Jediný aligátor, kterého jsme viděli v Everglades",
  },
  "vylety/florida-z-vysky-st-augustine-10": {
    src: "/img/vylety/florida-z-vysky-st-augustine-10.jpg",
    width: 1600,
    height: 1067,
    alt: "Pevnost Castillo de San Marcos ve St. Augustine z výšky",
    // Popisek z fotobanky doslova („St. Augustin“, Honza píše „St. Augustine“), oprava čeká na Radka.
    caption: "St. Augustin",
  },
  // Úprava 9 z auditu (rozhodnutí 14. 10. 2026): letiště a letadla místo pláže.
  // Bez caption (viditelný popisek je alt): popisek ve fotobance má kód KEYW,
  // vedle Honzova EYW se neukazuje.
  "vylety/destinace-key-west-15": {
    src: "/img/vylety/destinace-key-west-15.jpg",
    width: 1600,
    height: 1200,
    alt: "Červenostříbrný Cirrus SR22 po přistání na letišti Key West, v pozadí business jety",
  },
} as const satisfies Record<string, Photo>;
