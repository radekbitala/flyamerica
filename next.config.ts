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

/**
 * Staré adresy WordPressu končí lomítkem (/oblet-ameriky-2016/, /validace/).
 * Next by lomítko nejdřív odstranil (308) a teprve pak použil pravidlo
 * (druhé 308). Výchozí odstraňování lomítka je proto vypnuté
 * (skipTrailingSlashRedirect) a každé pravidlo má i variantu s lomítkem:
 * Next porovnává zdroj přesně, /validace/:path* lomítko na konci nepustí.
 * Pravidla s has (/?p=ID) mají zdroj "/" a zůstávají jednou. Na konci
 * náhrada výchozího chování: jakákoli jiná adresa s lomítkem na konci
 * jedním 308 na adresu bez něj (/kontakt/, /denik/<slug>/).
 * Test: node scripts/test-redirects.mjs proti běžícímu serveru.
 */
function withTrailingSlash(rules: Redirect[]): Redirect[] {
  const variants = rules
    .filter((rule) => rule.source !== "/" && !rule.source.endsWith("/"))
    .map((rule) => ({ ...rule, source: `${rule.source}/` }));
  return [...variants, ...rules, { source: "/:path+/", destination: "/:path+", permanent: true }];
}

/**
 * Bezpečnostní hlavičky všech odpovědí. Stránku nejde vložit do rámu na
 * cizím webu (clickjacking formulářů), prohlížeč neodhaduje typ souborů,
 * cizí weby dostanou z odkazu jen doménu a web nepotřebuje kameru, mikrofon
 * ani polohu. Plná CSP (s nonce pro skripty) zatím není. HSTS doplní Vercel.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Soubory z public/ (fotky stránek, logo, náhledy odkazu, případně písma)
 * a ikony webu (src/app: favicon.ico, icon.png, apple-icon.png) nemají
 * v názvu otisk obsahu. Proto ne rok a immutable jako /_next/static (ten
 * nastavuje Next sám a nejde přepsat), ale den v cache prohlížeče a CDN
 * a další týden smí dostat starou verzi, zatímco se na pozadí ověří nová.
 * Vyměněná fotka se stejným názvem se tak projeví nejpozději za den.
 * Písma webu jsou dnes v src/fonts přes next/font (/_next/static/media).
 */
const STATIC_FILE_CACHE = "public, max-age=86400, stale-while-revalidate=604800";
const STATIC_FILE_SOURCES = [
  "/img/:path*",
  "/logo/:path*",
  "/og/:path*",
  "/fonts/:path*",
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
];

/**
 * Do spuštění webu (bez NEXT_PUBLIC_ALLOW_INDEXING=true) dostane každá
 * odpověď X-Robots-Tag: noindex, i obrázky a soubory, které meta robots
 * nemají. Stejný přepínač jako ALLOW_INDEXING v src/lib/site.ts (robots.txt
 * a meta robots), čte se při buildu.
 */
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export default function nextConfig(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    turbopack: {
      root: path.resolve(__dirname),
    },
    // Vlevo dole by indikátor vývojového serveru zakrýval odhlášení
    // v administraci.
    devIndicators: { position: "bottom-right" },
    // Hlavička X-Powered-By: Next.js by zbytečně prozrazovala framework.
    poweredByHeader: false,
    // Lomítko na konci adresy řeší přesměrování níže (withTrailingSlash).
    skipTrailingSlashRedirect: true,
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
        // Náhledy videí z YouTube v článcích (náhled s tlačítkem přehrát,
        // přehrávač youtube-nocookie až po kliknutí). Obrázek stahuje náš
        // server přes next/image, prohlížeč návštěvníka se na Google neptá.
        { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
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
      return withTrailingSlash(loadRedirects());
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            ...SECURITY_HEADERS,
            ...(ALLOW_INDEXING ? [] : [{ key: "X-Robots-Tag", value: "noindex" }]),
          ],
        },
        ...STATIC_FILE_SOURCES.map((source) => ({
          source,
          headers: [{ key: "Cache-Control", value: STATIC_FILE_CACHE }],
        })),
      ];
    },
  };
}
