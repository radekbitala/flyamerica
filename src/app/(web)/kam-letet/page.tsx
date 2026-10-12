import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { Photo } from "@/components/web/Photo";
import { DESTINATIONS } from "@/data/destinations";
import { pageMetadata } from "@/lib/metadata";
import { ROUTES } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { DestinationBody, DestinationRoute } from "./_components/DestinationBody";

// Kam letět (dřív Tipy na výlety, prototyp/tipy-na-vylety.html). Destinace
// ze src/data/destinations.ts, texty doslova z Honzova „Výběru destinací kam
// letět“ (10. 10. 2026), názvy a kódy letišť tak, jak je Honza napsal.
// Zatím přehled dlaždic a pod ním všechny detaily. Kotvy destinací (#fa83,
// #cedar-key, ...) jsou slugy z destinations.ts. Detail destinace má i vlastní
// adresu /kam-letet/<slug> ([slug]/page.tsx).
export const metadata = pageMetadata({
  title: "Kam letět",
  description:
    "Kam letět z Orlanda podle Honzy Čermáka: Orlando North Airpark, Cedar Key, Albert Whitted, Vero Beach, Palatka, Kissimmee, Merritt Island, Key West a Everglades.",
  path: ROUTES.destinations,
});

/** sizes dlaždice v přehledu (.tipy-prehled: 4 / 2 sloupce, na mobilu náhled 112 px vlevo). */
const TILE_SIZES = "(max-width: 600px) 112px, (max-width: 1100px) 50vw, 270px";
/** Dlaždice v první řadě jsou hned pod záhlavím: bez líného načítání (v modelu bez loading="lazy"). */
const FIRST_ROW = 4;

export default function DestinationsPage() {
  return (
    <>
      {/* ===== ZÁHLAVÍ STRÁNKY (stránka sekce: bez drobečků) ===== */}
      <PageHead
        label="Kam letět"
        title={<>Kam z&nbsp;Orlanda doletět</>}
        perex={<>Výběr destinací od Honzy: domovská základna Orlando North Airpark a&nbsp;sedm míst, kam se z&nbsp;ní dá letět. U&nbsp;každého najdete zajímavosti a&nbsp;důvod, proč tam letět.</>}
      />

      {/* ===== PŘEHLED: dlaždice s proklikem na detail níže (kód letiště jen v trase, Overpass Mono) ===== */}
      <section className="sec sec--tight tipy-prehled" id="prehled" aria-labelledby="prehled-nadpis">
        <div className="fa-wrap">
          <h2 className="vh" id="prehled-nadpis">Přehled destinací</h2>
          <div className="grid-4">
            {DESTINATIONS.map((destination, index) => (
              <a key={destination.slug} className="tip" href={`#${destination.slug}`}>
                <div className="tip-img">
                  <Photo photo={destination.tile} sizes={TILE_SIZES} priority={index < FIRST_ROW} />
                </div>
                <h3>{czechNbspText(destination.name)}</h3>
                <DestinationRoute destination={destination} />
                <p>{czechNbspText(destination.teaser)}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DETAILY DESTINACÍ: kód s polem (.fa-code) jen v záhlaví detailu, sekce střídají Bílou a Papír ===== */}
      {DESTINATIONS.map((destination, index) => (
        <section
          key={destination.slug}
          className={index % 2 === 0 ? "sec sec--white dest" : "sec dest"}
          id={destination.slug}
          aria-labelledby={`${destination.slug}-nadpis`}
        >
          <div className="fa-wrap">
            <div className="dest-head">
              <span className="fa-code">{destination.code}</span>
              <h2 id={`${destination.slug}-nadpis`}>{czechNbspText(destination.name)}</h2>
            </div>
            <DestinationBody destination={destination} />
            <p className="dest-back"><a className="fa-link" href="#prehled">Zpět na přehled destinací</a></p>
          </div>
        </section>
      ))}

      {/* Výzva na konci stránky */}
      <CtaSection />
    </>
  );
}
