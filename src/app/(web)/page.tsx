import type { CSSProperties } from "react";
import Link from "next/link";
import { getImageProps } from "next/image";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { Figure } from "@/components/web/Figure";
import { HonzaIntro } from "@/components/web/HonzaWho";
import { Photo } from "@/components/web/Photo";
import { PilotRequirements } from "@/components/web/PilotRequirements";
import { SectionSign } from "@/components/web/SectionSign";
import { inquiryHref } from "@/components/web/nav";
import { photos } from "@/data/photos";
import { PRICE_EXCLUDES, TRIPS, cheapestTrip, formatTripSubtitle, tripFact, type Trip } from "@/data/trips";
import { pageMetadata } from "@/lib/metadata";
import { postDisplayTitle } from "@/lib/post-title";
import { postYear } from "@/lib/post-year";
import { getLatestPublishedPosts } from "@/lib/public-posts";
import { ROUTES, destinationPath, postPath, tripPath } from "@/lib/routes";
import { FA_PHONE, FA_PHONE_HREF } from "@/lib/site";
import { NBSP, czechNbspText } from "@/lib/typography";
import { TripCardPhoto } from "./letecke-vylety/_components/TripCardPhoto";

// Úvodní stránka podle prototyp/index.html. Texty doslova z modelu, sekce
// Z cest bere nejnovější publikované články z databáze.
//
// Polohové tabule (SectionSign, 12. 10. 2026): Letecké výlety, Kam letět
// a Z cest, tedy každá druhá sekce. Mezi dvěma tabulemi i od kódu FA83
// v úvodu a v patičce je vždy víc než výška obrazovky (1440 x 900
// i 375 x 667, DESIGN.md: The One Location Sign Rule). Co za vás zařídíme,
// Průběh přípravy a Váš mentor jsou bez štítku, nadpis stačí sám.
export const metadata = pageMetadata({
  title: "FLY America - létání na Floridě s mentorem",
  absoluteTitle: true,
  description:
    "Létání s českými piloty na Floridě. Domovská základna Orlando North Airpark (FA83), Cessna 182 a mentor Honza Čermák.",
  path: "/",
});

/**
 * sizes dlaždice tipu v .grid-4 (4 / 2 sloupce, pod 601 px seznam s náhledem
 * 112 px vlevo jako na stránce Kam letět, home.css). Model ji vkládá bez srcset.
 */
const TIP_SIZES = "(max-width: 600px) 112px, (max-width: 1100px) 50vw, 270px";

/** sizes fotky karty výletu (.pkgs: 2 sloupce, pod 601 px jeden). */
const CARD_SIZES = "(max-width: 600px) 100vw, 580px";

/** sizes fotky Honzy v „Co za vás zařídíme“ (home.css: 320 px, pod 961 px 30 % šířky, pod 601 px celá šířka). */
const SERVICE_PHOTO_SIZES = "(max-width: 600px) calc(100vw - 32px), (max-width: 960px) 30vw, 320px";

/**
 * „Co za vás zařídíme“: Honzovy řádky tabulky „Co zahrnuje cena“ (Florida
 * Week & Fly, src/data/trips.ts) s „ANO“, v jeho pořadí, názvy i popisy
 * doslova. Výjimka je druhý řádek (letadlo a palivo), náš text: Honzovy
 * řádky platí jen pro jeden výlet („Pronájem C182 a palivo 12 hodin“,
 * „Cessna 182 a palivo | 20 letových hodin včetně paliva.“) a letadlo se na
 * úvodu jmenuje jednou, v popisu sekce výletů („Cessnou 182 Skylane“,
 * Radkův bod 3 z 12. 10. 2026). Ubytování a letenky („NE“) jsou v poznámce
 * pod výlety.
 */
const SERVICES: readonly { name: string; text: string }[] = [
  { name: "Pilot-mentor a doprovod", text: "Briefing, navigační příprava, frazeologie a podpora přímo v kabině" },
  { name: "Letadlo a palivo", text: "Podle výletu 12 nebo 20 letových hodin včetně paliva" },
  {
    name: "Pojištění letadla a poplatky FBO",
    text: "Pojištění podle podmínek půjčovny včetně přistávacích a tie-down poplatků",
  },
  { name: "Místní pronájem auta", text: "Včetně rezervace a paliva" },
  { name: "Příprava a ForeFlight", text: "Pomoc s validací FAA a naplánováním tras" },
];

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
              {/* Cena nejlevnějšího výletu z trips.ts (úprava 15 a 20, rozhodnutí 14. 10. 2026). „za osobu“ jako v poznámce
                   pod cenou, „při 2 pilotech“ už ne: na 320 a 375 px by se odkaz zalomil na dva řádky. */}
              <a className="fa-link" href="#vylety">Výlety od {czechNbspText(cheapestTrip().price.from)} za&nbsp;osobu <Arrow /></a>
            </div>
          </div>
        </div>
        <p className="hero-cap">Jezera u&nbsp;Lake Wales. Foto: archiv FLY America</p>
      </section>

      {/* ===== CO ZA VÁS ZAŘÍDÍME (nejdřív nabídka služby). Položky v SERVICES, prodejní argumenty ze schůzky nepoužívat,
           dokud je Honza nepotvrdí. Bez štítku nad nadpisem: tabule je u výletů níž (nejvýš jedna v záběru, kód FA83 v úvodu).
           Rozložení (12. 10. 2026, Radek: body mají různý rozsah, mřížka na to není), zvažované varianty:
           A) Řádky jako letištní tabule: název vlevo, popis vpravo, mezi řádky vlasová linka (jako tabulky a údaje v kartě).
              Krátký i dlouhý popis drží stejnou osu, výška řádku roste jen s textem, nikde nezůstane prázdná buňka. VYBRÁNO.
           B) Dva sloupce s vyrovnanými řádky (grid-auto-rows: 1fr): pět položek dá 3 + 2, jedna buňka zůstane prázdná
              a krátké popisy („Včetně rezervace a paliva“) nechají v řádku díru stejně jako dosavadní mřížka 3 + 2.
           Malý portrét u položky mentora (HonzaWho) nahradila jedna fotka Honzy u Cessny 182 se jménem a odkazem.
           Role u fotky (15. 10. 2026, Radek: návštěvník neví, kdo je na fotce a proč tam je), zvažované varianty:
           1) Nadtitulek „Váš mentor“ štítkem .lbl nad jménem: pořadí jako položka menu a nadpis sekce níž, ale verzálky
              jsou v DESIGN.md navigační orientace nad nadpisem (The Label Rule), tahle sekce je výslovně bez štítku
              a v panelu Poptávka u výletu by byl druhý štítek hned pod štítkem „Poptávka“.
           2) Jméno a pod ním řádek role „Váš mentor v kabině“ ve stylu Caption (14 px, Šedá 600, popisky fotek): žádná
              další vrstva verzálek, „v kabině“ říká, proč tam fotka je (první řádek „Pilot-mentor a doprovod“, perex
              úvodu), slova jen z textů webu. Stejně u malého portrétu v panelu Poptávka (HonzaIntro). VYBRÁNO.
           3) Role přímo ve jménu „Váš mentor Honza Čermák“: o tři sekce níž by se doslova opakoval nadpis sekce Váš mentor
              a tučný řádek jména by u malého portrétu v panelu Poptávka byl dvakrát delší.
           Role je uvnitř figcaption, čtečka přečte jméno, roli a pak odkaz. ===== */}
      <section className="sec sec--tight sec--white" id="sluzba" aria-labelledby="sluzba-nadpis">
        <div className="fa-wrap home-svc">
          <h2 className="home-svc-title" id="sluzba-nadpis">Co za vás zařídíme</h2>
          <dl className="home-svc-list">
            {SERVICES.map((item) => (
              <div key={item.name}>
                <dt>{czechNbspText(item.name)}</dt>
                <dd>{czechNbspText(item.text)}</dd>
              </div>
            ))}
          </dl>
          <figure className="home-svc-who">
            <Photo photo="uvod/honza-death-valley-02" sizes={SERVICE_PHOTO_SIZES} />
            <figcaption>
              <HonzaIntro />
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ===== LETECKÉ VÝLETY (texty, údaje a ceny doslova podle Honzy ze src/data/trips.ts) =====
           Nadpis 12. 10. 2026 místo „Vyberte si podle dnů a letových hodin“ (zvažované i „Dva výlety po Floridě“
           a „12, nebo 20 letových hodin“). Letadlo je u obou výletů stejné, proto jen jednou v popisu sekce, v kartách
           už řádek Letadlo není. Co je v ceně, říká sekce výš, co v ní není, poznámka pod kartami. Fotky karet jsou
           místa z Honzova textu výletu (pobřeží Mexického zálivu, Florida Keys), ne letadlo, stejné jako na přehledu
           /letecke-vylety (TRIP_MEDIA). */}
      <section className="sec" id="vylety" aria-labelledby="vylety-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><SectionSign>Letecké výlety</SectionSign><h2 id="vylety-nadpis">Týden, nebo devět dní</h2></div>
            <p>Na obou výletech letíte Cessnou&nbsp;182 Skylane s&nbsp;mentorem v&nbsp;kabině. Výlety se liší délkou a&nbsp;počtem letových hodin.</p>
          </div>
          <div className="pkgs">
            {TRIPS.map((trip) => (
              <HomeTripCard key={trip.slug} trip={trip} />
            ))}
          </div>
          <p className="pkgs-note">{czechNbspText(PRICE_EXCLUDES)}</p>
        </div>
      </section>

      {/* ===== JAK TO PROBÍHÁ (Honzův „Průběh přípravy“ z výletu 1). Kotva #postup je cíl přesměrování /validace/ ze starého webu.
           Bez štítku a bez tabule: tabule výletů nad touto sekcí a Kam letět pod ní jsou blíž než výška obrazovky. ===== */}
      <section className="sec sec--dark steps on-dark" id="postup" aria-labelledby="postup-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><h2 id="postup-nadpis">Průběh přípravy</h2></div>
            <p>Od ověření licence po letový program, podle výletu Florida Week&nbsp;&amp;&nbsp;Fly.</p>
          </div>
          <ol className="fa-steps" style={{ "--n": "3" } as CSSProperties}>
            <li><span className="fa-step-n" aria-hidden="true">01</span><h3>6-8&nbsp;týdnů před odletem</h3><p>Zahájíme ověření zahraniční pilotní licence u&nbsp;FAA (Foreign Pilot Verification).</p></li>
            <li><span className="fa-step-n" aria-hidden="true">02</span><h3>2&nbsp;týdny před odletem</h3><p>Online probereme trasy, pravidla VFR v&nbsp;USA a&nbsp;možnosti ubytování.</p></li>
            <li><span className="fa-step-n" aria-hidden="true">03</span><h3>Po příletu na Floridu</h3><p>Převezmete auto, ubytujete se a&nbsp;zahájíte letový program.</p></li>
          </ol>
          {/* Honzovy požadavky na piloty (13. 10. 2026), text v src/data/pilot-requirements.ts */}
          <div className="req">
            <h3>Požadavky na piloty</h3>
            <PilotRequirements className="req-text" />
          </div>
          <div className="steps-cta">
            <Link className="fa-dir" href={inquiryHref()}><span className="t">Poptat termín</span><Arrow /></Link>
            <p>Nebo zavolejte Honzovi: <a href={FA_PHONE_HREF}>{FA_PHONE.replaceAll(" ", NBSP)}</a></p>
          </div>
        </div>
      </section>

      {/* ===== KAM LETĚT (texty doslova z Honzova „Výběru destinací“, kódy letišť tak, jak je uvádí).
           Dlaždice vedou na /kam-letet/<slug>: z webu se detail otevře v okně nad stránkou (@modal), přímá adresa je celá stránka.
           Fotky (úprava 9, rozhodnutí 14. 10. 2026): letiště a letadla místo pláže. Merritt Island je dráha raketoplánů
           na Cape Canaveral z výšky, Key West & Everglades naše Cessna 182 před Everglades Airpark (photos-destinations.ts).
           Pod 601 px seznam s náhledem jako na stránce Kam letět, Honzův výňatek jen na tabletu a počítači (home.css, R12). ===== */}
      <section className="sec sec--white" id="kam-letet" aria-labelledby="kam-letet-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><SectionSign>Kam letět</SectionSign><h2 id="kam-letet-nadpis">Kam z&nbsp;Orlanda doletět</h2></div>
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
              <p>Přiblížení s&nbsp;výhledem na nedaleké mrakodrapy a&nbsp;tyrkysovou hladinu zálivu je nezapomenutelný zážitek.</p>
            </Link>
            <Link className="tip" href={destinationPath("merritt-island")}>
              <div className="tip-img"><Photo photo="kam-letet/destinace-cape-canaveral-13" sizes={TIP_SIZES} /></div>
              <h3>Merritt Island</h3>
              <div className="route">FA83 <Arrow /> KCOI</div>
              <p>Je to ideální a&nbsp;nejbližší letecká brána pro cca půldenní exkurzi do Kennedy Space Center.</p>
            </Link>
            <Link className="tip" href={destinationPath("key-west-everglades")}>
              <div className="tip-img"><Photo photo="everglades-airpark" sizes={TIP_SIZES} /></div>
              <h3>Key&nbsp;West &amp; Everglades</h3>
              <div className="route">FA83 <Arrow /> EYW</div>
              <p>Přistání na Key Westu nabízí ikonické panorama korálových ostrovů a&nbsp;tyrkysového moře pod křídly.</p>
            </Link>
          </div>
          <p className="sec-more"><Link className="fa-link" href={ROUTES.destinations}>Všechny destinace <Arrow /></Link></p>
        </div>
      </section>

      {/* ===== VÁŠ MENTOR (Honzův text „O mně“, serif = mluví Honza). Bez tabule: Kam letět nad touto sekcí a Z cest pod ní
           ji mají a jsou blíž než výška obrazovky. Místo štítku „Váš mentor“ je role přímo v nadpisu. ===== */}
      <section className="sec" id="honza" aria-labelledby="honza-nadpis">
        <div className="fa-wrap about">
          <Figure photo="honza-mustang-goteborg" sizes="(max-width: 960px) 90vw, 440px" className="fig fig--34" />
          <div>
            <h2 id="honza-nadpis">Váš mentor Honza Čermák</h2>
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
 * Karta výletu z modelu (.pkg): fotka destinace (TRIP_MEDIA, stejná jako na
 * přehledu výletů), název, Honzův podtitul, text karty, délka a nálet
 * z přehledu programu, cena „od“ a odkaz na detail. Texty doslova ze
 * src/data/trips.ts, pevné mezery doplní czechNbspText(). Na detail vede
 * nadpis, fotka (mimo pořadí Tab, TripCardPhoto) a „Detail výletu“, karta
 * se celá odkazem nepřekrývá (úprava 28, styly .pkg v trips.css).
 */
function HomeTripCard({ trip }: { trip: Trip }) {
  const headingId = `pkg-${trip.slug}`;
  const length = tripFact(trip, "length");
  const hours = tripFact(trip, "hours");
  return (
    <article className="pkg" aria-labelledby={headingId}>
      <TripCardPhoto trip={trip} sizes={CARD_SIZES} />
      <h3 id={headingId}>
        <Link href={tripPath(trip.slug)}>{czechNbspText(trip.name)}</Link>
      </h3>
      <p className="sub">{formatTripSubtitle(trip.subtitle)}</p>
      <p>{czechNbspText(trip.teaser)}</p>
      <dl className="pkg-data">
        {length ? <div><dt>Délka</dt><dd>{czechNbspText(length)}</dd></div> : null}
        {hours ? <div><dt>Nálet</dt><dd>{czechNbspText(hours)}</dd></div> : null}
      </dl>
      <div className="pkg-price">
        <span className="from">od</span>
        <strong>{czechNbspText(trip.price.from)}</strong>
        <span className="note">{czechNbspText(trip.price.note)}</span>
      </div>
      <Link className="fa-link" href={tripPath(trip.slug)}>Detail výletu <Arrow /></Link>
    </article>
  );
}

/**
 * Šířky varianty úvodní fotky pro mobil (model: 800w, 1900w a 2400w). Pod
 * 640 px je fotka na mobilu zbytečně malá (vykreslená je asi 940 px široká).
 * Strop 1920 px (úprava 32, krok 1, rozhodnutí 14. 10. 2026, dřív 2400):
 * telefon s 2x i 3x displejem stáhne variantu 1920 px místo 2400 px, na
 * pomalé síti je úvod dřív vidět a fotka pod textem je pořád ostrá.
 */
const HERO_MOBILE_MIN_WIDTH = 640;
const HERO_MOBILE_MAX_WIDTH = 1920;

/**
 * Úvodní fotka přes celou šířku jako <picture> z modelu, s variantami od
 * next/image (getImageProps). Fotka je ořezaná (object-fit: cover), na
 * mobilu je vykreslená asi 940 px široká podle výšky úvodu, ne podle šířky
 * okna. Mobil má vlastní sadu jen do HERO_MOBILE_MAX_WIDTH, aby telefon
 * s 3x displejem nestahoval velkou variantu. Počítač a tablet dostanou
 * i originál 3110 px pro retina displej. Výřez na mobilu posouvá home.css.
 * První fotka stránky: bez líného načítání, vysoká priorita.
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
 * Název sekce je polohová tabule v řádku s rokem (poslední tabule stránky:
 * od Kam letět i od FA83 v patičce je dál než výška obrazovky).
 *
 * Rok u obou článků je rok cesty (postYear(), úprava 33, rozhodnutí
 * 14. 10. 2026): pole Rok cesty z administrace, jinak rok ze štítku titulku,
 * jinak rok publikace. Článek 2022 vyšel v listopadu 2023.
 */
async function HomeDiary() {
  const [latest, older] = await getLatestPublishedPosts(2);
  if (!latest) return null;
  const image = latest.image;
  const year = postYear(latest);
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
          <div className="meta"><SectionSign as="span">Z&nbsp;cest</SectionSign><time className="date" dateTime={year}>{year}</time></div>
          <h2 id="z-cest-nadpis">{czechNbspText(postDisplayTitle(latest.title))}</h2>
          {latest.perex ? <p className="voice">{czechNbspText(latest.perex)}</p> : null}
          <p className="sec-more diary-more"><Link className="fa-link" href={postPath(latest.slug)}>Číst celý článek <Arrow /></Link></p>
          {older ? (
            <p className="diary-older">Starší článek: <Link href={postPath(older.slug)}>{czechNbspText(`${postDisplayTitle(older.title)}, ${postYear(older)}`)}</Link><span className="dot" aria-hidden="true"></span><Link href={ROUTES.posts}>Všechny články</Link></p>
          ) : (
            <p className="diary-older"><Link href={ROUTES.posts}>Všechny články</Link></p>
          )}
        </div>
      </div>
    </section>
  );
}

const DIARY_WITHOUT_PHOTO: CSSProperties = { gridTemplateColumns: "minmax(0, 1fr)" };
