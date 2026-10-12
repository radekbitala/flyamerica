import type { CSSProperties } from "react";
import Link from "next/link";
import { getImageProps } from "next/image";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { Figure } from "@/components/web/Figure";
import { HonzaWho } from "@/components/web/HonzaWho";
import { Photo } from "@/components/web/Photo";
import { inquiryHref } from "@/components/web/nav";
import { photos } from "@/data/photos";
import { isoDate, yearOf } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { postDisplayTitle } from "@/lib/post-title";
import { getLatestPublishedPosts } from "@/lib/public-posts";
import { ROUTES, destinationPath, postPath, tripPath } from "@/lib/routes";
import { FA_PHONE, FA_PHONE_HREF } from "@/lib/site";
import { NBSP, czechNbspText } from "@/lib/typography";

// Úvodní stránka podle prototyp/index.html. Texty doslova z modelu, sekce
// Z cest bere nejnovější publikované články z databáze.
export const metadata = pageMetadata({
  title: "FLY America - létání na Floridě s mentorem",
  absoluteTitle: true,
  description:
    "Létání s českými piloty na Floridě. Domovská základna Orlando North Airpark (FA83), Cessna 182 a mentor Honza Čermák.",
  path: "/",
});

/** sizes dlaždice tipu v .grid-4 (4 / 2 / 1 sloupec). Model ji vkládá bez srcset. */
const TIP_SIZES = "(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 270px";

export default function HomePage() {
  return (
    <>
      {/* ===== ÚVOD ===== */}
      <section className="hero" aria-labelledby="uvod-nadpis">
        <HeroPicture />
        <div className="hero-in">
          <div className="fa-wrap">
            <p className="hero-base"><span className="fa-code">FA83</span> <span>Domovská základna Orlando North Airpark</span></p>
            <h1 id="uvod-nadpis">Létejte po Floridě bez&nbsp;starostí.</h1>
            <p className="lead">O&nbsp;veškerou organizaci a&nbsp;servis se postaráme a&nbsp;v&nbsp;kabině vás bude doprovázet zkušený mentor.</p>
            <div className="cta-row on-dark">
              <Link className="fa-dir" href={inquiryHref()}><span className="t">Poptat termín</span><Arrow /></Link>
              <a className="fa-link" href="#vylety">Výlety od $7&nbsp;400&nbsp;USD <Arrow /></a>
            </div>
          </div>
        </div>
        <p className="hero-cap">Jezera u&nbsp;Lake Wales. Foto: archiv FLY America</p>
      </section>

      {/* ===== CO ZA VÁS ZAŘÍDÍME (nejdřív nabídka služby). Položky a popisy doslova z Honzovy tabulky „Co zahrnuje cena“ (výlet 1),
           platí pro oba výlety. Obecný popis služby od Honzy zatím chybí. Prodejní argumenty ze schůzky nepoužívat, dokud je Honza nepotvrdí. ===== */}
      <section className="sec sec--tight sec--white" id="sluzba" aria-labelledby="sluzba-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Služba</span><h2 id="sluzba-nadpis">Co za vás zařídíme</h2></div>
            <p><span className="todo">[doplnit: popis služby od Honzy]</span></p>
          </div>
          {/* Pátá položka „Cessna 182 a palivo“: Honzův název řádku z výletu 2, bez popisu (hodiny se u výletů liší). U mentora malý portrét Honzy. */}
          <ul className="svc grid-3">
            <li><h3>Pilot-mentor a&nbsp;doprovod</h3><p>Briefing, navigační příprava, frazeologie a&nbsp;podpora přímo v&nbsp;kabině</p>
              <HonzaWho /></li>
            <li><h3>Cessna&nbsp;182 a&nbsp;palivo</h3></li>
            <li><h3>Příprava a&nbsp;ForeFlight</h3><p>Pomoc s&nbsp;validací FAA a&nbsp;naplánováním tras</p></li>
            <li><h3>Pojištění letadla a&nbsp;poplatky FBO</h3><p>Pojištění podle podmínek půjčovny včetně přistávacích a&nbsp;tie-down poplatků</p></li>
            <li><h3>Místní pronájem auta</h3><p>Včetně rezervace a&nbsp;paliva</p></li>
          </ul>
        </div>
      </section>

      {/* ===== LETECKÉ VÝLETY (texty, údaje a ceny doslova podle Honzy, 10. 10. 2026) ===== */}
      <section className="sec" id="vylety" aria-labelledby="vylety-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Letecké výlety</span><h2 id="vylety-nadpis">Vyberte si podle dnů a&nbsp;letových hodin</h2></div>
            <p>V&nbsp;ceně je letadlo, palivo, pilot-mentor, letištní poplatky, pojištění a&nbsp;pronájem auta. Letenky a&nbsp;ubytování si klient hradí samostatně.</p>
          </div>
          <div className="pkgs">
            <article className="pkg" aria-labelledby="pkg1">
              <div className="pkg-img"><Photo photo="cessna-182-winter-haven" sizes="(max-width: 600px) 100vw, 580px" /></div>
              <h3 id="pkg1">Florida Week &amp; Fly</h3>
              <p className="sub">Létání v&nbsp;USA na zkoušku</p>
              <p>Zažijte týden VFR létání na Floridě. Procvičíte si anglickou leteckou frazeologii na amerických letištích, přistanete na ikonických ostrovních drahách, jako jsou Cedar Key nebo Albert Whitted v&nbsp;St.&nbsp;Petersburgu, a&nbsp;proletíte se podél pobřeží Mexického zálivu.</p>
              <dl className="pkg-data">
                <div><dt>Délka</dt><dd>6&nbsp;dní - 4&nbsp;letové a&nbsp;2&nbsp;volné dny na pláž, nákupy nebo návštěvu Universal Studios.</dd></div>
                <div><dt>Letadlo</dt><dd>Cessna&nbsp;182 Skylane - prostorný čtyřmístný stroj vhodný pro delší lety ve 2-3&nbsp;lidech.</dd></div>
                <div><dt>Nálet</dt><dd>12&nbsp;hodin</dd></div>
              </dl>
              <div className="pkg-price"><span className="from">od</span><strong>$7&nbsp;400&nbsp;USD</strong><span className="note">za osobu při 2&nbsp;pilotech. Pro 1&nbsp;pilota $13&nbsp;900&nbsp;USD.</span></div>
              <Link className="fa-link" href={tripPath("florida-week")}>Detail výletu <Arrow /></Link>
            </article>

            <article className="pkg" aria-labelledby="pkg2">
              <div className="pkg-img"><Photo photo="cessna-182-marco-island" sizes="(max-width: 600px) 100vw, 580px" /></div>
              <h3 id="pkg2">Florida Grand&nbsp;Tour &amp; Fly</h3>
              <p className="sub">9&nbsp;dní&nbsp;na&nbsp;Floridě&nbsp;• 20&nbsp;letových&nbsp;hodin&nbsp;• Cessna&nbsp;182</p>
              <p>Intenzivní letecký pobyt zaměřený na delší navigační lety, americkou VFR komunikaci a&nbsp;létání v&nbsp;řízených prostorech. Trasy mohou vést podél pobřeží, přes Everglades, na Florida Keys nebo na sever ke St.&nbsp;Augustine.</p>
              <dl className="pkg-data">
                <div><dt>Délka</dt><dd>9&nbsp;dní - 6&nbsp;letových a&nbsp;3&nbsp;volné dny.</dd></div>
                <div><dt>Letadlo</dt><dd>Cessna&nbsp;182 Skylane.</dd></div>
                <div><dt>Nálet</dt><dd>20&nbsp;hodin, přibližně 3-3,5&nbsp;hodiny za letový den.</dd></div>
              </dl>
              <div className="pkg-price"><span className="from">od</span><strong>10&nbsp;800&nbsp;USD</strong><span className="note">za osobu při 2&nbsp;pilotech. Pro 1&nbsp;pilota 20&nbsp;100&nbsp;USD.</span></div>
              <Link className="fa-link" href={tripPath("grand-tour")}>Detail výletu <Arrow /></Link>
            </article>
          </div>
          <p className="pkgs-note">Cena nezahrnuje letenky, ubytování, stravu ani správní poplatek FAA za validaci průkazu.</p>
        </div>
      </section>

      {/* ===== JAK TO PROBÍHÁ (Honzův „Průběh přípravy“ z výletu 1). Kotva #postup je cíl přesměrování /validace/ ze starého webu. ===== */}
      <section className="sec sec--dark steps on-dark" id="postup" aria-labelledby="postup-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Jak to probíhá</span><h2 id="postup-nadpis">Průběh přípravy</h2></div>
            <p>Od ověření licence po letový program, podle výletu Florida Week &amp; Fly.</p>
          </div>
          <ol className="fa-steps" style={{ "--n": "3" } as CSSProperties}>
            <li><span className="fa-step-n" aria-hidden="true">01</span><h3>6-8&nbsp;týdnů před odletem</h3><p>Zahájíme ověření zahraniční pilotní licence u&nbsp;FAA (Foreign Pilot Verification).</p></li>
            <li><span className="fa-step-n" aria-hidden="true">02</span><h3>2&nbsp;týdny před odletem</h3><p>Online probereme trasy, pravidla VFR v&nbsp;USA a&nbsp;možnosti ubytování.</p></li>
            <li><span className="fa-step-n" aria-hidden="true">03</span><h3>Po příletu na Floridu</h3><p>Převezmete auto, ubytujete se a&nbsp;zahájíte letový program.</p></li>
          </ol>
          <div className="req">
            <h3>Požadavky na piloty</h3>
            <p><span className="todo">[doplnit od Honzy: požadavky na piloty - jaká licence, úroveň angličtiny (ICAO) a&nbsp;průkaz radiotelefonisty; co nabídne pilotům UL a&nbsp;lidem bez licence]</span></p>
          </div>
          <div className="steps-cta">
            <Link className="fa-dir" href={inquiryHref()}><span className="t">Poptat termín</span><Arrow /></Link>
            <p>Nebo zavolejte Honzovi: <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", NBSP)}</a></p>
          </div>
        </div>
      </section>

      {/* ===== KAM LETĚT (texty doslova z Honzova „Výběru destinací“, kódy letišť tak, jak je uvádí) ===== */}
      <section className="sec sec--white" id="kam-letet" aria-labelledby="kam-letet-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Kam letět</span><h2 id="kam-letet-nadpis">Kam z&nbsp;Orlanda doletět</h2></div>
            <p><strong>Orlando North Airpark (FA83) - Naše domovská základna</strong><br />Malé, komunitní a&nbsp;dříve zemědělské letiště s&nbsp;pohodovou atmosférou, které slouží jako ideální výchozí bod pro úniky z&nbsp;turistického shonu Orlanda.</p>
          </div>
          <div className="grid-4">
            <Link className="tip" href={destinationPath("cedar-key")}>
              <div className="tip-img"><Photo photo="cedar-key-letecky" sizes={TIP_SIZES} /></div>
              <h3>Cedar Key</h3>
              <div className="route">FA83 <Arrow /> KCDK</div>
              <p>Unikátní asfaltová dráha doslova na krok od Mexického zálivu.</p>
            </Link>
            <Link className="tip" href={destinationPath("albert-whitted")}>
              <div className="tip-img"><Photo photo="albert-whitted-letecky" sizes={TIP_SIZES} /></div>
              <h3>Albert Whitted, St.&nbsp;Petersburg</h3>
              <div className="route">FA83 <Arrow /> KSPG</div>
              <p>Přiblížení (approach) s&nbsp;výhledem na mrakodrapy a&nbsp;tyrkysovou hladinu zálivu je nezapomenutelný zážitek.</p>
            </Link>
            <Link className="tip" href={destinationPath("merritt-island")}>
              <div className="tip-img"><Photo photo="merritt-island-pristani" sizes={TIP_SIZES} /></div>
              <h3>Merritt Island</h3>
              <div className="route">FA83 <Arrow /> KCOI</div>
              <p>Je to ideální a&nbsp;nejbližší letecká brána pro půldenní exkurzi do Kennedy Space Center.</p>
            </Link>
            <Link className="tip" href={destinationPath("key-west-everglades")}>
              <div className="tip-img"><Photo photo="key-west-plaz" sizes={TIP_SIZES} /></div>
              <h3>Key&nbsp;West &amp; Everglades</h3>
              <div className="route">FA83 <Arrow /> EYW</div>
              <p>Přistání na Key Westu nabízí ikonické panorama korálových ostrovů a&nbsp;tyrkysového moře pod křídly.</p>
            </Link>
          </div>
          <p className="sec-more"><Link className="fa-link" href={ROUTES.destinations}>Všechny destinace <Arrow /></Link></p>
        </div>
      </section>

      {/* ===== VÁŠ MENTOR (Honzův text „O mně“, serif = mluví Honza) ===== */}
      <section className="sec" id="honza" aria-labelledby="honza-nadpis">
        <div className="fa-wrap about">
          <Figure photo="honza-mustang-goteborg" sizes="(max-width: 960px) 90vw, 440px" className="fig fig--34" />
          <div>
            <span className="lbl">Váš mentor</span>
            <h2 id="honza-nadpis">Honza Čermák</h2>
            <blockquote className="voice voice--quote">„Létání pro mě není jen o&nbsp;přesunu z&nbsp;bodu&nbsp;A do bodu&nbsp;B - je o&nbsp;vášni, přátelství, o&nbsp;rozhodování, důkladné přípravě a&nbsp;jistotě za řízením i&nbsp;na zemi a&nbsp;hlavně o&nbsp;nikdy nekončícím procesu učení.“</blockquote>
            <p className="voice">Velmi oblíbenou část mého leteckého života tvoří také mezinárodní přelety a&nbsp;dodávky nových i&nbsp;olétaných strojů majitelům po celé Evropě, USA a&nbsp;Blízkém východě.</p>
            <Link className="fa-link" href={ROUTES.mentor}>Víc o&nbsp;Honzovi <Arrow /></Link>
          </div>
        </div>
      </section>

      <HomeDiary />

      {/* ===== VÝZVA K POPTÁVCE ===== */}
      <CtaSection id="poptat" />
    </>
  );
}

/**
 * Šířky varianty úvodní fotky pro mobil (model: 800w, 1900w a 2400w). Pod
 * 640 px je fotka na mobilu zbytečně malá (vykreslená je asi 940 px široká),
 * nad 2400 px by telefon se 3x displejem stahoval celý originál.
 */
const HERO_MOBILE_MIN_WIDTH = 640;
const HERO_MOBILE_MAX_WIDTH = 2400;

/**
 * Úvodní fotka přes celou šířku jako <picture> z modelu, s variantami od
 * next/image (getImageProps). Fotka je ořezaná (object-fit: cover), na
 * mobilu je vykreslená asi 940 px široká podle výšky úvodu, ne podle šířky
 * okna. Mobil má vlastní sadu jen do 2400 px, aby telefon se 3x displejem
 * nestahoval celý originál. Počítač a tablet dostanou i originál 3110 px pro
 * retina displej. První fotka stránky: bez líného načítání, vysoká priorita.
 */
function HeroPicture() {
  const photo = photos["uvod-jezera-lake-wales"];
  const common = { src: photo.src, width: photo.width, height: photo.height, alt: photo.alt };
  const {
    props: { srcSet: mobileSrcSet },
  } = getImageProps({ ...common, sizes: "940px" });
  const { props: desktop } = getImageProps({
    ...common,
    sizes: "(max-width: 1013px) 1013px, 100vw",
    loading: "eager",
    fetchPriority: "high",
  });
  return (
    <picture>
      <source
        media="(max-width: 600px)"
        srcSet={limitSrcSet(mobileSrcSet, HERO_MOBILE_MIN_WIDTH, HERO_MOBILE_MAX_WIDTH)}
        sizes="940px"
        width={photo.width}
        height={photo.height}
      />
      <img {...desktop} src={desktop.src} alt={photo.alt} />
    </picture>
  );
}

/** Jen položky srcset se šířkou od min do max (next/image dává všechny šířky z next.config.ts). */
function limitSrcSet(srcSet: string | undefined, min: number, max: number): string | undefined {
  if (!srcSet) return srcSet;
  return srcSet
    .split(", ")
    .filter((entry) => {
      const width = Number.parseInt(entry.slice(entry.lastIndexOf(" ") + 1), 10);
      return width >= min && width <= max;
    })
    .join(", ");
}

/**
 * Z cest na úvodu: nejnovější publikovaný článek jako karta z modelu (fotka,
 * rok, titulek, perex v serifu) a pod ním odkaz na druhý nejnovější a na
 * všechny články. Bez publikovaných článků se sekce nevykreslí. Podpis „Honza
 * Čermák“ z modelu tu není: databáze autora nemá, u archivních článků není
 * jistý (Oblet Ameriky je psaný ve třetí osobě) a stránka Z cest ho také nemá.
 */
async function HomeDiary() {
  const [latest, older] = await getLatestPublishedPosts(2);
  if (!latest) return null;
  const image = latest.image;
  return (
    // ===== Z CEST: nejnovější článek =====
    <section className="sec sec--line" id="z-cest" aria-labelledby="z-cest-nadpis">
      {/* Článek bez titulní fotky: text přes celou šířku, ne v levém sloupci vedle prázdného místa. */}
      <div className="fa-wrap diary" style={image ? undefined : DIARY_WITHOUT_PHOTO}>
        {image ? (
          <Figure
            photo={{ src: image.url, width: image.width, height: image.height, alt: image.alt }}
            sizes="(max-width: 960px) 100vw, 600px"
            className="fig fig--43"
            blurDataURL={image.blur}
          />
        ) : null}
        <div>
          <div className="meta"><span className="lbl">Z&nbsp;cest</span><time className="date" dateTime={isoDate(latest.publishedAt)}>{yearOf(latest.publishedAt)}</time></div>
          <h2 id="z-cest-nadpis">{czechNbspText(postDisplayTitle(latest.title))}</h2>
          {latest.perex ? <p className="voice">{czechNbspText(latest.perex)}</p> : null}
          <p className="sec-more diary-more"><Link className="fa-link" href={postPath(latest.slug)}>Číst celý článek <Arrow /></Link></p>
          {older ? (
            <p className="diary-older">Starší článek: <Link href={postPath(older.slug)}>{czechNbspText(`${postDisplayTitle(older.title)}, ${yearOf(older.publishedAt)}`)}</Link><span className="dot" aria-hidden="true"></span><Link href={ROUTES.posts}>Všechny články</Link></p>
          ) : (
            <p className="diary-older"><Link href={ROUTES.posts}>Všechny články</Link></p>
          )}
        </div>
      </div>
    </section>
  );
}

const DIARY_WITHOUT_PHOTO: CSSProperties = { gridTemplateColumns: "minmax(0, 1fr)" };
