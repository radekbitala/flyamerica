"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Arrow } from "@/components/web/ArrowSymbol";

export interface PhotoRowProps {
  /** Název oblasti pro čtečky („Fotky destinací výletu …“). */
  label: string;
  /** Viditelné popisky fotek ve stejném pořadí jako snímky, pro ohlášení aktuální fotky. */
  captions: readonly string[];
  /** Dovětek pod řadou („Foto: archiv FLY America“). */
  credit?: string;
  /** Snímky (fotky s popiskem ze serveru), jeden na položku. */
  children: ReactNode;
}

/** Posun myší, od kterého se tažení bere jako posun řady (ne jako klik). */
const DRAG_THRESHOLD = 4;
/** Tažení delší než tohle přejde na další nebo předchozí fotku, kratší se vrátí na nejbližší. */
const DRAG_SWIPE = 40;

interface DragState {
  pointerId: number;
  startX: number;
  startLeft: number;
  moved: boolean;
}

/**
 * Posuvná řada fotek (stránka výletu). Bez automatického přetáčení.
 * Posun: tlačítka Předchozí a Další, tažení prstem nebo myší, kolečko
 * a touchpad, šipky vlevo a vpravo, Home a End v řadě (řada je zaměřitelná
 * Tabem). Řada sama je obyčejný vodorovný posun se scroll-snap, takže funguje
 * i bez skriptu, skript jen přidává tlačítka, ukazatel pozice a ohlášení.
 *
 * Přístupnost podle vzoru carousel z WAI-ARIA APG: oblast s popiskem
 * (aria-roledescription „galerie“), snímky jako skupiny „fotka 1 z 5“,
 * aktuální fotku po změně ohlásí skrytý stav (aria-live="polite"), při
 * načtení stránky se nic neohlašuje. Tlačítka na kraji řady jsou
 * aria-disabled (zůstávají zaměřitelná, fokus se neztratí).
 *
 * Fotky, které nejsou celé v záběru (vykukující další fotka), mají třídu
 * is-cut a trips.css jim na tabletu a počítači skryje popisek jen
 * průhledností (úprava 41, rozhodnutí 14. 10. 2026). Před prvním měřením
 * platí, že celá je jen první fotka (začátek řady), bez skriptu se třída
 * nepoužije (media scripting v trips.css).
 */
export function PhotoRow({ label, captions, credit, children }: PhotoRowProps) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef(0);
  const indexRef = useRef(0);
  const announceRef = useRef(0);
  // Cíl rozjetého posunu tlačítkem: druhé kliknutí během posunu jde o fotku dál od cíle, ne od místa, kde řada zrovna je.
  const targetRef = useRef<{ left: number; timer: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: count <= 1 });
  const [cut, setCut] = useState<readonly boolean[]>(() => slides.map((_, i) => i > 0));
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);

  // Aktuální fotka podle polohy řady: ta, jejíž levý okraj je nejblíž
  // začátku obsahu. Na konci řady (poslední fotka celá vidět) poslední.
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const stops = snapStops(track);
    const left = track.scrollLeft;
    const max = track.scrollWidth - track.clientWidth;
    const atEnd = left >= max - 2;
    // Celá v záběru = celá uvnitř viditelné šířky řady (řada je přes celou šířku okna).
    const box = track.getBoundingClientRect();
    const nextCut = Array.from(track.children, (slide) => {
      const rect = slide.getBoundingClientRect();
      return rect.left < box.left - 1 || rect.right > box.right + 1;
    });
    setCut((prev) => (prev.length === nextCut.length && prev.every((value, i) => value === nextCut[i]) ? prev : nextCut));
    // Když se celá řada vejde (max 0), aktuální je první fotka, ne poslední.
    const current = atEnd && max > 2 ? stops.length - 1 : nearestIndex(stops, left);
    setEdges((prev) =>
      prev.start === left <= 2 && prev.end === atEnd ? prev : { start: left <= 2, end: atEnd },
    );
    if (current === indexRef.current) return;
    indexRef.current = current;
    setIndex(current);
    // Ohlásit až fotku, na které řada zůstala, ne každou, přes kterou přejela.
    window.clearTimeout(announceRef.current);
    announceRef.current = window.setTimeout(() => {
      const shown = indexRef.current;
      setAnnouncement(`Fotka ${shown + 1} z ${stops.length}: ${captions[shown] ?? ""}`);
    }, 300);
  }, [captions]);

  // Přepočet při posunu (jednou za snímek obrazovky) a při změně šířky.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(onScroll);
    observer.observe(track);
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.clearTimeout(announceRef.current);
      if (targetRef.current) window.clearTimeout(targetRef.current.timer);
      observer.disconnect();
      track.removeEventListener("scroll", onScroll);
    };
  }, [measure]);

  /** Posune řadu na fotku podle polohy (krajní fotky na konci řady se nemusí dostat na začátek). */
  const scrollToLeft = useCallback((left: number, done?: () => void) => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (targetRef.current) window.clearTimeout(targetRef.current.timer);
    targetRef.current = { left, timer: window.setTimeout(() => (targetRef.current = null), reduced ? 50 : 700) };
    if (done) {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        track.removeEventListener("scrollend", finish);
        done();
      };
      track.addEventListener("scrollend", finish);
      // Prohlížeč bez události scrollend, nebo řada už na místě je (žádný posun).
      window.setTimeout(finish, reduced ? 50 : 700);
    }
    track.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, []);

  /** Další (1) nebo předchozí (-1) fotka, která ještě není na začátku řady. */
  const step = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      if (!track) return;
      const from = targetRef.current?.left ?? track.scrollLeft;
      const target = neighbourStop(snapStops(track), from, direction);
      if (target !== null) scrollToLeft(target);
    },
    [scrollToLeft],
  );

  const goTo = useCallback(
    (position: "first" | "last") => {
      const track = trackRef.current;
      if (!track) return;
      const stops = snapStops(track);
      scrollToLeft(position === "first" ? stops[0] : stops[stops.length - 1]);
    },
    [scrollToLeft],
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const actions: Record<string, () => void> = {
      ArrowRight: () => step(1),
      ArrowLeft: () => step(-1),
      Home: () => goTo("first"),
      End: () => goTo("last"),
    };
    const action = actions[event.key];
    if (!action || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    action();
  }

  // Tažení myší (prst a touchpad posouvají řadu samy). Během tažení je
  // scroll-snap vypnutý (.is-dragging), po puštění řada dojede na fotku
  // a teprve pak se scroll-snap zase zapne, aby řada neposkočila.
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!track || event.pointerType !== "mouse" || event.button !== 0) return;
    targetRef.current = null;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startLeft: track.scrollLeft, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    track.scrollLeft = drag.startLeft - dx;
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved || !track) return;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    const stops = snapStops(track);
    const dx = event.clientX - drag.startX;
    const swiped = Math.abs(dx) >= DRAG_SWIPE ? neighbourStop(stops, drag.startLeft, dx < 0 ? 1 : -1) : null;
    const target = swiped ?? stops[nearestIndex(stops, track.scrollLeft)];
    scrollToLeft(target, () => setDragging(false));
  }

  const position = Math.min(index, count - 1) + 1;

  return (
    <section className="vy-row" aria-roledescription="galerie" aria-label={label}>
      <div
        ref={trackRef}
        className={dragging ? "vy-row-track is-dragging" : "vy-row-track"}
        role="group"
        aria-label="Řada fotek, posun šipkami vlevo a vpravo"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDragStart={(event) => event.preventDefault()}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className={cut[i] ? "vy-row-slide is-cut" : "vy-row-slide"}
            role="group"
            aria-roledescription="fotka"
            aria-label={`${i + 1} z ${count}`}
          >
            {slide}
          </div>
        ))}
      </div>
      {count > 1 ? (
        <div className="fa-wrap vy-row-bar">
          {credit ? <p className="vy-row-credit">{credit}</p> : null}
          <p className="vy-row-pos" aria-hidden="true">
            <span className="vy-row-now">{position}</span> / {count}
          </p>
          <div className="vy-row-btns">
            <button
              type="button"
              className="vy-row-btn vy-row-btn--prev"
              aria-label="Předchozí fotka"
              aria-disabled={edges.start}
              onClick={() => step(-1)}
            >
              <Arrow />
            </button>
            <button
              type="button"
              className="vy-row-btn"
              aria-label="Další fotka"
              aria-disabled={edges.end}
              onClick={() => step(1)}
            >
              <Arrow />
            </button>
          </div>
          <p className="vh" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
        </div>
      ) : credit ? (
        <p className="fa-wrap vy-row-credit">{credit}</p>
      ) : null}
    </section>
  );
}

/**
 * Polohy řady (scrollLeft), ve kterých je fotka na začátku obsahu
 * (scroll-padding = padding řady). Poslední fotky se na začátek nedostanou,
 * jejich poloha je konec řady.
 */
function snapStops(track: HTMLDivElement): number[] {
  const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
  const max = Math.max(0, track.scrollWidth - track.clientWidth);
  const origin = track.getBoundingClientRect().left - track.scrollLeft;
  return Array.from(track.children, (slide) => {
    const left = slide.getBoundingClientRect().left - origin - padding;
    return Math.min(max, Math.max(0, Math.round(left)));
  });
}

function nearestIndex(stops: readonly number[], left: number): number {
  let best = 0;
  stops.forEach((stop, i) => {
    if (Math.abs(stop - left) < Math.abs(stops[best] - left)) best = i;
  });
  return best;
}

/** Nejbližší poloha za left ve směru direction, null na kraji řady. */
function neighbourStop(stops: readonly number[], left: number, direction: 1 | -1): number | null {
  if (direction === 1) return stops.find((stop) => stop > left + 2) ?? null;
  for (let i = stops.length - 1; i >= 0; i -= 1) if (stops[i] < left - 2) return stops[i];
  return null;
}
