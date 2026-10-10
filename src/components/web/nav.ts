import type { PackageSlug } from "@/lib/inquiries/options";

/**
 * Menu webu (hlavička na počítači, mobilní menu, patička) a adresy výzev.
 * Adresy jsou bez .html, viz README (Veřejný web).
 */

export interface NavItem {
  href: string;
  label: string;
  /**
   * aria-current podle cesty: "page" na stránce sekce, "true" na detailu
   * v sekci (_PRAVIDLA.md, část 2). undefined = položka není aktivní.
   */
  current: (pathname: string) => "page" | "true" | undefined;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/#balicky",
    label: "Balíčky",
    // Balíčky nemají vlastní stránku sekce, detail balíčku je vždy "true".
    current: (p) => (packageFromPath(p) ? "true" : undefined),
  },
  { href: "/tipy-na-vylety", label: "Tipy na výlety", current: (p) => (p === "/tipy-na-vylety" ? "page" : undefined) },
  {
    href: "/denik",
    label: "Deník",
    current: (p) => (p === "/denik" ? "page" : p.startsWith("/denik/") ? "true" : undefined),
  },
  { href: "/o-honzovi", label: "O Honzovi", current: (p) => (p === "/o-honzovi" ? "page" : undefined) },
  { href: "/kontakt", label: "Kontakt", current: (p) => (p === "/kontakt" ? "page" : undefined) },
];

/** Stránky balíčků a hodnota ?balicek= pro poptávkový formulář. */
const PACKAGE_PAGES: Record<string, PackageSlug> = {
  "/balicek-florida-week": "florida-week",
  "/balicek-grand-tour": "grand-tour",
};

/** Balíček podle cesty stránky, null mimo stránky balíčků. */
export function packageFromPath(pathname: string): PackageSlug | null {
  return PACKAGE_PAGES[pathname.replace(/\/+$/, "")] ?? null;
}

/**
 * Adresa poptávkového formuláře. S balíčkem ho formulář předvyplní
 * („Poptáváte: …“), na ni vedou všechny výzvy „Poptat termín“ a „Poptat
 * tento balíček“.
 */
export function inquiryHref(balicek?: PackageSlug | null): string {
  return balicek ? `/kontakt?balicek=${balicek}#poptavka` : "/kontakt#poptavka";
}
