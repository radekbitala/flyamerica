"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { YouTubeThumbnail } from "@/lib/youtube-thumbnail";
import styles from "../z-cest.module.css";

export interface YouTubeVideoProps {
  /** Id videa z youtubeVideo() (src/lib/post-content.ts): jen A-Z, a-z, 0-9, _ a -. */
  id: string;
  /** Začátek videa v sekundách z adresy (?t=, ?start=), jinak null. */
  start: string | null;
  /** Video na YouTube (youtubeLink(), https://youtu.be/ID): odkaz pod náhledem a bez skriptu i náhled. */
  href: string;
  /** Popis přehrávače pro čtečky (title iframu), např. „Video k článku Druhý přelet Atlantiku“. */
  title: string;
  /** Náhled z i.ytimg.com, největší dostupný (youtubeThumbnail() na serveru, ArticleVideo). */
  thumbnail: YouTubeThumbnail;
}

/** sizes náhledu: video je v šířce sloupce textu (nejvýš 680 px). Náhled maxresdefault má 1280 px, hqdefault 480 px. */
const THUMB_SIZES = "(max-width: 600px) calc(100vw - 32px), 680px";

const subscribe = () => () => {};

/**
 * Video z YouTube v článku: náhled s tlačítkem „Přehrát video“, přehrávač až
 * po kliknutí (rozhodnutí Radka 12. 10. 2026).
 *
 * - Před kliknutím prohlížeč nic z Googlu nestahuje: náhled
 *   i.ytimg.com/vi/ID/<velikost>.jpg stahuje náš server přes next/image
 *   (images.remotePatterns v next.config.ts) a posílá ho z adresy webu.
 *   Velikost vybírá server (ArticleVideo, youtubeThumbnail()): největší, kterou
 *   video má, aby náhled na počítači a retině nebyl rozmazaný.
 * - Po kliknutí se na místě náhledu načte přehrávač z youtube-nocookie.com
 *   s autoplay (klik je gesto uživatele, prohlížeč přehrání dovolí) a fokus
 *   přejde do přehrávače.
 * - Bez skriptu je náhled odkaz na video na YouTube. Tlačítko se ukáže až po
 *   hydrataci (useSyncExternalStore: server a hydratace false, pak true).
 *   Pod náhledem je vždy odkaz „Video na YouTube“ (stejný text jako model).
 */
export function YouTubeVideo({ id, start, href, title, thumbnail }: YouTubeVideoProps) {
  const interactive = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  const thumb = (
    <Image src={thumbnail.src} width={thumbnail.width} height={thumbnail.height} alt="" sizes={THUMB_SIZES} />
  );
  const label = (
    <span className={styles.play}>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 13 15">
        <path d="M0 0v15l13-7.5z" />
      </svg>
      <span className="t">Přehrát video</span>
    </span>
  );

  let frame;
  if (playing) {
    const params = new URLSearchParams({ autoplay: "1" });
    if (start) params.set("start", start);
    frame = (
      <iframe
        ref={frameRef}
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  } else if (interactive) {
    frame = (
      <button type="button" className={styles.start} onClick={() => setPlaying(true)}>
        {thumb}
        {label}
      </button>
    );
  } else {
    // Bez skriptu: náhled vede na YouTube. Pro klávesnici a čtečky stačí odkaz pod náhledem.
    frame = (
      <a className={styles.start} href={href} tabIndex={-1} aria-hidden="true">
        {thumb}
        {label}
      </a>
    );
  }

  return (
    <figure className={`fig ${styles.video}`}>
      <div className={styles.frame}>{frame}</div>
      <figcaption>
        <a className="link-solo" href={href}>
          Video na YouTube
        </a>
      </figcaption>
    </figure>
  );
}
