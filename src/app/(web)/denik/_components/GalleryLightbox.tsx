"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import { Arrow } from "@/components/web/ArrowSymbol";
import styles from "../denik.module.css";

/** Fotka galerie pro zvětšení. Data připraví server (PostGallery). */
export interface LightboxPhoto {
  src: string;
  width: number | null;
  height: number | null;
  /** alt bez pevných mezer. */
  alt: string;
  /** Viditelný popisek s pevnými mezerami, prázdný = bez popisku. */
  caption: string;
  blur: string | null;
  /** Smí přes next/image. Rozhoduje server, SUPABASE_URL v prohlížeči není. */
  optimize: boolean;
}

/** Přejetí prstem aspoň o tolik (px) a víc do strany než svisle = další fotka. */
const SWIPE_MIN = 50;

/**
 * Mřížka galerie (.gallery z modelu) se zvětšením fotky. Model zvětšení nemá,
 * je udělané střídmě v duchu systému: celá obrazovka v Grafitu, fotka,
 * popisek, pořadí, Předchozí / Další jako textové odkazy se šipkou.
 *
 * - Fotky v mřížce vykreslí server jako odkazy <a data-photo="i" href="fotka">.
 *   Bez skriptu odkaz otevře samotnou fotku, se skriptem zvětšení.
 *   Klik s Ctrl, Cmd nebo Shift nechá prohlížeč otevřít fotku v nové kartě.
 * - Nativní <dialog> přes showModal(): fokus zůstává uvnitř, zbytek stránky
 *   je pro čtečky i klávesnici nedostupný, Escape zavře.
 * - Šipky vlevo a vpravo a přejetí prstem listují (dokola), klik mimo fotku
 *   zavře. Po zavření se fokus vrátí na fotku v mřížce, na které uživatel
 *   skončil.
 */
export function GalleryLightbox({
  photos,
  className,
  children,
}: {
  photos: LightboxPhoto[];
  className: string;
  children: ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const count = photos.length;
  const isOpen = index !== null;

  // Dialog se otevře až s vykreslenou fotkou, showModal() pak dá fokus na
  // první tlačítko (Zavřít). Stránka pod ním se mezitím neposouvá.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [isOpen]);

  const go = (step: number) => setIndex((i) => (i === null ? null : (i + step + count) % count));
  const close = () => dialogRef.current?.close();

  const onGridClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-photo]");
    if (!link || !e.currentTarget.contains(link)) return;
    const i = Number(link.dataset.photo);
    if (!Number.isInteger(i) || i < 0 || i >= count) return;
    e.preventDefault();
    setIndex(i);
  };

  // Událost close přijde po zavření (Escape, Zavřít, klik mimo fotku), až po
  // tom, co prohlížeč vrátil fokus. Fokus jde na fotku, která byla vidět naposledy.
  const onClose = () => {
    const last = index;
    setIndex(null);
    if (last !== null) gridRef.current?.querySelector<HTMLAnchorElement>(`a[data-photo="${last}"]`)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (count < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  // Fotka vyplňuje celou plochu (object-fit: contain), takže klik na tmavý
  // okraj vedle ní trefí <img>, ne plochu. Zavře se, když bod kliku leží
  // mimo skutečně vykreslenou fotku.
  const onStageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      close();
      return;
    }
    if (e.target instanceof HTMLImageElement && isOutsidePhoto(e.target, e.clientX, e.clientY)) close();
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStart.current = touch && e.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || count < 2) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const current = index ?? 0;
  const photo = isOpen ? photos[current] : null;

  return (
    <>
      <div ref={gridRef} className={className} onClick={onGridClick}>
        {children}
      </div>
      <dialog
        ref={dialogRef}
        className={`${styles.lightbox} on-dark`}
        aria-label={`Fotka ${current + 1} z ${count}`}
        onClose={onClose}
        onKeyDown={onKeyDown}
      >
        {photo ? (
          <>
            <div className={styles.bar}>
              <span className={styles.count} aria-hidden="true">
                {current + 1} / {count}
              </span>
              <button type="button" className={styles.close} onClick={close}>
                Zavřít
              </button>
            </div>
            <div className={styles.stage} onClick={onStageClick} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <LightboxImage key={photo.src} photo={photo} />
            </div>
            <div className={styles.foot}>
              <p className={styles.caption} aria-live="polite">
                <span className="vh">
                  Fotka {current + 1} z {count}.{" "}
                </span>
                {photo.caption}
              </p>
              {count > 1 ? (
                <div className={styles.nav}>
                  <button type="button" className={`fa-link ${styles.btn} ${styles.prev}`} onClick={() => go(-1)}>
                    <Arrow /> Předchozí
                  </button>
                  <button type="button" className={`fa-link ${styles.btn}`} onClick={() => go(1)}>
                    Další <Arrow />
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}

/**
 * Leží bod mimo fotku vykreslenou v <img> přes object-fit: contain? Fotka je
 * v rámečku prvku vycentrovaná (object-position 50 % 50 %) a zmenšená tak,
 * aby se celá vešla. Bez známých rozměrů fotky se nezavírá nic.
 */
function isOutsidePhoto(img: HTMLImageElement, x: number, y: number): boolean {
  const width = img.naturalWidth || Number(img.getAttribute("width")) || 0;
  const height = img.naturalHeight || Number(img.getAttribute("height")) || 0;
  if (!width || !height) return false;
  const box = img.getBoundingClientRect();
  const scale = Math.min(box.width / width, box.height / height);
  const w = width * scale;
  const h = height * scale;
  const left = box.left + (box.width - w) / 2;
  const top = box.top + (box.height - h) / 2;
  return x < left || x > left + w || y < top || y > top + h;
}

/**
 * Zvětšená fotka: vejde se na obrazovku (object-fit: contain), nikdy není
 * větší než soubor, takže malé fotky z roku 2010 se nerozmazávají.
 */
function LightboxImage({ photo }: { photo: LightboxPhoto }) {
  const style: CSSProperties = {
    objectFit: "contain",
    ...(photo.width ? { maxWidth: `${photo.width}px` } : {}),
    ...(photo.height ? { maxHeight: `${photo.height}px` } : {}),
  };
  if (photo.optimize && photo.width && photo.height) {
    return (
      <Image
        src={photo.src}
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        sizes="100vw"
        className={styles.photo}
        style={style}
        loading="eager"
        {...(photo.blur?.startsWith("data:image/") ? { placeholder: "blur" as const, blurDataURL: photo.blur } : {})}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- adresa mimo images.remotePatterns nebo fotka bez rozměrů
  return <img src={photo.src} alt={photo.alt} className={styles.photo} style={style} decoding="async" />;
}
