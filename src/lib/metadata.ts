import type { Metadata } from "next";
import { ALLOW_INDEXING, SITE_NAME } from "@/lib/site";

/**
 * Metadata stránek webu podle klikacího modelu (_PRAVIDLA.md, část 2 a 7):
 * titulek „Název stránky - FLY America“, og:title a og:description stejné
 * jako <title> a description, og:url a canonical s adresou stránky, náhled
 * odkazu 1200 x 630 a twitter:card summary_large_image. Relativní adresy
 * doplní metadataBase z kořenového layoutu webu (SITE_URL).
 *
 * Next metadata layoutu a stránky slučuje jen do první úrovně: stránka, která
 * nastaví vlastní openGraph, by přišla o obrázek z layoutu. Proto každá
 * stránka webu skládá metadata celá přes tuhle funkci.
 */

/**
 * meta robots stránek webu: do spuštění (bez ALLOW_INDEXING v src/lib/site.ts)
 * noindex, nofollow, s povolenou indexací žádné, jako dosud. Nastavuje ho
 * kořenový layout webu a stránka 404 (global-not-found), stránky ho dědí,
 * pageMetadata() ho nepřepisuje.
 */
export const SITE_ROBOTS: Metadata["robots"] = ALLOW_INDEXING
  ? undefined
  : { index: false, follow: false };

/** Náhledy odkazu z design/predavaci-sada/og, v public/og. */
export const OG_IMAGES = {
  /** Všechny stránky kromě článků deníku. */
  default: "/og/og-image.jpg",
  /** Články deníku. */
  photo: "/og/og-image-foto.jpg",
} as const;

export type OgImage = keyof typeof OG_IMAGES;

export interface PageMetadataInput {
  /**
   * Název stránky bez „ - FLY America“, doslova jako v modelu
   * („Florida Week & Fly“, „Tipy na výlety“). Na úvodní stránce celý
   * titulek s absoluteTitle.
   */
  title: string;
  /** Jedna věcná věta, stejná pro description i og:description. */
  description: string;
  /** Cesta stránky bez domény a bez lomítka na konci: "/", "/denik/slug". */
  path: string;
  /** Titulek bez přípony „ - FLY America“ (úvodní stránka). */
  absoluteTitle?: boolean;
  /** Náhled odkazu, výchozí "default". Články deníku "photo". */
  ogImage?: OgImage;
  /** Článek deníku: og:type article a datum vydání (ISO). */
  article?: { publishedTime?: string; modifiedTime?: string };
}

/** Celý titulek stránky tak, jak bude v <title> i og:title. */
export function fullTitle(title: string, absolute = false): string {
  return absolute ? title : `${title} - ${SITE_NAME}`;
}

/** Cesta pro canonical a og:url: vždy s lomítkem na začátku, bez lomítka na konci. */
export function canonicalPath(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const title = fullTitle(input.title, input.absoluteTitle);
  const url = canonicalPath(input.path);
  const image = {
    url: OG_IMAGES[input.ogImage ?? "default"],
    width: 1200,
    height: 630,
    alt: SITE_NAME,
  };

  return {
    // absolute: šablona titulku z layoutu se už nepřidává, titulek je hotový.
    title: { absolute: title },
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: input.article ? "article" : "website",
      siteName: SITE_NAME,
      locale: "cs_CZ",
      title,
      description: input.description,
      url,
      images: [image],
      ...(input.article
        ? {
            publishedTime: input.article.publishedTime,
            modifiedTime: input.article.modifiedTime,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      images: [image.url],
    },
  };
}
