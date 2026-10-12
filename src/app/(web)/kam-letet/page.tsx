import Link from "next/link";
import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { Photo } from "@/components/web/Photo";
import { DESTINATIONS, DESTINATION_SLUGS } from "@/data/destinations";
import { pageMetadata } from "@/lib/metadata";
import { ROUTES, destinationPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { DestinationRoute } from "./_components/DestinationBody";
import { LegacyAnchorRedirect } from "./_components/LegacyAnchorRedirect";

// Kam letět (dřív Tipy na výlety, prototyp/tipy-na-vylety.html): rozcestník
// osmi destinací ze src/data/destinations.ts, názvy, kódy letišť a výňatky
// tak, jak je Honza napsal (10. 10. 2026). Detail destinace má vlastní
// adresu /kam-letet/<slug>: po kliku na webu se otevře v okně nad
// rozcestníkem (slot @modal, zachycená adresa), bez JavaScriptu, po novém
// načtení nebo ze sdíleného odkazu je to celá stránka ([slug]/page.tsx).
// Dlouhé detaily pod přehledem už stránka nemá (rozhodnutí 12. 10. 2026).
export const metadata = pageMetadata({
  title: "Kam letět",
  description:
    "Kam letět z Orlanda podle Honzy Čermáka: Orlando North Airpark, Cedar Key, Albert Whitted, Vero Beach, Palatka, Kissimmee, Merritt Island, Key West a Everglades.",
  path: ROUTES.destinations,
});

/** sizes dlaždice (.grid-4: 4 / 2 sloupce, na mobilu náhled 112 px vlevo). */
const TILE_SIZES = "(max-width: 600px) 112px, (max-width: 1100px) 50vw, 270px";
/** Dlaždice v první řadě jsou hned pod záhlavím: bez líného načítání (v modelu bez loading="lazy"). */
const FIRST_ROW = 4;

export default function DestinationsPage() {
  return (
    <>
      {/* Záhlaví stránky sekce: polohová tabule „Kam letět“ nad h1, bez drobečků */}
      <PageHead
        label="Kam letět"
        title={<>Kam z&nbsp;Orlanda doletět</>}
        perex={<>Výběr destinací od Honzy: domovská základna Orlando North Airpark a&nbsp;sedm míst, kam se z&nbsp;ní dá letět. U&nbsp;každého najdete zajímavosti a&nbsp;důvod, proč tam letět.</>}
      />

      {/* Rozcestník: dlaždice s fotkou, názvem a trasou (kód letiště jen v Overpass Mono, kód s polem má až detail v okně).
          id položky = slug, na něj vedly kotvy dřívější stránky (/kam-letet#cedar-key). Bez skriptu kotva aspoň
          posune na dlaždici, se skriptem LegacyAnchorRedirect otevře detail. */}
      <section className="sec sec--tight tipy-prehled" aria-labelledby="destinace-nadpis">
        <div className="fa-wrap">
          <h2 className="vh" id="destinace-nadpis">
            Destinace
          </h2>
          <ul className="grid-4 kl-tiles">
            {DESTINATIONS.map((destination, index) => (
              <li key={destination.slug} id={destination.slug}>
                {/* scroll={false}: okno se otevře nad rozcestníkem a stránka pod ním se neposune nahoru */}
                <Link className="tip" href={destinationPath(destination.slug)} scroll={false}>
                  <div className="tip-img">
                    <Photo photo={destination.tile} sizes={TILE_SIZES} priority={index < FIRST_ROW} />
                  </div>
                  <h3>{czechNbspText(destination.name)}</h3>
                  <DestinationRoute destination={destination} />
                  <p>{czechNbspText(destination.teaser)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <LegacyAnchorRedirect slugs={DESTINATION_SLUGS} />
        </div>
      </section>

      {/* Výzva na konci stránky */}
      <CtaSection />
    </>
  );
}
