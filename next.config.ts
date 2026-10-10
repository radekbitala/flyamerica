import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import path from "node:path";

const supabaseHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : "*.supabase.co";

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
    },
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: supabaseHost,
          pathname: "/storage/v1/object/public/**",
        },
        // Ukázkové články z lokální databáze (scripts/local-db.mjs) mají
        // obrázky z placehold.co. V produkci tahle výjimka není.
        ...(phase === PHASE_DEVELOPMENT_SERVER
          ? [{ protocol: "https" as const, hostname: "placehold.co" }]
          : []),
      ],
    },
  };
}
