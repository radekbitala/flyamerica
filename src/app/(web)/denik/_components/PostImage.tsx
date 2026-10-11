import Image from "next/image";
import type { CSSProperties } from "react";
import { canOptimizeImage } from "@/lib/image-hosts";

export interface PostImageProps {
  src: string;
  width?: number | null;
  height?: number | null;
  /** alt bez pevných mezer (atributy je nemají). */
  alt: string;
  sizes: string;
  /** První fotka na stránce: bez líného načítání, vysoká priorita (jako Photo). */
  priority?: boolean;
  /** Malý data URL náhled (titulní fotka, fotky galerií). */
  blurDataURL?: string | null;
  className?: string;
  style?: CSSProperties;
}

/**
 * Fotka článku z databáze (titulní, v textu, v galerii). S rozměry a z adresy,
 * kterou povoluje next.config.ts, jde přes next/image (AVIF a WebP, srcset).
 * Jinak obyčejný <img loading="lazy">: next/image by cizí adresu odmítl
 * a bez rozměrů neumí srcset.
 */
export function PostImage({ src, width, height, alt, sizes, priority, blurDataURL, className, style }: PostImageProps) {
  if (width && height && canOptimizeImage(src)) {
    return (
      <Image
        src={src}
        width={width}
        height={height}
        alt={alt}
        sizes={sizes}
        className={className}
        style={style}
        {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
        {...(blurDataURL?.startsWith("data:image/") ? { placeholder: "blur" as const, blurDataURL } : {})}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- adresa mimo images.remotePatterns nebo fotka bez rozměrů
    <img
      src={src}
      width={width ?? undefined}
      height={height ?? undefined}
      alt={alt}
      className={className}
      style={style}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
