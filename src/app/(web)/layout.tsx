import type { Metadata, Viewport } from "next";
import { webFontVariables } from "@/lib/fonts";
import { OG_IMAGES, SITE_ROBOTS } from "@/lib/metadata";
import { SITE_NAME, SITE_URL, THEME_COLOR } from "@/lib/site";
import { ArrowSymbol } from "@/components/web/ArrowSymbol";
import { SiteHeader } from "@/components/web/SiteHeader";
import { SiteFooter } from "@/components/web/SiteFooter";
import "@/styles/fa-tokeny.css";
import "@/styles/web.css";
import "@/styles/fonts.css";
// Styly stránek po web.css (web.css je kopie z modelu a neupravuje se).
// Každý soubor patří jedné oblasti webu, úpravy jedné stránky nesahají do jiných.
import "@/styles/pages/home.css";
import "@/styles/pages/trips.css";
import "@/styles/pages/destinations.css";
import "@/styles/pages/article.css";
import "@/styles/pages/contact.css";
import "@/styles/pages/status.css";

/**
 * Výchozí metadata webu. Stránky skládají svá metadata celá přes
 * pageMetadata() (src/lib/metadata.ts), i s canonical a náhledem odkazu.
 * Tady zůstává jen to, co platí i pro stránky bez vlastních metadat (404).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FLY America - létání na Floridě s mentorem",
    template: `%s - ${SITE_NAME}`,
  },
  description:
    "Létání s českými piloty na Floridě. Domovská základna Orlando North Airpark (FA83), Cessna 182 a mentor Honza Čermák.",
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: SITE_NAME,
    images: [{ url: OG_IMAGES.default, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", images: [OG_IMAGES.default] },
  // Do spuštění webu noindex, nofollow na všech stránkách (ALLOW_INDEXING).
  robots: SITE_ROBOTS,
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

/** Bez skriptu se tichá výzva v hlavičce neskrývá (vzor z prototyp/_sablona.html). */
const NOSCRIPT_QUIET = "<style>.hdr-right > .fa-quiet.is-hidden { opacity: 1; visibility: visible; }</style>";

/**
 * Kořenový layout webu. modal je paralelní slot @modal: detail destinace
 * z Kam letět v okně nad stránkou (zachycená adresa /kam-letet/<slug>),
 * jinak default.tsx (nic). Přímá adresa /kam-letet/<slug> je celá stránka.
 */
export default function WebLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      // web.css má scroll-behavior: smooth. Atribut vrací chování Next 15,
      // kdy se při přechodu mezi stránkami skáče nahoru hned, ne plynule.
      data-scroll-behavior="smooth"
      className={webFontVariables}
    >
      <head>
        <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT_QUIET }} />
      </head>
      <body>
        <ArrowSymbol />
        <a className="skip" href="#obsah">
          Přeskočit na obsah
        </a>
        <SiteHeader />
        <main id="obsah">{children}</main>
        <SiteFooter />
        {modal}
      </body>
    </html>
  );
}
