import type { MetadataRoute } from "next";
import { ALLOW_INDEXING, SITE_URL } from "@/lib/site";

/**
 * /robots.txt. Do spuštění webu (bez NEXT_PUBLIC_ALLOW_INDEXING=true, viz
 * ALLOW_INDEXING v src/lib/site.ts) zakazuje vyhledávačům celý web, aby se
 * do nich nedostala adresa flyamerica.vercel.app ani rozpracované texty.
 * Po spuštění smí do vyhledávačů celý web kromě administrace a API.
 * Administrace je za přihlášením, robots.txt jen šetří zbytečné pokusy.
 */
export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
