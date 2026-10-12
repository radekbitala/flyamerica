"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Arrow } from "@/components/web/ArrowSymbol";
import { NAV_ITEMS, inquiryHref, tripFromPath } from "@/components/web/nav";

/**
 * Klientská část hlavičky (jediná klientská komponenta společného základu).
 * Chování podle prototyp/js/web.js:
 *
 * 1. Menu: položky s aria-current podle cesty, tlačítko Menu otevírá a zavírá
 *    #mobilni-menu, Escape ho zavře a vrátí fokus na tlačítko, odkaz v menu,
 *    přechod na jinou stránku a šířka nad 960 px ho zavřou.
 * 2. Tichá výzva „Poptat termín“: v HTML má třídu is-hidden (bez probliknutí
 *    při načtení) a ukáže se, až na obrazovce pod hlavičkou není žádná
 *    směrová tabule (main .fa-dir) ani poptávkový formulář (main #poptavka).
 *    Na každé stránce se sleduje znovu. Bez skriptu ji ukáže <noscript>
 *    v layoutu, při otevřeném menu ji schová web.css (výzva je v menu).
 * 3. Na stránkách výletů vede výzva na formulář s ?vylet= (nález 13).
 *
 * Stav si pamatuje cestu, pro kterou platí: po přechodu na jinou stránku je
 * menu zavřené a výzva skrytá, dokud ji sledování na nové stránce neukáže.
 * Logo přichází jako hotový prvek ze serveru (SiteHeader).
 */
export function MobileMenu({ logo }: { logo: ReactNode }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [quiet, setQuiet] = useState<{ path: string; hidden: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const open = openOn === pathname;
  const quietHidden = quiet?.path !== pathname || quiet.hidden;
  const inquiry = inquiryHref(tripFromPath(pathname));

  // Escape zavře otevřené menu a vrátí fokus na tlačítko.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenOn(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Na šířce počítače menu není, otevřené se zavře.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 961px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpenOn(null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Tichá výzva: skrytá, dokud je pod hlavičkou vidět směrová tabule nebo formulář.
  useEffect(() => {
    const targets = document.querySelectorAll("main .fa-dir, main #poptavka");
    if (targets.length === 0 || !("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setQuiet({ path: pathname, hidden: false }));
      return () => cancelAnimationFrame(frame);
    }

    const visible = new Set<Element>();
    let observer: IntersectionObserver | null = null;
    // Odsazení shora = skutečná výška lišty (počítač 80 px, pod 601 px 60 px).
    // Při změně šířky přes 600 px se sledování nastaví znovu.
    const watch = () => {
      observer?.disconnect();
      visible.clear();
      const height = barRef.current ? Math.round(barRef.current.getBoundingClientRect().height) : 80;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target);
            else visible.delete(entry.target);
          }
          setQuiet({ path: pathname, hidden: visible.size > 0 });
        },
        { rootMargin: `-${height}px 0px 0px 0px` },
      );
      targets.forEach((target) => observer?.observe(target));
    };
    watch();
    const mq = window.matchMedia("(max-width: 600px)");
    mq.addEventListener("change", watch);
    return () => {
      mq.removeEventListener("change", watch);
      observer?.disconnect();
    };
  }, [pathname]);

  // Odkaz v menu (i kotva na stejné stránce) menu zavře.
  const onPanelClick = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as Element).closest("a")) setOpenOn(null);
  };

  return (
    <>
      <div className="fa-wrap hdr-in" ref={barRef}>
        {logo}
        <div className="hdr-right">
          <nav className="fa-nav" aria-label="Hlavní menu">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} aria-current={item.current(pathname)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link className={quietHidden ? "fa-quiet is-hidden" : "fa-quiet"} href={inquiry}>
            <span>
              Poptat<span className="q-long"> termín</span>
            </span>{" "}
            <Arrow />
          </Link>
          <button
            ref={buttonRef}
            className="menu-btn"
            type="button"
            aria-expanded={open}
            aria-controls="mobilni-menu"
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            {open ? "Zavřít" : "Menu"}
          </button>
        </div>
      </div>
      <nav className="mnav" id="mobilni-menu" aria-label="Menu pro mobil" hidden={!open} onClick={onPanelClick}>
        <div className="fa-wrap">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={item.current(pathname)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mnav-cta">
            <Link className="fa-quiet" href={inquiry}>
              <span>Poptat termín</span> <Arrow />
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
