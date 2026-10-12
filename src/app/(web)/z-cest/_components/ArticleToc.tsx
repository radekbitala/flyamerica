"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "../z-cest.module.css";

export interface ArticleTocEntry {
  id: string;
  text: string;
}

/**
 * Obsah článku „V článku“ (.dn-toc) jako v modelu (prototyp/js/web.js, část 4):
 * na počítači vždy rozbalený a vedle textu (sticky z web.css), na mobilu
 * (do 960 px) sbalený do jednoho řádku nad textem.
 *
 * Nález 19: na počítači není co rozbalovat, souhrn proto není v pořadí
 * tabulátoru a čtečka ho nehlásí jako tlačítko (aria-hidden), klik ho
 * nesbalí. Bez skriptu je obsah rozbalený všude. Obsah vyšší než obrazovka
 * se na počítači posouvá sám (styles.toc), jinak by konec seznamu nešel
 * při čtení otevřít.
 */
export function ArticleToc({ entries, footer }: { entries: ArticleTocEntry[]; footer?: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    const summary = details?.querySelector("summary");
    if (!details || !summary) return;

    const mobile = window.matchMedia("(max-width: 960px)");
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
    <nav className={`aside dn-toc ${styles.toc}`} aria-labelledby="obsah-clanku">
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
