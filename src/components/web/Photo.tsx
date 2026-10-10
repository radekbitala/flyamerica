import Image from "next/image";
import type { CSSProperties } from "react";
import { photos, type Photo as PhotoData, type PhotoName } from "@/data/photos";

export interface PhotoProps {
  /**
   * Fotka z modelu podle názvu (src/data/photos.ts, „cedar-key-letecky“),
   * nebo vlastní data (titulní fotka článku z databáze).
   */
  photo: PhotoName | PhotoData;
  /** sizes z modelu doslova (u každé fotky v HTML modelu). */
  sizes: string;
  /**
   * První fotka na stránce (v modelu bez loading="lazy", velká fotka
   * s fetchpriority="high"): načte se hned a s vysokou prioritou.
   */
  priority?: boolean;
  /** Jiný alt než popisek z archivu. alt nikdy nemá pevné mezery. */
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** Malý data URL náhled (fotky deníku z databáze), zobrazí se rozmazaný. */
  blurDataURL?: string | null;
}

/** Data fotky podle názvu nebo předaný objekt. */
export function resolvePhoto(photo: PhotoName | PhotoData): PhotoData {
  return typeof photo === "string" ? photos[photo] : photo;
}

/**
 * Fotka přes next/image (AVIF a WebP, srcset podle sizes). Pro fotky bez
 * popisku: dlaždice tipů, karty balíčků a článků, portrét Honzy (.who).
 * Fotka s popiskem je Figure.
 */
export function Photo({ photo, sizes, priority, alt, className, style, blurDataURL }: PhotoProps) {
  const data = resolvePhoto(photo);
  return (
    <Image
      src={data.src}
      width={data.width}
      height={data.height}
      alt={alt ?? data.alt}
      sizes={sizes}
      className={className}
      style={style}
      {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
      {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
    />
  );
}
