import Link from "next/link";
import { MobileMenu } from "@/components/web/MobileMenu";

/**
 * Hlavička webu, stejná na všech stránkách (je v layoutu (web), stránky ji
 * nevkládají). Logo, menu, tichá výzva „Poptat termín“ a mobilní menu.
 * Menu s aria-current podle cesty a chování výzvy jsou v MobileMenu.
 */
export function SiteHeader() {
  return (
    <header className="hdr">
      <MobileMenu logo={<SiteLogo />} />
    </header>
  );
}

/**
 * Logo z předávací sady (design/predavaci-sada/logo, kopie v public/logo),
 * AMERICA v křivkách, bez písma. Pixelové soubory se zobrazují přesně ve své
 * velikosti: 226 x 32 na počítači, pod 601 px 167 x 24. Proto <picture>
 * s obyčejným <img>, next/image by SVG jen zbytečně obaloval.
 */
function SiteLogo() {
  return (
    <Link className="fa-logo" href="/">
      <picture>
        <source media="(max-width: 600px)" srcSet="/logo/logo-px-24-tmave.svg" width={167} height={24} />
        <img src="/logo/logo-px-32-tmave.svg" width={226} height={32} alt="FLY America, úvod" />
      </picture>
    </Link>
  );
}
