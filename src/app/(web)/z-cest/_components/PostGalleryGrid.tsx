import type { PostGallery } from "@/lib/db/schema";
import { canOptimizeImage } from "@/lib/image-hosts";
import { czechNbspText } from "@/lib/typography";
import { GalleryLightbox, type LightboxPhoto } from "./GalleryLightbox";
import { PostImage } from "./PostImage";
import styles from "../z-cest.module.css";

/**
 * sizes fotky v galerii přes celou šířku kontejneru (sekce Fotky a široká
 * galerie v textu, .read-wide): 3 / 2 / 1 sloupec .gallery.
 */
const SIZES_WIDE =
  "(max-width: 600px) calc(100vw - 32px), (max-width: 960px) calc(50vw - 36px), (max-width: 1248px) calc(33.3vw - 32px), 368px";
/** sizes fotky v galerii v šířce sloupce textu (galerie v citaci): 3 sloupce v 680 px. */
const SIZES_PROSE = "(max-width: 600px) calc(100vw - 32px), (max-width: 960px) calc(50vw - 36px), 220px";

/** Rozměr z jsonb: číslo, u starších dat případně text. */
function dimension(value: unknown): number | null {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Galerie článku (značka <p data-gallery="ID"></p>): mřížka .gallery z modelu,
 * fotky přes next/image s popiskem pod fotkou, klik zvětší fotku.
 * alt = item.alt, chybí-li, popisek (GalleryItem v src/lib/db/schema.ts).
 * inProse: galerie uprostřed textu, wide: přímo v .prose je širší než text
 * (.read-wide, src/styles/pages/article.css).
 */
export function PostGalleryGrid({
  gallery,
  inProse = false,
  wide = false,
}: {
  gallery: PostGallery;
  inProse?: boolean;
  wide?: boolean;
}) {
  const photos: LightboxPhoto[] = gallery.items.map((item) => {
    const width = dimension(item.width);
    const height = dimension(item.height);
    const caption = (item.caption ?? "").trim();
    return {
      src: item.url,
      width,
      height,
      alt: (item.alt ?? "").trim() || caption,
      caption: czechNbspText(caption),
      blur: item.blur ?? null,
      optimize: Boolean(width && height) && canOptimizeImage(item.url),
    };
  });

  return (
    <GalleryLightbox
      photos={photos}
      className={inProse ? `gallery ${styles.inProse}${wide ? " read-wide" : ""}` : "gallery"}
    >
      {photos.map((photo, i) => (
        <figure className="fig" key={`${i}-${photo.src}`}>
          <a
            className={styles.zoom}
            href={photo.src}
            data-photo={i}
            aria-haspopup="dialog"
            // Fotka bez popisku i bez alt (část galerií ze starého webu) má jméno odkazu z pořadí.
            {...(photo.alt ? {} : { "aria-label": `Fotka ${i + 1}` })}
          >
            <PostImage
              src={photo.src}
              width={photo.width}
              height={photo.height}
              alt={photo.alt}
              sizes={inProse && !wide ? SIZES_PROSE : SIZES_WIDE}
              blurDataURL={photo.blur}
            />
          </a>
          {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
        </figure>
      ))}
    </GalleryLightbox>
  );
}
