import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";

/**
 * Obsah stránky 404, společný pro global-not-found a not-found webu.
 * <main> dodává layout (web), v global-not-found stránka sama.
 */
export function NotFoundContent() {
  return (
    <header className="page-head">
      <div className="fa-wrap">
        <span className="lbl">Chyba 404</span>
        <h1>Stránka nenalezena</h1>
        <p className="perex">Tahle adresa na webu není. Možná se změnila, nebo v&nbsp;ní je překlep.</p>
        <p style={{ marginTop: 32 }}>
          <Link className="fa-link" href="/">
            Na úvodní stránku <Arrow />
          </Link>
        </p>
      </div>
    </header>
  );
}
