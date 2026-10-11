import type { CSSProperties } from "react";
import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { Figure, PAGE_PHOTO_SIZES } from "@/components/web/Figure";
import { PackageAsk } from "@/components/web/PackageAsk";
import { Crumbs } from "@/components/web/PageHead";
import { Photo } from "@/components/web/Photo";
import { inquiryHref } from "@/components/web/nav";
import { pageMetadata } from "@/lib/metadata";

// Balíček 1 podle prototyp/balicek-florida-week.html. Texty, údaje a ceny
// doslova od Honzy (podklad z 10. 10. 2026).
export const metadata = pageMetadata({
  title: "Florida Week & Fly",
  description:
    "Balíček 1: 6 dní na Floridě, 12 letových hodin v Cessně 182 s pilotem-mentorem. Co zahrnuje cena, varianty a průběh přípravy.",
  path: "/balicek-florida-week",
});

/** sizes fotky v galerii pod programem (.pk-gallery). */
const GALLERY_SIZES = "(max-width: 600px) 100vw, 368px";
/** sizes dlaždice v Kam dál (.pk-next, 2 sloupce). */
const NEXT_SIZES = "(max-width: 600px) 100vw, 564px";

export default function FloridaWeekPage() {
  return (
    <>
      {/* ===== ZÁHLAVÍ (Balíček 1 od Honzy, texty doslova podle podkladu z 10. 10. 2026) ===== */}
      <header className="page-head">
        <div className="fa-wrap pk-head">
          <Crumbs href="/#balicky" label="Balíčky" current="Balíček 1" />
          <div className="pk-head-text">
            <h1>Florida Week &amp; Fly</h1>
            <p className="pk-sub">Létání v&nbsp;USA na zkoušku</p>
            <p className="perex">Zažijte týden VFR létání na Floridě. Procvičíte si anglickou leteckou frazeologii na amerických letištích, přistanete na ikonických ostrovních drahách, jako jsou Cedar Key nebo Albert Whitted v&nbsp;St.&nbsp;Petersburgu, a&nbsp;proletíte se podél pobřeží Mexického zálivu. O&nbsp;veškerou organizaci a&nbsp;servis se postaráme a&nbsp;v&nbsp;kabině vás bude doprovázet zkušený mentor.</p>
          </div>
          {/* Cena a výzva hned v záhlaví (nález Impeccable 2): na počítači vpravo vedle perexu, pod 961 px pod perexem a nad fotkou.
               V záběru 3 tabulové prvky: logo, drobečky Balíčky a tato výzva. */}
          <aside className="aside pk-sum" aria-labelledby="cena-od">
            <span className="lbl" id="cena-od">Cena od</span>
            <p className="pk-price">$7&nbsp;400&nbsp;USD</p>
            <p className="pk-price-note">za osobu při 2&nbsp;pilotech. Pro 1&nbsp;pilota $13&nbsp;900&nbsp;USD.</p>
            <Link className="fa-dir fa-dir--grafit" href={inquiryHref("florida-week")}><span className="t">Poptat tento balíček</span><Arrow /></Link>
            <p className="pk-sum-more"><a className="fa-link" href="#cena">Varianty a&nbsp;cena <Arrow /></a></p>
          </aside>
        </div>
      </header>

      <div className="fa-wrap">
        <Figure
          photo="albert-whitted-letecky"
          sizes={PAGE_PHOTO_SIZES}
          className="page-photo pk-photo"
          style={{ "--pos": "50% 62%" } as CSSProperties}
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
                <div><dt>Délka pobytu</dt><dd>6&nbsp;dní - 4&nbsp;letové a&nbsp;2&nbsp;volné dny na pláž, nákupy nebo návštěvu Universal Studios.</dd></div>
                <div><dt>Letadlo</dt><dd>Cessna&nbsp;182 Skylane - prostorný čtyřmístný stroj vhodný pro delší lety ve 2-3&nbsp;lidech.</dd></div>
                <div><dt>Letový nálet</dt><dd>12&nbsp;hodin</dd></div>
                <div><dt>Náplň programu</dt><dd>VFR frazeologie v&nbsp;USA, provoz v&nbsp;řízeném i&nbsp;neřízeném vzdušném prostoru, práce s&nbsp;ForeFlight a&nbsp;příprava letadla.</dd></div>
              </dl>
              <div className="pk-req">
                <h3>Požadavky na piloty</h3>
                <p><span className="todo">[doplnit od Honzy: požadavky na piloty - jaká licence, úroveň angličtiny (ICAO) a&nbsp;průkaz radiotelefonisty; co nabídne pilotům UL a&nbsp;lidem bez licence]</span></p>
              </div>
            </div>
          </div>

          <div className="gallery pk-gallery">
            <Figure photo="cedar-key-okoli" sizes={GALLERY_SIZES} />
            <Figure photo="cedar-key-cessna-170" sizes={GALLERY_SIZES} />
            <Figure photo="cessna-182-winter-haven" sizes={GALLERY_SIZES} />
          </div>
        </div>
      </section>

      {/* ===== CO ZAHRNUJE CENA (tabulka doslova podle Honzy) ===== */}
      <section className="sec sec--tight sec--white" aria-labelledby="v-cene">
        <div className="fa-wrap">
          <h2 id="v-cene" className="pk-h2">Co zahrnuje cena</h2>
          <table className="fa-table pk-table" aria-labelledby="v-cene">
            <thead>
              <tr><th scope="col">Položka nebo služba</th><th scope="col">V&nbsp;ceně?</th><th scope="col">Co je zahrnuto</th></tr>
            </thead>
            <tbody>
              <tr><td data-label="Položka nebo služba">Pilot-mentor a&nbsp;doprovod</td><td data-label="V ceně?">ANO</td><td data-label="Co je zahrnuto">Briefing, navigační příprava, frazeologie a&nbsp;podpora přímo v&nbsp;kabině</td></tr>
              <tr><td data-label="Položka nebo služba">Pronájem C182 a&nbsp;palivo 12&nbsp;hodin</td><td data-label="V ceně?">ANO</td><td data-label="Co je zahrnuto">Celkem 12&nbsp;letových hodin v&nbsp;C182</td></tr>
              <tr><td data-label="Položka nebo služba">Pojištění letadla a&nbsp;poplatky FBO</td><td data-label="V ceně?">ANO</td><td data-label="Co je zahrnuto">Pojištění podle podmínek půjčovny včetně přistávacích a&nbsp;tie-down poplatků</td></tr>
              <tr><td data-label="Položka nebo služba">Místní pronájem auta</td><td data-label="V ceně?">ANO</td><td data-label="Co je zahrnuto">Včetně rezervace a&nbsp;paliva</td></tr>
              <tr><td data-label="Položka nebo služba">Příprava a&nbsp;ForeFlight</td><td data-label="V ceně?">ANO</td><td data-label="Co je zahrnuto">Pomoc s&nbsp;validací FAA a&nbsp;naplánováním tras</td></tr>
              <tr><td data-label="Položka nebo služba">Ubytování a&nbsp;letenka</td><td data-label="V ceně?">NE</td><td data-label="Co je zahrnuto">Klient si hradí samostatně podle svých preferencí</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== VARIANTY A CENA + výzva vedle tabulky (jediná výzva na obrazovce, grafitová na Papíru) ===== */}
      <section className="sec sec--tight" id="cena" aria-labelledby="cena-nadpis">
        <div className="fa-wrap split">
          <div>
            <h2 id="cena-nadpis" className="pk-h2">Varianty a&nbsp;cena balíčku</h2>
            <table className="fa-table pk-table" aria-labelledby="cena-nadpis">
              <thead>
                <tr><th scope="col">Varianta</th><th scope="col">Cena</th><th scope="col">Letové hodiny a&nbsp;organizace</th></tr>
              </thead>
              <tbody>
                <tr><td data-label="Varianta">2&nbsp;piloti (DOPORUČENO)</td><td data-label="Cena"><span className="num">$7&nbsp;400&nbsp;USD</span> za&nbsp;osobu</td><td data-label="Letové hodiny a organizace">Každý pilot absolvuje 6&nbsp;hodin jako PIC. Mentor i&nbsp;auto jsou společné.</td></tr>
                <tr><td data-label="Varianta">1&nbsp;pilot (individuální varianta)</td><td data-label="Cena"><span className="num">$13&nbsp;900&nbsp;USD</span></td><td data-label="Letové hodiny a organizace">Všech 12&nbsp;hodin absolvujete jako PIC. Partnerka nebo jiný doprovod může cestovat s&nbsp;vámi.</td></tr>
              </tbody>
            </table>
            <p className="pk-note">Cena nezahrnuje letenky, ubytování, stravu ani správní poplatek FAA za validaci průkazu.</p>
          </div>
          <PackageAsk balicek="florida-week" />
        </div>
      </section>

      {/* ===== PRŮBĚH PŘÍPRAVY (Honzův text z Balíčku 1, jediná tmavá sekce stránky) ===== */}
      <section className="sec sec--tight sec--dark steps on-dark" id="priprava" aria-labelledby="priprava-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Jak to probíhá</span><h2 id="priprava-nadpis">Průběh přípravy</h2></div>
          </div>
          <ol className="fa-steps" style={{ "--n": "3" } as CSSProperties}>
            <li><span className="fa-step-n" aria-hidden="true">01</span><h3>6-8&nbsp;týdnů před odletem</h3><p>Zahájíme ověření zahraniční pilotní licence u&nbsp;FAA (Foreign Pilot Verification).</p></li>
            <li><span className="fa-step-n" aria-hidden="true">02</span><h3>2&nbsp;týdny před odletem</h3><p>Online probereme trasy, pravidla VFR v&nbsp;USA a&nbsp;možnosti ubytování.</p></li>
            <li><span className="fa-step-n" aria-hidden="true">03</span><h3>Po příletu na Floridu</h3><p>Převezmete auto, ubytujete se a&nbsp;zahájíte letový program.</p></li>
          </ol>
        </div>
      </section>

      {/* ===== KAM DÁL: druhý balíček a tipy na výlety ===== */}
      <section className="sec sec--tight" aria-labelledby="dal-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Kam dál</span><h2 id="dal-nadpis">Další balíček a&nbsp;tipy na výlety</h2></div>
          </div>
          <div className="grid-2 pk-next">
            <Link className="tip" href="/balicek-grand-tour">
              <div className="tip-img"><Photo photo="cessna-182-marco-island" sizes={NEXT_SIZES} /></div>
              <span className="lbl">Balíček 2</span>
              <h3>Florida Grand&nbsp;Tour &amp; Fly</h3>
              <p>9&nbsp;dní&nbsp;na&nbsp;Floridě&nbsp;• 20&nbsp;letových&nbsp;hodin&nbsp;• Cessna&nbsp;182</p>
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
