"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Arrow } from "@/components/web/ArrowSymbol";
import { ROUTES, destinationPath } from "@/lib/routes";
import { DIALOG_TITLE_ID, destinationNeighbours, type DestinationNavItem } from "./destination-nav";

/**
 * Okno s detailem destinace nad stránkou, ze které návštěvník přišel
 * (rozcestník Kam letět, úvod, výlet). Vykresluje ho layout zachycené cesty
 * @modal/(.)kam-letet, takže při přepínání destinací zůstává otevřené
 * a mění se jen obsah (stránka [slug] v children).
 *
 * Slot @modal si při měkké navigaci drží poslední stav, i když adresa už
 * detailu destinace nepatří. Okno se proto ukazuje jen na adrese
 * /kam-letet/<slug> známé destinace, jinak nevykreslí nic.
 */
export function DestinationDialog({
  items,
  children,
}: {
  /** Destinace v pořadí Honzova podkladu (slug a krátký název). */
  items: readonly DestinationNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const prefix = `${ROUTES.destinations}/`;
  const index = pathname.startsWith(prefix)
    ? items.findIndex((item) => item.slug === pathname.slice(prefix.length))
    : -1;
  if (index < 0) return null;
  return (
    <DialogFrame items={items} index={index}>
      {children}
    </DialogFrame>
  );
}

/**
 * Nativní <dialog> přes showModal(): prohlížeč dá oknu roli dialog
 * a modalitu, zbytek stránky je pro klávesnici i čtečky nedostupný (inert)
 * a fokus nemůže ven. Název okna je nadpis destinace (DIALOG_TITLE_ID).
 *
 * - Po otevření jde fokus na nadpis (dlouhý obsah se čte od začátku), po
 *   zavření zpět na prvek, který okno otevřel (dlaždici).
 * - Zavírá Zavřít, Escape a klik mimo okno, vždy přes router.back(): adresa
 *   se vrátí na stránku pod oknem a tlačítko Zpět v prohlížeči dělá totéž.
 * - Předchozí / Další (i šipky vlevo a vpravo) mění destinaci přes
 *   router.replace(), historie tak má jen jeden záznam a zavření vede vždy
 *   na stránku pod oknem. Nová destinace se ohlásí čtečce.
 * - Stránka pod oknem se neposouvá (overflow: hidden na <html>).
 * - Na mobilu je okno přes celou obrazovku (destinations.css).
 */
function DialogFrame({
  items,
  index,
  children,
}: {
  items: readonly DestinationNavItem[];
  index: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const shownSlug = useRef(items[index].slug);
  // Slug destinace, na kterou návštěvník přepnul. Ohlásí se, až se opravdu ukáže.
  const [announceSlug, setAnnounceSlug] = useState<string | null>(null);

  const current = items[index];
  const { prev, next } = destinationNeighbours(items, index);

  const requestClose = useCallback(() => {
    // Escape dvakrát rychle za sebou nesmí vrátit o dvě stránky.
    if (closing.current) return;
    closing.current = true;
    router.back();
  }, [router]);

  const go = (target: DestinationNavItem) => {
    setAnnounceSlug(target.slug);
    router.replace(destinationPath(target.slug), { scroll: false });
  };

  // Otevření a zavření okna. useLayoutEffect: okno je otevřené dřív, než se
  // obsah poprvé vykreslí, a dřív, než Next řeší posun stránky po navigaci.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const root = document.documentElement;
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body ? active : null;

    // Zamknutý posun stránky pod oknem. Klasický posuvník (Windows) nechá
    // po sobě místo, aby obsah pod oknem neposkočil doprava.
    const previousOverflow = root.style.overflow;
    const previousGutter = root.style.getPropertyValue("scrollbar-gutter");
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbar > 0) root.style.setProperty("scrollbar-gutter", "stable");

    // Klik mimo okno: cíl je samotný <dialog> (kreslí i ::backdrop) a bod
    // leží mimo jeho obdélník. Musí mimo začít i skončit, aby výběr textu
    // tažením ven okno nezavřel. Posuvník okna je uvnitř obdélníku.
    const isOutside = (event: MouseEvent) => {
      if (event.target !== dialog) return false;
      const box = dialog.getBoundingClientRect();
      return (
        event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
      );
    };
    let pressedOutside = false;
    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event);
    };
    const onClick = (event: MouseEvent) => {
      if (pressedOutside && isOutside(event)) requestClose();
      pressedOutside = false;
    };
    // Escape: místo zavření jen <dialog> se vrátí adresa (router.back()).
    const onCancel = (event: Event) => {
      event.preventDefault();
      requestClose();
    };
    // Prohlížeč okno zavřel sám (třeba druhý Escape bez kliknutí mezi tím).
    // Událost close chodí se zpožděním: zavření z úklidu níže v dev režimu
    // (StrictMode okno zavře a hned znovu otevře) dorazí do už otevřeného okna.
    const onClose = () => {
      if (!dialog.open) requestClose();
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("click", onClick);
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onClose);
    if (!dialog.open) dialog.showModal();
    // showModal() dá fokus prvnímu odkazu v liště. Text destinace je delší,
    // čtečka ho má číst od nadpisu (nadpis má tabIndex -1, bez rámečku).
    document.getElementById(DIALOG_TITLE_ID)?.focus({ preventScroll: true });

    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("click", onClick);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClose);
      if (dialog.open) dialog.close();
      root.style.overflow = previousOverflow;
      if (previousGutter) root.style.setProperty("scrollbar-gutter", previousGutter);
      else root.style.removeProperty("scrollbar-gutter");
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [requestClose]);

  // Přepnutí na jinou destinaci: obsah okna od začátku. Fokus zůstává na
  // Předchozí / Další v liště. Když se ztratil (byl v nahrazeném obsahu, nebo
  // Safari po kliku odkaz nefokusuje), jde na nový nadpis.
  useEffect(() => {
    if (shownSlug.current === current.slug) return;
    shownSlug.current = current.slug;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.scrollTop = 0;
    // Ztracený fokus skončí na <body> nebo na samotném okně (podle prohlížeče).
    const active = document.activeElement;
    if (!active || active === dialog || !dialog.contains(active)) {
      document.getElementById(DIALOG_TITLE_ID)?.focus({ preventScroll: true });
    }
  }, [current.slug]);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    if (event.repeat) return;
    go(event.key === "ArrowLeft" ? prev : next);
  };

  return (
    <dialog
      ref={dialogRef}
      className="kl-dialog"
      aria-labelledby={DIALOG_TITLE_ID}
      aria-modal="true"
      onKeyDown={onKeyDown}
    >
      <div className="kl-bar">
        <nav className="kl-steps" aria-label="Přepínání destinací">
          <Link
            className="fa-link kl-prev"
            href={destinationPath(prev.slug)}
            replace
            scroll={false}
            onClick={() => setAnnounceSlug(prev.slug)}
          >
            <Arrow />
            Předchozí<span className="vh"> destinace: {prev.name}</span>
          </Link>
          <span className="kl-count" aria-hidden="true">
            {index + 1} / {items.length}
          </span>
          <Link
            className="fa-link"
            href={destinationPath(next.slug)}
            replace
            scroll={false}
            onClick={() => setAnnounceSlug(next.slug)}
          >
            Další<span className="vh"> destinace: {next.name}</span>
            <Arrow />
          </Link>
        </nav>
        <button type="button" className="kl-close" onClick={requestClose}>
          Zavřít
        </button>
      </div>
      <div className="kl-body">{children}</div>
      <p className="vh" aria-live="polite" aria-atomic="true">
        {announceSlug === current.slug ? `Destinace ${index + 1} z ${items.length}: ${current.name}` : ""}
      </p>
    </dialog>
  );
}
