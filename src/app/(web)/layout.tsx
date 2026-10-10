import type { Metadata, Viewport } from "next";
import { faSans, faMono, faSerif } from "@/lib/fonts";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { ArrowSymbol } from "@/components/web/ArrowSymbol";
import "@/styles/fa-tokeny.css";
import "@/styles/web.css";
import "@/styles/fonts.css";

export const metadata: Metadata = {
  title: {
    default: "FLY America - létání na Floridě s mentorem",
    template: "%s - FLY America",
  },
  description:
    "Létání s českými piloty na Floridě. Domovská základna Orlando North Airpark (FA83), Cessna 182 a mentor Honza Čermák.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: SITE_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#1D252D",
};

export default function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      // web.css má scroll-behavior: smooth. Atribut vrací chování Next 15,
      // kdy se při přechodu mezi stránkami skáče nahoru hned, ne plynule.
      data-scroll-behavior="smooth"
      className={`${faSans.variable} ${faMono.variable} ${faSerif.variable}`}
    >
      <body>
        <ArrowSymbol />
        {children}
      </body>
    </html>
  );
}
