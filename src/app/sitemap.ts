import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/public-posts";
import { SITE_URL } from "@/lib/site";

/** Stránky webu (README, Veřejný web). Nová stránka webu patří i sem. */
const PAGES = [
  "/",
  "/balicek-florida-week",
  "/balicek-grand-tour",
  "/tipy-na-vylety",
  "/o-honzovi",
  "/denik",
  "/kontakt",
  "/zasady-zpracovani-osobnich-udaju",
] as const;

/**
 * /sitemap.xml: stránky webu a všechny publikované články deníku. Bez data
 * změny: u stránek ho neznáme a nepřesné lastmod vyhledávače přestanou brát
 * v úvahu. Seznam článků je z cache s tagem deníku, po změně článku se
 * obnoví spolu s deníkem (revalidatePublicPosts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  return [
    // Úvod „https://flyamerica.cz/“ (canonical v HTML je bez lomítka, je to tatáž adresa), ostatní bez lomítka.
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...posts.map((post) => ({ url: `${SITE_URL}/denik/${post.slug}` })),
  ];
}
