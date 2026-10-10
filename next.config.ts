import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { readFileSync } from "node:fs";
import path from "node:path";

type ImagesConfig = NonNullable<NextConfig["images"]>;
type RemotePatterns = NonNullable<ImagesConfig["remotePatterns"]>;
type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

/**
 * Optimalizace obrázků (next/image) smí stahovat jen fotky deníku z našeho
 * projektu Supabase. Bez SUPABASE_URL při buildu se nepovolí žádný, ne každý
 * *.supabase.co: jinak by server zpracovával obrázky z cizích projektů.
 * Bucket "denik" je DENIK_BUCKET v src/lib/supabase/admin.ts, nový bucket
 * v UPLOAD_BUCKETS potřebuje i vzor tady.
 */
function supabaseImages(): RemotePatterns {
  const url = process.env.SUPABASE_URL;
  if (!url) return [];
  return [
    {
      protocol: "https",
      hostname: new URL(url).hostname,
      pathname: "/storage/v1/object/public/denik/**",
    },
  ];
}

/**
 * Přesměrování starých adres webu (WordPress) na nové. Seznam je v
 * src/data/redirects.json ve tvaru redirects z next.config (source,
 * destination, statusCode nebo permanent, volitelně has). Načte se při buildu.
 */
function loadRedirects(): Redirect[] {
  const file = path.join(__dirname, "src/data/redirects.json");
  const data: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(data)) {
    throw new Error("src/data/redirects.json musí obsahovat pole přesměrování.");
  }
  return data as Redirect[];
}

export default function nextConfig(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    turbopack: {
      root: path.resolve(__dirname),
    },
    // Vlevo dole by indikátor vývojového serveru zakrýval odhlášení
    // v administraci.
    devIndicators: { position: "bottom-right" },
    experimental: {
      // Web a administrace mají každý svůj kořenový layout, takže neexistuje
      // společný layout, do kterého by se vykreslil 404 pro neznámou adresu.
      // Viz src/app/global-not-found.tsx.
      globalNotFound: true,
      serverActions: {
        // Formulář článku posílá galerie i text najednou a výchozí 1 MB by
        // dlouhý cestopis s galeriemi nepustil (limity v src/lib/post-form.ts).
        // Vercel stejně nepustí do funkce víc než 4,5 MB.
        bodySizeLimit: "4mb",
      },
    },
    images: {
      // AVIF první, prohlížeč bez něj dostane WebP.
      formats: ["image/avif", "image/webp"],
      // Šířky podle modelu (_PRAVIDLA.md, část 5): fotky jsou nejvýš 1600 px,
      // velké fotky přes celou šířku 2400 px a úvod 3110 px. 828 a 1080 jsou
      // telefony s 2x a 3x displejem, 1280 a 1600 tablety a karty na
      // počítači s 2x displejem, 1920 až 3200 fotky přes celou šířku.
      deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2400, 3200],
      // Malé náhledy (portrét 60 x 80 px, dlaždice tipů na mobilu 112 px,
      // karty) podle nálezu 22: 256w a 400w.
      imageSizes: [128, 256, 400],
      remotePatterns: [
        ...supabaseImages(),
        ...(dev
          ? [
              // Ukázkové články z lokální databáze (scripts/local-db.mjs) mají
              // obrázky z placehold.co.
              { protocol: "https" as const, hostname: "placehold.co" },
              // Fotky deníku z migrace (../migrace/storage), dokud nejsou
              // v Supabase: python3 -m http.server 8816 --bind 127.0.0.1
              // --directory ../migrace/storage
              { protocol: "http" as const, hostname: "127.0.0.1", port: "8816", pathname: "/**" },
            ]
          : []),
      ],
      // next/image od verze 16 nestahuje obrázky z místních adres (ochrana
      // proti SSRF). Jen při vývoji kvůli fotkám deníku z 127.0.0.1:8816,
      // v produkci zůstává výchozí zákaz.
      ...(dev ? { dangerouslyAllowLocalIP: true } : {}),
    },
    async redirects() {
      return loadRedirects();
    },
  };
}
