import type { Metadata } from "next";
import { faSans, faMono, faSerif } from "@/lib/fonts";
import { ArrowSymbol } from "@/components/web/ArrowSymbol";
import { NotFoundContent } from "@/components/web/NotFoundContent";
import "@/styles/fa-tokeny.css";
import "@/styles/web.css";
import "@/styles/fonts.css";

// Web a administrace mají každý svůj kořenový layout, takže pro adresu,
// která neodpovídá žádné stránce, není layout, do kterého by se 404
// vykreslila. Next proto vrací tuhle samostatnou stránku i s <html> a
// vlastními styly. Vypadá jako web, i pro neznámé adresy pod /admin.
export const metadata: Metadata = {
  title: "Stránka nenalezena - FLY America",
};

export default function GlobalNotFound() {
  return (
    <html
      lang="cs"
      className={`${faSans.variable} ${faMono.variable} ${faSerif.variable}`}
    >
      <body>
        <ArrowSymbol />
        <NotFoundContent />
      </body>
    </html>
  );
}
