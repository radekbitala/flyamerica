import Link from "next/link";
import type { ReactNode } from "react";

export interface CrumbsProps {
  /** Odkaz na sekci v polohové tabuli (.fa-loc): "/denik", "/#balicky". */
  href: string;
  /** Název sekce: „Deník“, „Balíčky“. */
  label: ReactNode;
  /** Aktuální stránka za tabulí: „Balíček 1“, krátký název článku. */
  current: ReactNode;
}

/**
 * Drobečky na detailu (balíček, článek deníku): polohová tabule sekce
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
  /** Štítek nad h1 na stránce sekce (Tipy, Deník, O Honzovi, Kontakt). S drobečky se nepoužívá. */
  label?: ReactNode;
  /** Drobečky na detailu (balíček, článek). */
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
 * Záhlaví podstránky (.page-head) podle _sablona.html. Balíčky mají vlastní
 * záhlaví .pk-head s panelem ceny, skládají si ho z Crumbs.
 */
export function PageHead({ label, crumbs, title, perex, perexVoice, children }: PageHeadProps) {
  return (
    <header className="page-head">
      <div className="fa-wrap">
        {crumbs ? <Crumbs {...crumbs} /> : label ? <span className="lbl">{label}</span> : null}
        <h1>{title}</h1>
        {perex ? <p className={perexVoice ? "perex perex--voice" : "perex"}>{perex}</p> : null}
        {children}
      </div>
    </header>
  );
}
