import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { Photo } from "@/components/web/Photo";
import { ROUTES } from "@/lib/routes";

/**
 * Malý portrét Honzy se jménem, rolí a odkazem „Kdo je Honza“ (.who, nález 1).
 * Na výletech v panelu Poptávka (úvod má od 12. 10. 2026 v „Co za vás
 * zařídíme“ místo něj velkou fotku Honzy). Bez tabule.
 * Portrét se zobrazuje 60 x 80 px, sizes vybere náhled 128 px místo
 * celého souboru 240 px (model ho vkládá bez srcset).
 */
export function HonzaWho() {
  return (
    <p className="who">
      <Photo photo="honza-portret" sizes="60px" />
      <span>
        <HonzaIntro />
      </span>
    </p>
  );
}

/**
 * Jméno, role a odkaz na Váš mentor (15. 10. 2026, Radek: u fotky nebylo
 * jasné, kdo Honza je a proč tam je). Stejně u malého portrétu (HonzaWho)
 * i pod velkou fotkou v „Co za vás zařídíme“ na úvodu, tam uvnitř
 * figcaption. Role je řádek pod jménem v Šedé 600 (.who-role v site.css),
 * slova jen z textů webu: „Váš mentor“ (menu) a „mentor v kabině“ (úvod,
 * výlety). Nikdy „instruktor“. Čtečka přečte jméno, roli a pak odkaz.
 */
export function HonzaIntro() {
  return (
    <>
      <span className="who-name">Honza Čermák</span>
      <span className="who-role">Váš mentor v&nbsp;kabině</span>
      <Link className="fa-link" href={ROUTES.mentor}>
        Kdo je Honza <Arrow />
      </Link>
    </>
  );
}
