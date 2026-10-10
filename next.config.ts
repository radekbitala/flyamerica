import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import path from "node:path";

type RemotePatterns = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>;

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

export default function nextConfig(phase: string): NextConfig {
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
      remotePatterns: [
        ...supabaseImages(),
        // Ukázkové články z lokální databáze (scripts/local-db.mjs) mají
        // obrázky z placehold.co. V produkci tahle výjimka není.
        ...(phase === PHASE_DEVELOPMENT_SERVER
          ? [{ protocol: "https" as const, hostname: "placehold.co" }]
          : []),
      ],
    },
  };
}
