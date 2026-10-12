import Link from "next/link";
import type { ReactNode } from "react";
import { SectionSign } from "@/components/web/SectionSign";

export interface CrumbsProps {
  /** Odkaz na sekci v polohové tabuli (.fa-loc): "/z-cest", "/letecke-vylety". */
  href: string;
  /** Název sekce: „Z cest“, „Letecké výlety“. */
  label: ReactNode;
  /** Aktuální stránka za tabulí: název výletu, krátký název článku. */
  current: ReactNode;
}

/**
 * Drobečky na detailu (výlet, destinace, článek): polohová tabule sekce
 * a název stránky s aria-current="page". Stránky sekcí drobečky nemají.
 */
export function Crumbs({ href, label, current }: CrumbsProps) {
  return (
    <nav className="crumbs" aria-label="Drobečková navigace">
      <Link className="fa-loc" href={href}>
        {label}
      </Link>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

export interface PageHeadProps {
  /**
   * Název sekce nad h1 na stránce sekce (Kam letět, Z cest, Váš mentor,
   * Kontakt) jako polohová tabule (SectionSign). S drobečky se nepoužívá,
   * tabule je pak v drobečcích. Je to jediná polohová tabule v prvním
   * záběru stránky (DESIGN.md, The One Location Sign Rule).
   */
  label?: ReactNode;
  /** Drobečky na detailu (výlet, destinace, článek). */
  crumbs?: CrumbsProps;
  /** Nadpis h1, doslova z modelu (s &nbsp;). Naše nadpisy bez tečky, tečka jen u claimů (R6). */
  title: ReactNode;
  /** Perex pod nadpisem. */
  perex?: ReactNode;
  /** Perex Honzova článku v serifu (class="perex perex--voice", R7). */
  perexVoice?: boolean;
  /** Další obsah záhlaví pod perexem: .dn-by (autor a datum), .kt-tel (telefon), .dn-photo-note. */
  children?: ReactNode;
}

/**
 * Záhlaví podstránky (.page-head) podle _sablona.html. Výlety mají vlastní
 * záhlaví .pk-head s panelem ceny, skládají si ho z Crumbs.
 */
export function PageHead({ label, crumbs, title, perex, perexVoice, children }: PageHeadProps) {
  return (
    <header className="page-head">
      <div className="fa-wrap">
        {crumbs ? <Crumbs {...crumbs} /> : label ? <SectionSign>{label}</SectionSign> : null}
        <h1>{title}</h1>
        {perex ? <p className={perexVoice ? "perex perex--voice" : "perex"}>{perex}</p> : null}
        {children}
      </div>
    </header>
  );
}
