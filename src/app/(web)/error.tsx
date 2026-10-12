"use client";

import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { FA_PHONE, FA_PHONE_HREF } from "@/lib/site";
import { NBSP } from "@/lib/typography";

/**
 * Chyba při vykreslení stránky webu (třeba výpadek databáze). Hlavička
 * a patička zůstávají z layoutu (web), chybu v layoutu samotném obsluhuje
 * src/app/global-error.tsx. Bez technických podrobností: Zkusit znovu,
 * odkaz na úvod a Honzův telefon. Podrobnosti chyby jsou v logu serveru.
 */
export default function WebError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <header className="page-head status-page">
      <div className="fa-wrap">
        <span className="lbl">Chyba</span>
        <h1>Stránku se nepodařilo načíst</h1>
        <p className="perex">Na webu se něco pokazilo. Zkuste to prosím znovu, případně za chvíli.</p>
        <div className="status-actions">
          <button className="fa-dir fa-dir--grafit" type="button" onClick={() => retry()}>
            <span className="t">Zkusit znovu</span>
            <Arrow />
          </button>
          <Link className="fa-link" href="/">
            Na úvodní stránku <Arrow />
          </Link>
        </div>
        <p className="kt-tel">
          Spěcháte? Zavolejte Honzovi: <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", NBSP)}</a>
        </p>
      </div>
    </header>
  );
}
