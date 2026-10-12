import type { ReactNode } from "react";
import styles from "./SectionSign.module.css";

export interface SectionSignProps {
  /** Nápis tabule. Píše se normálně („Letecké výlety“), verzálky dělá CSS. */
  children: ReactNode;
  /**
   * Prvek: "p" (výchozí) nad nadpisem sekce nebo stránky, "h2" když tabule
   * sama je nadpisem sekce, "span" uvnitř řádku (bez vlastního řádku a mezery).
   */
  as?: "p" | "h2" | "span";
  /** id, třeba pro aria-labelledby sekce. */
  id?: string;
  /** Další třída pro umístění na stránce (CSS stránky v src/styles/pages). */
  className?: string;
}

/**
 * Polohová tabule (.fa-loc: grafit, žluté verzálky, žlutý rámeček) jako
 * označení sekce nebo stránky místo šedého štítku .lbl (rozhodnutí
 * 12. 10. 2026). Pravidlo v ../prototyp/DESIGN.md (The One Location Sign
 * Rule): v jednom záběru obrazovky nejvýš jedna polohová tabule, spolu
 * s logem a jednou výzvou nejvýš 3 tabulové prvky. Odkaz v drobečcích je
 * Crumbs (PageHead.tsx), ne SectionSign.
 */
export function SectionSign({ children, as: Tag = "p", id, className }: SectionSignProps) {
  const classes = ["fa-loc", Tag === "span" ? null : styles.block, className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} id={id}>
      {children}
    </Tag>
  );
}
