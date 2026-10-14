import type { Metadata } from "next";
import { webFontVariables } from "@/lib/fonts";
import { SITE_ROBOTS } from "@/lib/metadata";
import { THEME_COLOR } from "@/lib/site";
import { ArrowSymbol } from "@/components/web/ArrowSymbol";
import { NotFoundContent } from "@/components/web/NotFoundContent";
import { SiteHeader } from "@/components/web/SiteHeader";
import { SiteFooter } from "@/components/web/SiteFooter";
import "@/styles/fa-tokeny.css";
import "@/styles/web.css";
import "@/styles/fonts.css";
import "@/styles/pages/status.css";
import "@/styles/pages/site.css";

// Web a administrace mají každý svůj kořenový layout, takže pro adresu,
// která neodpovídá žádné stránce, není layout, do kterého by se 404
// vykreslila. Next proto vrací tuhle samostatnou stránku i s <html> a
// vlastními styly. Vypadá jako web (hlavička a patička jako v layoutu (web)),
// i pro neznámé adresy pod /admin.
export const metadata: Metadata = {
  title: "Stránka nenalezena - FLY America",
  // Stejně jako layout webu: do spuštění noindex, nofollow (ALLOW_INDEXING).
  robots: SITE_ROBOTS,
};

export const viewport = {
  themeColor: THEME_COLOR,
};

export default function GlobalNotFound() {
  return (
    <html lang="cs" className={webFontVariables}>
      <body>
        <ArrowSymbol />
        <a className="skip" href="#obsah">
          Přeskočit na obsah
        </a>
        <SiteHeader />
        <main id="obsah">
          <NotFoundContent />
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
