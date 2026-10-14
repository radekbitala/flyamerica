import Link from "next/link";
import { Fragment } from "react";
import { Arrow } from "@/components/web/ArrowSymbol";
import { Figure } from "@/components/web/Figure";
import { inquiryHref } from "@/components/web/nav";
import { HOME_BASE_CODE, type Destination } from "@/data/destinations";
import { TRIPS, type Trip } from "@/data/trips";
import { destinationPath, tripPath } from "@/lib/routes";
import { NBSP, czechNbspText } from "@/lib/typography";
import type { DestinationNavItem } from "./destination-nav";

/** Kde se detail ukazuje: celá stránka /kam-letet/<slug>, nebo okno nad stránkou (@modal). */
export type DestinationBodyVariant = "page" | "dialog";

/**
 * sizes fotek galerie podle šířek v destinations.css: na stránce je galerie
 * široká jako obsah stránky (1152 px, širší než text), v okně jako vnitřek
 * okna (824 px). Jedna fotka má nejvýš 370 px, jsou to fotky 580 px z roku
 * 2010 a next/image je nezvětšuje.
 */
const GALLERY_SIZES: Record<DestinationBodyVariant, Record<1 | 2 | 3, string>> = {
  page: {
    1: "(max-width: 600px) calc(100vw - 32px), 370px",
    2: "(max-width: 600px) calc(100vw - 32px), (max-width: 1248px) calc((100vw - 72px) / 2), 564px",
    3: "(max-width: 600px) calc(100vw - 32px), (max-width: 1248px) calc((100vw - 96px) / 3), 368px",
  },
  dialog: {
    1: "(max-width: 600px) calc(100vw - 32px), 370px",
    2: "(max-width: 600px) calc(100vw - 32px), (max-width: 968px) calc((100vw - 168px) / 2), 400px",
    3: "(max-width: 600px) calc(100vw - 32px), (max-width: 968px) calc((100vw - 176px) / 3), 260px",
  },
};

/**
 * Text destinace doslova od Honzy (Zajímavosti a Proč je dobré tam letět
 * v .prose), pod ním krátký blok Tip pro piloty (Honzův text, menší písmo,
 * štítek místo nadpisu, bez žluté plochy a bez polohové tabule), řádek
 * s výlety a odkazem Poptat termín (DestinationTrips) a galerie s popisky
 * z archivu. Co od Honzy ještě chybí (pole todo), se na webu neukazuje
 * (úprava 7 z auditu, 14. 10. 2026): FA83 je bez tipu, Palatka bez galerie.
 * Na celé stránce je první fotka galerie v prvním záběru největší prvek
 * (LCP), proto se načítá hned (priority). V okně se načítá líně.
 * Bez nadpisu destinace: ten má celá stránka (h1 pod drobečky) i okno (h2
 * s kódem letiště), obsah je jinak v obou stejný. Mezititulky jsou proto
 * na celé stránce h2 a v okně h3 (úprava 35), vzhled je v obou stejný
 * (destinations.css).
 */
export function DestinationBody({
  destination,
  variant,
}: {
  destination: Destination;
  variant: DestinationBodyVariant;
}) {
  const Heading = variant === "page" ? "h2" : "h3";
  const count = destination.gallery.length;
  const columns = count === 1 ? 1 : destination.galleryColumns;
  const galleryClass = ["gallery", "dest-gal", columns === 2 ? "dest-gal--2" : null, columns === 1 ? "dest-gal--1" : null]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <div className="dest-text">
        <div className="prose">
          <Heading>Zajímavosti</Heading>
          <p>{czechNbspText(destination.highlights)}</p>
          <Heading>{czechNbspText(destination.whyHeading)}</Heading>
          {destination.why.map((paragraph) => (
            <p key={paragraph}>{czechNbspText(paragraph)}</p>
          ))}
        </div>
        {destination.pilotTip ? (
          <div className="kl-tip">
            <Heading>Tip pro piloty</Heading>
            <p>{czechNbspText(destination.pilotTip)}</p>
          </div>
        ) : null}
        <DestinationTrips destination={destination} />
      </div>
      {count > 0 ? (
        <div className={galleryClass}>
          {destination.gallery.map((photo, index) => (
            <Figure
              key={photo}
              photo={photo}
              sizes={GALLERY_SIZES[variant][columns]}
              priority={variant === "page" && index === 0}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

/**
 * Výlety, na kterých se do destinace letí: výlety, které ji mají v poli
 * destinations (src/data/trips.ts, Honza ji jmenuje v textu výletu),
 * v pořadí výletů. Domovská základna (FA83) patří ke všem výletům.
 */
function destinationTrips(destination: Destination): Trip[] {
  const trips = destination.home ? TRIPS : TRIPS.filter((trip) => trip.destinations.includes(destination.slug));
  return [...trips].sort((a, b) => a.order - b.order);
}

/**
 * Řádek pod textem destinace (úprava 11 z auditu, 14. 10. 2026): na kterých
 * výletech se sem letí, s odkazy na výlety, a textový odkaz Poptat termín.
 * Náš text (Overpass), bez polohové tabule a bez žluté výzvy: v okně je
 * jediný tabulový prvek kód letiště, na celé stránce drobečky. U destinace
 * jen jednoho výletu poptávka předvyplní výlet. Vero Beach, Palatka,
 * Kissimmee a Merritt Island nejsou v textech výletů a mají jen Poptat
 * termín, dokud Honza neřekne, jestli se tam dá letět po domluvě
 * (../design/audit-2026-10-13/BACKLOG-po-spusteni.md).
 *
 * Odkazy jsou next/link: z okna se cílová stránka otevře měkkou navigací,
 * okno se samo zavře (DestinationDialog se ukazuje jen na /kam-letet/<slug>)
 * a Zpět v prohlížeči vrátí okno nad stránku, ze které se otevřelo.
 */
function DestinationTrips({ destination }: { destination: Destination }) {
  const trips = destinationTrips(destination);
  // „obou“: výlety jsou dva (TRIPS), FA83 je domovská základna obou.
  const lead = destination.home
    ? "Domovská základna obou výletů:"
    : trips.length === 1
      ? "Letíte sem na výletu"
      : "Letíte sem na výletech";
  return (
    <div className="kl-trips">
      {trips.length > 0 ? (
        <p className="kl-trips-text">
          {lead}{" "}
          {trips.map((trip, index) => (
            <Fragment key={trip.slug}>
              {index === 0 ? null : index === trips.length - 1 ? ` a${NBSP}` : ", "}
              <Link href={tripPath(trip.slug)}>{czechNbspText(trip.name)}</Link>
            </Fragment>
          ))}
        </p>
      ) : null}
      <p className="kl-trips-ask">
        <Link className="fa-link" href={inquiryHref(trips.length === 1 ? trips[0].slug : null)}>
          Poptat termín <Arrow />
        </Link>
      </p>
    </div>
  );
}

/** Trasa z domovské základny v Overpass Mono (.route): „FA83 → KCDK“, u FA83 jen kód. */
export function DestinationRoute({
  destination,
  as: Tag = "div",
  className,
}: {
  destination: Destination;
  as?: "div" | "p";
  className?: string;
}) {
  return (
    <Tag className={className ? `route ${className}` : "route"}>
      {destination.home ? (
        destination.code
      ) : (
        <>
          {HOME_BASE_CODE} <Arrow /> {destination.code}
        </>
      )}
    </Tag>
  );
}

/**
 * Předchozí a další destinace pod textem celé stránky. Obyčejné odkazy <a>,
 * ne next/link: měkká navigace na /kam-letet/<slug> by se zachytila do okna
 * (@modal) nad touhle stránkou. Celá stránka je pro přímý příchod
 * (sdílený odkaz, vyhledávač), tam je načtení další celé stránky správně.
 * Okno má vlastní přepínání v liště (DestinationDialog).
 */
export function DestinationPager({ prev, next }: { prev: DestinationNavItem; next: DestinationNavItem }) {
  return (
    <nav className="kl-pager" aria-label="Předchozí a další destinace">
      <a className="kl-pager-link kl-pager-prev" href={destinationPath(prev.slug)}>
        <span className="kl-pager-dir">
          <Arrow /> Předchozí destinace
        </span>
        <span className="kl-pager-name">{czechNbspText(prev.name)}</span>
      </a>
      <a className="kl-pager-link kl-pager-next" href={destinationPath(next.slug)}>
        <span className="kl-pager-dir">
          Další destinace <Arrow />
        </span>
        <span className="kl-pager-name">{czechNbspText(next.name)}</span>
      </a>
    </nav>
  );
}
