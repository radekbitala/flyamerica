import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { Photo } from "@/components/web/Photo";
import { ROUTES } from "@/lib/routes";

/**
 * Malý portrét Honzy se jménem a odkazem „Kdo je Honza“ (.who, nález 1).
 * Na úvodu u položky mentora, na výletech v panelu Poptávka. Bez tabule.
 * Portrét se zobrazuje 60 x 80 px, sizes vybere náhled 128 px místo
 * celého souboru 240 px (model ho vkládá bez srcset).
 */
export function HonzaWho() {
  return (
    <p className="who">
      <Photo photo="honza-portret" sizes="60px" />
      <span>
        <span className="who-name">Honza Čermák</span>
        <Link className="fa-link" href={ROUTES.mentor}>
          Kdo je Honza <Arrow />
        </Link>
      </span>
    </p>
  );
}
