import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";

/** Obsah stránky 404, společný pro global-not-found a not-found webu. */
export function NotFoundContent() {
  return (
    <main id="obsah">
      <header className="page-head">
        <div className="fa-wrap">
          <span className="lbl">Chyba 404</span>
          <h1>Stránka nenalezena</h1>
          <p className="perex">
            Tahle adresa na webu není. Možná se změnila, nebo v ní je překlep.
          </p>
          <p style={{ marginTop: 32 }}>
            <Link className="fa-link" href="/">
              Na úvodní stránku <Arrow />
            </Link>
          </p>
        </div>
      </header>
    </main>
  );
}
