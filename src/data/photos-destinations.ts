import type { Photo } from "./photos";

/**
 * Fotky z fotobanky (../fotobanka/fotobanka.json) pro oblast Kam letět (rozcestník a detaily destinací).
 *
 * Klíč je "kam-letet/<id z fotobanky>", soubor public/img/kam-letet/<id>.jpg:
 * největší potřebná varianta JPG z fotobanky (obvykle 1600, přes celou
 * šířku 2400) přejmenovaná na id bez velikosti. Menší velikosti, WebP
 * a AVIF dělá next/image. Fotky s „osoby: ano, souhlas nutný“ nepoužívat.
 * alt je pole alt z fotobanky, caption pole popisek (viditelný popisek).
 * Postup v README (Veřejný web, Fotky).
 *
 * Vzor:
 *   "kam-letet/letadla-winter-haven-01": {
 *     src: "/img/kam-letet/letadla-winter-haven-01.jpg",
 *     width: 1600,
 *     height: 1200,
 *     alt: "Cessna 182 N24658 na stojánce letiště Winter Haven, …",
 *     caption: "Naše expediční Cessna 182 na letišti ve Winter Haven (KGIF)",
 *   },
 */
export const destinationPhotos = {
  // Úprava 9 z auditu (rozhodnutí 14. 10. 2026): letiště a letadla místo pláže.
  // Výjimky z pravidla caption = popisek: fotka bez caption má jako viditelný
  // popisek alt (Figure). Cape Canaveral má v popisku překlep („Canareval“).
  "kam-letet/destinace-cape-canaveral-13": {
    src: "/img/kam-letet/destinace-cape-canaveral-13.jpg",
    width: 1600,
    height: 1067,
    alt: "Přistávací dráha raketoplánů na Cape Canaveral z výšky, v pozadí montážní hala",
  },
  "kam-letet/letadla-vero-beach-07": {
    src: "/img/kam-letet/letadla-vero-beach-07.jpg",
    width: 1600,
    height: 1200,
    alt: "Stříbrný Cirrus SR22 N874CZ na stojánce ve Vero Beach pod kupovitými mraky",
    caption: "S novým letadlem ve Vero Beach, Florida",
  },
  // Soubor z klikacího modelu (public/img/everglades-airpark.jpg, dřív v MODEL_PHOTOS
  // v photos.ts s alt „Everglades“), ve fotobance destinace-everglades-18: alt odtud,
  // popisek ve fotobance je jen název souboru („005_Everglades“), proto bez caption.
  "everglades-airpark": {
    src: "/img/everglades-airpark.jpg",
    width: 1600,
    height: 1200,
    alt: "Naše Cessna 182 Skylane s otevřenými dveřmi před budovou letiště Everglades Airpark, palmy a modrá obloha s mraky",
  },
} as const satisfies Record<string, Photo>;
