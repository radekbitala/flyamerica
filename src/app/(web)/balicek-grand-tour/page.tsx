import type { CSSProperties } from "react";
import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { Figure, PAGE_PHOTO_SIZES } from "@/components/web/Figure";
import { PackageAsk } from "@/components/web/PackageAsk";
import { Crumbs } from "@/components/web/PageHead";
import { Photo } from "@/components/web/Photo";
import { inquiryHref } from "@/components/web/nav";
import { pageMetadata } from "@/lib/metadata";

// Balíček 2 podle prototyp/balicek-grand-tour.html. Texty, údaje a ceny
// doslova od Honzy (podklad z 10. 10. 2026). Na rozdíl od Balíčku 1 bez
// průběhu přípravy (Honza ho napsal jen k Balíčku 1).
export const metadata = pageMetadata({
  title: "Florida Grand Tour & Fly",
  description:
    "Balíček 2: 9 dní na Floridě, 20 letových hodin v Cessně 182 s pilotem-mentorem. Co je v ceně a cena balíčku.",
  path: "/balicek-grand-tour",
});

/** sizes fotky v galerii pod programem (.pk-gallery). */
const GALLERY_SIZES = "(max-width: 600px) 100vw, 368px";
/** sizes dlaždice v Kam dál (.pk-next, 2 sloupce). */
const NEXT_SIZES = "(max-width: 600px) 100vw, 564px";

export default function GrandTourPage() {
  return (
    <>
      {/* ===== ZÁHLAVÍ (Balíček 2 od Honzy, texty doslova podle podkladu z 10. 10. 2026) ===== */}
      <header className="page-head">
        <div className="fa-wrap pk-head">
          <Crumbs href="/#balicky" label="Balíčky" current="Balíček 2" />
          <div className="pk-head-text">
            <h1>Florida Grand&nbsp;Tour &amp; Fly</h1>
            <p className="pk-sub">9&nbsp;dní&nbsp;na&nbsp;Floridě&nbsp;• 20&nbsp;letových&nbsp;hodin&nbsp;• Cessna&nbsp;182</p>
            <p className="perex">Intenzivní letecký pobyt zaměřený na delší navigační lety, americkou VFR komunikaci a&nbsp;létání v&nbsp;řízených prostorech. Trasy mohou vést podél pobřeží, přes Everglades, na Florida Keys nebo na sever ke St.&nbsp;Augustine.</p>
          </div>
          {/* Cena a výzva hned v záhlaví (nález Impeccable 2): na počítači vpravo vedle perexu, pod 961 px pod perexem a nad fotkou.
               V záběru 3 tabulové prvky: logo, drobečky Balíčky a tato výzva. */}
          <aside className="aside pk-sum" aria-labelledby="cena-od">
            <span className="lbl" id="cena-od">Cena od</span>
            <p className="pk-price">10&nbsp;800&nbsp;USD</p>
            <p className="pk-price-note">za osobu při 2&nbsp;pilotech. Pro 1&nbsp;pilota 20&nbsp;100&nbsp;USD.</p>
            <Link className="fa-dir fa-dir--grafit" href={inquiryHref("grand-tour")}><span className="t">Poptat tento balíček</span><Arrow /></Link>
            <p className="pk-sum-more"><a className="fa-link" href="#cena">Cena balíčku <Arrow /></a></p>
          </aside>
        </div>
      </header>

      <div className="fa-wrap">
        <Figure
          photo="everglades-letecky"
          sizes={PAGE_PHOTO_SIZES}
          className="page-photo pk-photo"
          style={{ "--pos": "50% 15%" } as CSSProperties}
          credit
          priority
        />
      </div>

      {/* ===== PŘEHLED PROGRAMU ===== */}
      <section className="sec sec--tight" aria-labelledby="program">
        <div className="fa-wrap">
          <div className="split">
            <div>
              <h2 id="program" className="pk-h2">Přehled programu</h2>
              <dl className="pk-data">
                <div><dt>Délka</dt><dd>9&nbsp;dní - 6&nbsp;letových a&nbsp;3&nbsp;volné dny.</dd></div>
                <div><dt>Letadlo</dt><dd>Cessna&nbsp;182 Skylane.</dd></div>
                <div><dt>Nálet</dt><dd>20&nbsp;hodin, přibližně 3-3,5&nbsp;hodiny za letový den.</dd></div>
                <div><dt>Možné cíle</dt><dd>Cedar Key, St.&nbsp;Petersburg, Florida Keys, Key&nbsp;West, pobřeží, Everglades nebo St.&nbsp;Augustine.</dd></div>
                <div><dt>Výcvik</dt><dd>americká VFR frazeologie, prostory Class B/C/D, ForeFlight, ostrovní přistání a&nbsp;příprava na BFR.</dd></div>
                <div><dt>Volné dny</dt><dd>pláž, Universal Studios, Kennedy Space Center nebo nákupy.</dd></div>
              </dl>
              <div className="pk-req">
                <h3>Požadavky na piloty</h3>
                <p><span className="todo">[doplnit od Honzy: požadavky na piloty - jaká licence, úroveň angličtiny (ICAO) a&nbsp;průkaz radiotelefonisty; co nabídne pilotům UL a&nbsp;lidem bez licence]</span></p>
              </div>
            </div>
          </div>

          <div className="gallery pk-gallery">
            <Figure photo="key-west-plaz" sizes={GALLERY_SIZES} />
            <Figure photo="everglades-airpark" sizes={GALLERY_SIZES} />
            <Figure photo="cessna-182-marco-island" sizes={GALLERY_SIZES} />
          </div>
        </div>
      </section>

      {/* ===== CO JE V CENĚ (tabulka doslova podle Honzy) ===== */}
      <section className="sec sec--tight sec--white" aria-labelledby="v-cene">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><h2 id="v-cene">Co je v&nbsp;ceně</h2></div>
            <p>V&nbsp;ceně je letadlo, palivo, pilot-mentor, letištní poplatky, pojištění a&nbsp;pronájem auta. Letenky a&nbsp;ubytování si klient hradí samostatně.</p>
          </div>
          <table className="fa-table pk-table" aria-labelledby="v-cene">
            <thead>
              <tr><th scope="col">Služba</th><th scope="col">Zahrnuto</th><th scope="col">Rozsah</th></tr>
            </thead>
            <tbody>
              <tr><td data-label="Služba">Pilot-mentor a&nbsp;doprovod</td><td data-label="Zahrnuto">Ano</td><td data-label="Rozsah">Briefingy, navigace, frazeologie a&nbsp;doprovod v&nbsp;kabině po celých 9&nbsp;dní.</td></tr>
              <tr><td data-label="Služba">Cessna&nbsp;182 a&nbsp;palivo</td><td data-label="Zahrnuto">Ano</td><td data-label="Rozsah">20&nbsp;letových hodin včetně paliva.</td></tr>
              <tr><td data-label="Služba">Pojištění a&nbsp;letištní poplatky</td><td data-label="Zahrnuto">Ano</td><td data-label="Rozsah">Pojištění, přistávací poplatky a&nbsp;parkování letadla.</td></tr>
              <tr><td data-label="Služba">Pronájem auta</td><td data-label="Zahrnuto">Ano</td><td data-label="Rozsah">Auto na 9&nbsp;dní včetně paliva a&nbsp;mýtného SunPass.</td></tr>
              <tr><td data-label="Služba">Příprava a&nbsp;ForeFlight</td><td data-label="Zahrnuto">Ano</td><td data-label="Rozsah">Pomoc s&nbsp;FAA validací a&nbsp;přípravou tratí.</td></tr>
              <tr><td data-label="Služba">Ubytování a&nbsp;letenky</td><td data-label="Zahrnuto">Ne</td><td data-label="Rozsah">Klient si je vybírá a&nbsp;hradí samostatně.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== CENA BALÍČKU + výzva vedle tabulky (jediná výzva na obrazovce, grafitová na Papíru) ===== */}
      <section className="sec sec--tight" id="cena" aria-labelledby="cena-nadpis">
        <div className="fa-wrap split">
          <div>
            <h2 id="cena-nadpis" className="pk-h2">Cena balíčku</h2>
            <table className="fa-table pk-table" aria-labelledby="cena-nadpis">
              <thead>
                <tr><th scope="col">Varianta</th><th scope="col">Cena</th><th scope="col">Nálet</th></tr>
              </thead>
              <tbody>
                <tr><td data-label="Varianta">2&nbsp;piloti (doporučená varianta)</td><td data-label="Cena"><span className="num">10&nbsp;800&nbsp;USD</span> za&nbsp;osobu</td><td data-label="Nálet">Každý pilot získá 10&nbsp;hodin jako PIC. Sdílejí mentora a&nbsp;auto.</td></tr>
                <tr><td data-label="Varianta">1&nbsp;pilot (samostatná varianta)</td><td data-label="Cena"><span className="num">20&nbsp;100&nbsp;USD</span></td><td data-label="Nálet">Všech 20&nbsp;hodin jako PIC. Lze vzít partnerku nebo jiný doprovod.</td></tr>
              </tbody>
            </table>
          </div>
          <PackageAsk balicek="grand-tour" />
        </div>
      </section>

      {/* ===== KAM DÁL: druhý balíček a tipy na výlety ===== */}
      <section className="sec sec--tight sec--line" aria-labelledby="dal-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Kam dál</span><h2 id="dal-nadpis">Další balíček a&nbsp;tipy na výlety</h2></div>
          </div>
          <div className="grid-2 pk-next">
            <Link className="tip" href="/balicek-florida-week">
              <div className="tip-img"><Photo photo="cessna-182-winter-haven" sizes={NEXT_SIZES} /></div>
              <span className="lbl">Balíček 1</span>
              <h3>Florida Week &amp; Fly</h3>
              <p>Létání v&nbsp;USA na zkoušku</p>
            </Link>
            <Link className="tip" href="/tipy-na-vylety">
              <div className="tip-img"><Photo photo="fa83-orlando-north-letecky" sizes={NEXT_SIZES} /></div>
              <span className="lbl">Tipy na výlety</span>
              <h3>Kam z&nbsp;Orlanda doletět</h3>
              <p>Cedar Key, Albert Whitted, Vero Beach, Palatka, Kissimmee, Merritt Island, Key&nbsp;West a&nbsp;Everglades.</p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
