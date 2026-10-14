import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { ROUTES } from "@/lib/routes";
import { FA_PHONE, FA_PHONE_HREF } from "@/lib/site";
import { NBSP } from "@/lib/typography";

/**
 * Obsah stránky 404, společný pro global-not-found a not-found webu.
 * <main> dodává layout (web), v global-not-found stránka sama.
 *
 * Pod odkazem na úvod cesta k výletům a kontaktu a Honzův telefon jako na
 * chybové stránce ((web)/error.tsx), úprava 43 z auditu. Jen textové odkazy,
 * žádná směrová tabule: stránka nemá vlastní výzvu, tichá výzva Poptat termín
 * je v hlavičce. Styly v status.css (global-not-found načítá jen web.css,
 * fonts.css, status.css a site.css).
 */
export function NotFoundContent() {
  return (
    <header className="page-head status-page">
      <div className="fa-wrap">
        <span className="lbl">Chyba 404</span>
        <h1>Stránka nenalezena</h1>
        <p className="perex">Tahle adresa na webu není. Možná se změnila, nebo v&nbsp;ní je překlep.</p>
        <ul className="status-links">
          <li>
            <Link className="fa-link" href={ROUTES.home}>
              Na úvodní stránku <Arrow />
            </Link>
          </li>
          <li>
            <Link className="fa-link" href={ROUTES.trips}>
              Letecké výlety <Arrow />
            </Link>
          </li>
          <li>
            <Link className="fa-link" href={ROUTES.contact}>
              Kontakt <Arrow />
            </Link>
          </li>
        </ul>
        <p className="kt-tel">
          Spěcháte? Zavolejte Honzovi: <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", NBSP)}</a>
        </p>
      </div>
    </header>
  );
}
