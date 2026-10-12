import { Arrow } from "@/components/web/ArrowSymbol";
import { Figure } from "@/components/web/Figure";
import { HOME_BASE_CODE, type Destination } from "@/data/destinations";
import { czechNbspText } from "@/lib/typography";

/** sizes fotky v galerii destinace na 3 sloupce (.dest-gal). Fotky jen 580 px (2010) next/image nezvětší. */
const GALLERY_SIZES = "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 370px";
/** sizes fotky v galerii destinace na 2 sloupce (.dest-gal--2). */
const GALLERY_2_SIZES = "(max-width: 600px) 100vw, 50vw";

/**
 * Text destinace doslova od Honzy (Zajímavosti a Proč je dobré tam letět
 * v .prose), řádek [doplnit] a galerie. Bez nadpisu: ten má stránka Kam
 * letět (h2 s kódem), detail /kam-letet/<slug> (h1) i okno s detailem.
 */
export function DestinationBody({ destination }: { destination: Destination }) {
  const two = destination.galleryColumns === 2;
  return (
    <>
      <div className="prose">
        <h3>Zajímavosti</h3>
        <p>{czechNbspText(destination.highlights)}</p>
        <h3>{czechNbspText(destination.whyHeading)}</h3>
        <p>{czechNbspText(destination.why)}</p>
      </div>
      <p className="dest-todo">
        <span className="todo">[doplnit: {czechNbspText(destination.todo)}]</span>
      </p>
      {destination.gallery.length > 0 ? (
        <div className={two ? "gallery dest-gal dest-gal--2" : "gallery dest-gal"}>
          {destination.gallery.map((photo) => (
            <Figure key={photo} photo={photo} sizes={two ? GALLERY_2_SIZES : GALLERY_SIZES} />
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Trasa z domovské základny v Overpass Mono (.route): „FA83 → KCDK“, u FA83 jen kód. */
export function DestinationRoute({ destination, as: Tag = "div" }: { destination: Destination; as?: "div" | "p" }) {
  return (
    <Tag className="route">
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
