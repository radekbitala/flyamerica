import type { ReactNode } from "react";
import { DestinationDialog } from "@/app/(web)/kam-letet/_components/DestinationDialog";
import { DESTINATIONS } from "@/data/destinations";

/**
 * Zachycená cesta /kam-letet/<slug> ve slotu @modal: detail destinace
 * v okně nad stránkou, ze které návštěvník klikl (měkká navigace). (.) je
 * podle segmentů adresy, slot @modal ani skupina (web) se nepočítají, takže
 * se zachytí proklik z kterékoli stránky webu. Nové načtení, sdílený odkaz
 * nebo prohlížeč bez JavaScriptu dostanou celou stránku
 * src/app/(web)/kam-letet/[slug]/page.tsx.
 *
 * Okno je v layoutu, ne ve stránce [slug]: layout při přepnutí na jinou
 * destinaci zůstává, okno se nezavře a neotevře znovu a fokus zůstane na
 * Předchozí / Další.
 */
export default function DestinationModalLayout({ children }: { children: ReactNode }) {
  // Do prohlížeče jen slug a krátký název, texty destinací posílá stránka [slug].
  const items = DESTINATIONS.map(({ slug, shortName }) => ({ slug, name: shortName }));
  return <DestinationDialog items={items}>{children}</DestinationDialog>;
}
