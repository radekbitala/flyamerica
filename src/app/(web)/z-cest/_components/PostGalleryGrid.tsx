import type { PostGallery } from "@/lib/db/schema";
import { canOptimizeImage } from "@/lib/image-hosts";
import { czechNbspText } from "@/lib/typography";
import { GalleryLightbox, type LightboxPhoto } from "./GalleryLightbox";
import { PostImage } from "./PostImage";
import styles from "../z-cest.module.css";

/**
 * sizes náhledu v galerii přes celou šířku kontejneru (sekce Fotky z cesty
 * a široká galerie v textu, .read-wide): .gallery--nahledy má 4 sloupce
 * s mezerou 24 px, pod 961 px 3 a pod 601 px 2 sloupce s mezerou 16 px
 * (src/styles/pages/article.css). Kontejner je od 1200 px 1152 px.
 */
const SIZES_WIDE =
  "(max-width: 600px) calc((100vw - 48px) / 2), (max-width: 960px) calc((100vw - 80px) / 3), (max-width: 1199px) calc((100vw - 120px) / 4), 270px";
/** Široká galerie v článku s obsahem „V článku“ v levém okraji: od 1200 px jen sloupec textu a pravý okraj (916 px). */
const SIZES_WIDE_TOC =
  "(max-width: 600px) calc((100vw - 48px) / 2), (max-width: 960px) calc((100vw - 80px) / 3), (max-width: 1199px) calc((100vw - 120px) / 4), 211px";
/** sizes náhledu v galerii v šířce sloupce textu (galerie v citaci, sloupec nejvýš 680 px). */
const SIZES_PROSE =
  "(max-width: 600px) calc((100vw - 48px) / 2), (max-width: 727px) calc((100vw - 80px) / 3), (max-width: 960px) 216px, 152px";

/** Rozměr z jsonb: číslo, u starších dat případně text. */
function dimension(value: unknown): number | null {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Galerie článku (značka <p data-gallery="ID"></p>): mřížka náhledů 4 : 3
 * bez popisků (.gallery.gallery--nahledy, úprava 12 a rozhodnutí R7 z auditu
 * 13. 10. 2026), klik zvětší fotku. Popisek je doslova v okně zvětšení
 * (GalleryLightbox) a v alt: alt = item.alt, chybí-li, popisek
 * (GalleryItem v src/lib/db/schema.ts). Fotka bez obojího má jméno odkazu
 * z pořadí („Fotka 3“).
 * inProse: galerie uprostřed textu, wide: přímo v .prose je širší než text
 * (.read-wide, src/styles/pages/article.css), toc: článek má obsah v levém
 * okraji (široká galerie se od 1200 px rozšiřuje jen doprava).
 */
export function PostGalleryGrid({
  gallery,
  inProse = false,
  wide = false,
  toc = false,
}: {
  gallery: PostGallery;
  inProse?: boolean;
  wide?: boolean;
  toc?: boolean;
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

  const sizes = inProse && !wide ? SIZES_PROSE : wide && toc ? SIZES_WIDE_TOC : SIZES_WIDE;

  return (
    <GalleryLightbox
      photos={photos}
      className={inProse ? `gallery gallery--nahledy ${styles.inProse}${wide ? " read-wide" : ""}` : "gallery gallery--nahledy"}
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
              sizes={sizes}
              blurDataURL={photo.blur}
            />
          </a>
        </figure>
      ))}
    </GalleryLightbox>
  );
}
