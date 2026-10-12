"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "../z-cest.module.css";

export interface ArticleTocEntry {
  id: string;
  text: string;
}

/** Do této šířky je obsah sbalený nad textem, od 1200 px v levém okraji (src/styles/pages/article.css). */
const COLLAPSED = "(max-width: 1199px)";

/**
 * Obsah článku „V článku“ (.dn-toc, .read-toc). Od 1200 px vždy rozbalený
 * a přilepený v levém okraji vedle textu (rozhodnutí 12. 10. 2026, model ho
 * měl vpravo), do 1199 px sbalený do jednoho řádku nad textem.
 *
 * Nález 19: v okraji není co rozbalovat, souhrn proto není v pořadí
 * tabulátoru a čtečka ho nehlásí jako tlačítko (aria-hidden), klik ho
 * nesbalí. Bez skriptu je obsah rozbalený všude. Obsah vyšší než obrazovka
 * se v okraji posouvá sám (styles.toc), jinak by konec seznamu nešel
 * při čtení otevřít.
 */
export function ArticleToc({ entries, footer }: { entries: ArticleTocEntry[]; footer?: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    const summary = details?.querySelector("summary");
    if (!details || !summary) return;

    const mobile = window.matchMedia(COLLAPSED);
    const sync = () => {
      details.open = !mobile.matches;
      summary.tabIndex = mobile.matches ? 0 : -1;
      if (mobile.matches) summary.removeAttribute("aria-hidden");
      else summary.setAttribute("aria-hidden", "true");
    };
    const keepOpen = (e: MouseEvent) => {
      if (!mobile.matches) e.preventDefault();
    };

    sync();
    mobile.addEventListener("change", sync);
    summary.addEventListener("click", keepOpen);
    return () => {
      mobile.removeEventListener("change", sync);
      summary.removeEventListener("click", keepOpen);
    };
  }, []);

  return (
    <nav className={`dn-toc read-toc ${styles.toc}`} aria-labelledby="obsah-clanku">
      <details open ref={detailsRef}>
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
