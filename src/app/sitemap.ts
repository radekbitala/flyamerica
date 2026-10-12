import type { MetadataRoute } from "next";
import { DESTINATIONS } from "@/data/destinations";
import { TRIPS } from "@/data/trips";
import { getPublishedPosts } from "@/lib/public-posts";
import { ROUTES, destinationPath, postPath, tripPath } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

/** Stránky webu (README, Veřejný web). Nová stránka webu patří i sem. */
const PAGES = [
  ROUTES.home,
  ROUTES.trips,
  ...TRIPS.map((trip) => tripPath(trip.slug)),
  ROUTES.destinations,
  ...DESTINATIONS.map((destination) => destinationPath(destination.slug)),
  ROUTES.posts,
  ROUTES.mentor,
  ROUTES.contact,
  ROUTES.privacy,
];

/**
 * /sitemap.xml: stránky webu (i detaily výletů a destinací) a všechny
 * publikované články. Bez data změny: u stránek ho neznáme a nepřesné
 * lastmod vyhledávače přestanou brát v úvahu. Seznam článků je z cache
 * s tagem článků, po změně článku se obnoví spolu s nimi
 * (revalidatePublicPosts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  return [
    // Úvod „https://www.flyamerica.cz/“ (canonical v HTML je bez lomítka, je to tatáž adresa), ostatní bez lomítka.
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...posts.map((post) => ({ url: `${SITE_URL}${postPath(post.slug)}` })),
  ];
}
