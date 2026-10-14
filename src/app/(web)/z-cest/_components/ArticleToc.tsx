"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "../z-cest.module.css";

export interface ArticleTocEntry {
  id: string;
  text: string;
}

/** Od této šířky stojí obsah v levém okraji vedle textu a je rozbalený (src/styles/pages/article.css). */
const MARGIN = "(min-width: 1200px)";

/**
 * Obsah článku „V článku“ (.dn-toc, .read-toc). Od 1200 px vždy rozbalený
 * a přilepený v levém okraji vedle textu (rozhodnutí 12. 10. 2026, model ho
 * měl vpravo), do 1199 px sbalený do jednoho řádku nad textem.
 *
 * Úprava 37 z auditu 13. 10. 2026: <details> je už v HTML ze serveru
 * zavřený a skript ho otevře jen od 1200 px. Na tabletu a telefonu se tak
 * po načtení nic nesbaluje a text pod obsahem neposkočí. Pod 1200 px je
 * to obyčejné <details>, rozbaluje se i bez skriptu. Od 1200 px je obsah
 * vidět už před spuštěním skriptu (::details-content v article.css,
 * prohlížeč bez jeho podpory ho ukáže až po otevření skriptem).
 *
 * Nález 19: v okraji není co rozbalovat, souhrn proto není v pořadí
 * tabulátoru a čtečka ho nehlásí jako tlačítko (aria-hidden), klik ho
 * nesbalí. Obsah vyšší než obrazovka se v okraji posouvá sám (styles.toc),
 * jinak by konec seznamu nešel při čtení otevřít.
 */
export function ArticleToc({ entries, footer }: { entries: ArticleTocEntry[]; footer?: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    const summary = details?.querySelector("summary");
    if (!details || !summary) return;

    const margin = window.matchMedia(MARGIN);
    // Při načtení se obsah jen otevře v okraji. Pod 1200 px zůstává, jak je
    // (zavřený z HTML, nebo ho čtenář před spuštěním skriptu už otevřel).
    // Při změně šířky okna se v okraji otevře a nad textem sbalí.
    const sync = (initial: boolean) => {
      if (margin.matches) details.open = true;
      else if (!initial) details.open = false;
      summary.tabIndex = margin.matches ? -1 : 0;
      if (margin.matches) summary.setAttribute("aria-hidden", "true");
      else summary.removeAttribute("aria-hidden");
    };
    const onChange = () => sync(false);
    const keepOpen = (e: MouseEvent) => {
      if (margin.matches) e.preventDefault();
    };

    sync(true);
    margin.addEventListener("change", onChange);
    summary.addEventListener("click", keepOpen);
    return () => {
      margin.removeEventListener("change", onChange);
      summary.removeEventListener("click", keepOpen);
    };
  }, []);

  return (
    <nav className={`dn-toc read-toc ${styles.toc}`} aria-labelledby="obsah-clanku">
      <details ref={detailsRef}>
        <summary>
          <span className="lbl" id="obsah-clanku">
            V&nbsp;článku
          </span>
        </summary>
        <ol>
          {entries.map((entry) => (
            <li key={entry.id}>
              <a href={`#${entry.id}`}>{entry.text}</a>
            </li>
          ))}
        </ol>
        {footer}
      </details>
    </nav>
  );
}
