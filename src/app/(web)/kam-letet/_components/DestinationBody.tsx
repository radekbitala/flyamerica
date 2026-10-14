import { Arrow } from "@/components/web/ArrowSymbol";
import { Figure } from "@/components/web/Figure";
import { HOME_BASE_CODE, type Destination } from "@/data/destinations";
import { destinationPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
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
 * [doplnit] s tím, co ještě chybí, a galerie s popisky z archivu.
 * Na celé stránce je první fotka galerie v prvním záběru největší prvek
 * (LCP), proto se načítá hned (priority). V okně se načítá líně.
 * Bez nadpisu: ten má celá stránka (h1 pod drobečky) i okno (h2 s kódem
 * letiště), obsah je jinak v obou stejný.
 */
export function DestinationBody({
  destination,
  variant,
}: {
  destination: Destination;
  variant: DestinationBodyVariant;
}) {
  const count = destination.gallery.length;
  const columns = count === 1 ? 1 : destination.galleryColumns;
  const galleryClass = ["gallery", "dest-gal", columns === 2 ? "dest-gal--2" : null, columns === 1 ? "dest-gal--1" : null]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <div className="dest-text">
        <div className="prose">
          <h3>Zajímavosti</h3>
          <p>{czechNbspText(destination.highlights)}</p>
          <h3>{czechNbspText(destination.whyHeading)}</h3>
          {destination.why.map((paragraph) => (
            <p key={paragraph}>{czechNbspText(paragraph)}</p>
          ))}
        </div>
        {destination.pilotTip ? (
          <div className="kl-tip">
            <h3>Tip pro piloty</h3>
            <p>{czechNbspText(destination.pilotTip)}</p>
          </div>
        ) : null}
        {destination.todo ? (
          <p className="dest-todo">
            <span className="todo">[doplnit: {czechNbspText(destination.todo)}]</span>
          </p>
        ) : null}
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
