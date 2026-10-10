import type { CSSProperties, ReactNode } from "react";
import type { Photo as PhotoData, PhotoName } from "@/data/photos";
import { Photo, resolvePhoto } from "@/components/web/Photo";
import { czechNbspText } from "@/lib/typography";

/** Dovětek popisku velkých fotek (_PRAVIDLA.md, část 5). */
export const PHOTO_CREDIT = "Foto: archiv FLY America";

/** sizes velké fotky podstránky (.page-photo) z modelu. */
export const PAGE_PHOTO_SIZES =
  "(max-width: 600px) calc(100vw - 32px), (max-width: 1248px) calc(100vw - 48px), 1152px";

export interface FigureProps {
  /** Fotka z modelu podle názvu (src/data/photos.ts), nebo vlastní data. */
  photo: PhotoName | PhotoData;
  /** sizes z modelu doslova, u velké fotky podstránky PAGE_PHOTO_SIZES. */
  sizes: string;
  /**
   * Třídy <figure> jako v modelu: "fig" (výchozí), "fig fig--43", "fig fig--34",
   * "page-photo", "page-photo pk-photo". Velkou fotku obalit do <div className="fa-wrap">.
   */
  className?: string;
  /** Styl <figure>, např. výřez velké fotky balíčku: { "--pos": "50% 62%" }. */
  style?: CSSProperties;
  /**
   * Viditelný popisek. Výchozí = alt (popisek z archivu) s pevnými mezerami.
   * Vlastní obsah (např. alt a za ním <span className="todo">[doplnit: …]</span>),
   * null = bez popisku.
   */
  caption?: ReactNode | null;
  /**
   * Na konec popisku „Foto: archiv FLY America“ (velké fotky). Za textový
   * popisek bez tečky na konci doplní tečku jako model („Everglades. Foto: …“).
   * Za vlastní popisek z prvků jen mezeru, tečku si stránka napíše sama.
   */
  credit?: boolean;
  /** První fotka na stránce: bez líného načítání, vysoká priorita. */
  priority?: boolean;
  /** Jiný alt než popisek z archivu. */
  alt?: string;
  /** Malý data URL náhled (fotky deníku z databáze). */
  blurDataURL?: string | null;
}

/** Fotka s popiskem (<figure> s <figcaption>) přes next/image. */
export function Figure({
  photo,
  sizes,
  className = "fig",
  style,
  caption,
  credit,
  priority,
  alt,
  blurDataURL,
}: FigureProps) {
  const data = resolvePhoto(photo);
  const text = caption === undefined ? czechNbspText(data.alt) : caption;
  let content: ReactNode = text;
  if (credit) {
    if (text === null || text === "") content = PHOTO_CREDIT;
    // Jako v modelu: „…scenérie. Foto: archiv…“, „Everglades. Foto: archiv…“.
    else if (typeof text === "string") content = `${text}${/[.!?…]$/.test(text) ? "" : "."} ${PHOTO_CREDIT}`;
    else content = <>{text} {PHOTO_CREDIT}</>;
  }
  return (
    <figure className={className} style={style}>
      <Photo photo={data} sizes={sizes} priority={priority} alt={alt} blurDataURL={blurDataURL} />
      {content !== null && content !== "" ? <figcaption>{content}</figcaption> : null}
    </figure>
  );
}
