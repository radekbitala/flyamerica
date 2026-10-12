import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { inquiryHref } from "@/components/web/nav";
import { FA_EMAIL, FA_PHONE, FA_PHONE_HREF } from "@/lib/site";

/**
 * Výzva k poptávce na konci stránky („Napište, kdy chcete letět.“), doslova
 * z modelu (úvod, Kam letět, Váš mentor, Z cest, články). Na Papíru, proto
 * grafitová směrová tabule se žlutou šipkou. Nadpis má id "poptat-nadpis",
 * na stránce smí být jen jednou. Výlety a kontakt ji nemají.
 */
export function CtaSection({ id }: { /** Kotva sekce, na úvodu "poptat". */ id?: string }) {
  return (
    <section className="sec sec--line" id={id} aria-labelledby="poptat-nadpis">
      <div className="fa-wrap ask">
        <div>
          <span className="lbl">Poptávka</span>
          <h2 id="poptat-nadpis">Napište, kdy chcete letět.</h2>
          <p>Odpoví vám přímo Honza. Poptávka má tři krátké kroky, termín a&nbsp;podrobnosti doladíte spolu.</p>
        </div>
        <div className="ask-side">
          <Link className="fa-dir fa-dir--grafit" href={inquiryHref()}>
            <span className="t">Poptat termín</span>
            <Arrow />
          </Link>
          <ul className="contact-list">
            <li>
              <span className="k">Telefon</span> <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", " ")}</a>
            </li>
            <li>
              <span className="k">E-mail</span> <a href={`mailto:${FA_EMAIL}`}>{FA_EMAIL}</a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
