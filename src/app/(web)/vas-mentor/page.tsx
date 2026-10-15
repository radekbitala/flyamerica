import Link from "next/link";
import type { CSSProperties } from "react";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { Figure, PAGE_PHOTO_SIZES } from "@/components/web/Figure";
import { PageHead } from "@/components/web/PageHead";
import { SectionSign } from "@/components/web/SectionSign";
import { isoDate } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { postDisplayTitle } from "@/lib/post-title";
import { postYear } from "@/lib/post-year";
import { getPublishedPosts } from "@/lib/public-posts";
import { ROUTES, postPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";

// Váš mentor (dřív O Honzovi) podle prototyp/o-honzovi.html. Text „O mně“ je Honzova verze 2
// (podklady-od-Honzy/2026-10-10_o-mne-v2.md), doslova. Slovo „instruktor“ je
// v něm Honzovo, v našich textech je Honza vždy mentor.
//
// Čtecí rozložení jako články Z cest (12. 10. 2026, src/styles/pages/article.css):
// záhlaví a text ve sloupci 680 px na střed, velká fotka Honzy z fotobanky
// pod záhlavím přes celý kontejner, galerie přes celý kontejner. Polohové
// tabule: „Váš mentor“ nad h1 a „Fotky“ (od záhlaví je dělí fotka a celý
// text, od patičky galerie). Sekce článků je těsně nad výzvou a patičkou
// s tabulí FA83, proto má šedý štítek. Hierarchie nadpisů (úprava 40 z auditu,
// article.css): „O mně“ je hlavní text stránky, má velikost h2 sekcí (Headline,
// třída headline), nadpisy obou vedlejších sekcí jsou menší (headline-md).
//
// Fakta „V kostce“ u textu O mně (podnět Radka 15. 10. 2026: „zajímavá fakta jako nálet
// a kvalifikace zvýraznit nebo dát bokem“). Zvažované varianty: okrajová poznámka
// „V kostce“ vedle textu (vybraná), pruh „Honza ve zkratce“ se čtyřmi velkými čísly
// přes šířku fotky a „Karta pilota“ jako bílý panel nad textem. Vybraná je okrajová
// poznámka: od 1200 px stojí v pravém okraji vedle textu, takže Honzův text zůstává
// na svém místě a perex „Svůj příběh popisuje sám.“ vede rovnou na něj, pod 1200 px je
// to bílý boční panel nad textem (stejný vzor jako obsah článku „V článku“ v article.css).
// Pruh by na čtecí stránku přinesl novou širokou řadu statistik a skoro doslova
// opakoval Honzův text 72 px pod sebou, karta by i na počítači odsunula Honzův text
// pod naše shrnutí (asi o 540 px) a míchala dva datové styly v jednom panelu. Na
// telefonu jsou fakta ve všech variantách nad textem. Z obou převzato: řádek
// Kvalifikace, nálet jako první údaj, malé „přes“ a „hodin“ u velkého čísla (jako
// „od 7 400 USD“) a krátké popisky na jeden řádek.
export const metadata = pageMetadata({
  title: "Váš mentor",
  description:
    "Honza Čermák, pilot a mentor FLY America: jeho cesta k létání, zkušenosti a fotky z cest a přeletů.",
  path: ROUTES.mentor,
});

/** sizes fotky v galerii (3 / 2 / 1 sloupec). */
const GALLERY_SIZES = "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 370px";

/**
 * Honzovy články o přeletech v pořadí z modelu (slugy z migrace/posts.json).
 * Na webu se ukáže jen publikovaný článek: koncept by vedl na 404. Článek
 * 2025 se v seznamu objeví po publikaci, i bez titulní fotky (seznam fotky
 * nemá).
 */
const FERRY_FLIGHT_SLUGS = ["dalsi-prelet-oceanu-2025", "druhy-prelet-atlantiku-2017"];

/** Údaj v bloku „V kostce“: text, nebo velké číslo s volitelným malým slovem před a za ním. */
type MentorFact = {
  label: string;
  text?: string;
  figure?: { before?: string; value: string; after?: string };
  /** Na telefonu dva údaje vedle sebe. Párové údaje jdou vždy po dvou hned za sebou. */
  pair?: boolean;
};

/**
 * Fakta o Honzovi pro blok „V kostce“, jediný zdroj. Jen údaje z jeho textu O mně
 * (podklady-od-Honzy/2026-10-10_o-mne-v2.md), zkrácené naše formulace bez nových
 * tvrzení. Nikdy „instruktor“ ani „výcvik“ (v našich textech je Honza mentor)
 * a žádné FAA, EASA, CPL ani EU, které Honza nenapsal. Když Honza text O mně změní,
 * upravit i tady. Blok dát Honzovi ke schválení.
 *
 * Blok nahradil skrytý panel „V číslech“. Čísla, která Honza zatím neposlal, mají
 * místo na konci pole (zakomentované). Až přijdou, přidat je jako údaje s `figure`
 * (dvě krátká čísla jako pár `pair`) a znovu změřit výšku bloku: od 1200 px podle ní
 * platí přilepení v article.css (min-height), na 320 px je to výška panelu nad textem.
 */
const MENTOR_FACTS: readonly MentorFact[] = [
  { label: "Celkový nálet", figure: { before: "přes", value: "6 000", after: "hodin" } },
  { label: "Létá od", figure: { value: "1995" }, pair: true },
  { label: "Profesně od", figure: { value: "2010" }, pair: true },
  { label: "Kvalifikace", text: "Obchodní pilot" },
  { label: "Doložky", text: "Evropské i americké pro jednomotorové i vícemotorové letouny, IFR a vrtulníky" },
  { label: "Zkušenosti", text: "Malé pístové stroje, vrtulníky záchranné služby (HEMS), proudové letouny" },
  { label: "Přelety a dodávky", text: "Letadla majitelům po Evropě, USA a Blízkém východě" },
  // Až Honza pošle (BACKLOG-po-spusteni.md, otázka 10), neodhadovat ani nedopočítávat:
  // { label: "V USA létá od", figure: { value: "…" } },
  // { label: "Přelety oceánu", figure: { value: "…" } },
  // { label: "Výpravy s klienty", figure: { value: "…" } },
];

export default function MentorPage() {
  return (
    <>
      {/* ===== ZÁHLAVÍ STRÁNKY ve sloupci textu (stránka sekce: bez drobečků) ===== */}
      <div className="read-head">
        <PageHead
          label="Váš mentor"
          title="Honza Čermák"
          perex={<>Pilot a&nbsp;mentor, se kterým poletíte po Floridě. Svůj příběh popisuje sám.</>}
        />
      </div>

      {/* ===== VELKÁ FOTKA: Honza u Vision Jetu (fotobanka, honza-knoxville-04), výřez s letadlem i Honzou ===== */}
      <div className="fa-wrap">
        <Figure
          photo="z-cest/honza-knoxville-04"
          sizes={PAGE_PHOTO_SIZES}
          className="page-photo read-hero"
          style={{ "--pos": "50% 70%" } as CSSProperties}
          credit
          priority
        />
      </div>

      {/* ===== O MNĚ: Honzův text doslova (serif = mluví Honza) ve sloupci textu, vedle něj fakta „V kostce“ ===== */}
      <section className="sec sec--tight" aria-labelledby="omne-nadpis">
        <div className="fa-wrap">
          <div className="read-body read-body--facts">
            <MentorFacts />
            <div className="prose">
              <h2 id="omne-nadpis" className="headline">O&nbsp;mně</h2>
                <p>Moje vášeň pro letectví začala už ve 14&nbsp;letech, kdy jsem v&nbsp;roce 1995 poprvé odlepil kola od země na větroních v&nbsp;kolínském aeroklubu. To, co začalo jako klukovský dětský sen, se v&nbsp;roce 2010 stalo mou plnohodnotnou profesí, když jsem se vydal na dráhu nezávislého letového instruktora.</p>
                <p>Dnes jsem obchodním pilotem a&nbsp;instruktorem letadel i&nbsp;vrtulníků s&nbsp;celkovým náletem něco přes 6000&nbsp;hodin. V&nbsp;držení mám evropské i&nbsp;americké doložky pro jednomotorové i&nbsp;vícemotorové letouny, přístrojové létání (IFR) a&nbsp;vrtulníky. Mé zkušenosti sahají od malých pístových strojů přes vrtulníky letecké záchranné služby (HEMS) až po vícemotorové a&nbsp;proudové letouny. Jako instruktor se zaměřuji na praktický výcvik pilotů od PPL a&nbsp;CPL až po doložky NIGHT a&nbsp;IFR a&nbsp;v&nbsp;poslední době hlavně na „flight mentoring“ pilotům majitelům.</p>
                <p>Velmi oblíbenou část mého leteckého života tvoří také mezinárodní přelety a&nbsp;dodávky nových i&nbsp;olétaných strojů majitelům po celé Evropě, USA a&nbsp;Blízkém východě.</p>
                <p>Žádnou kategorii letectví přitom nepovažuji za druhořadou a&nbsp;žádnou neupřednostňuji - každé létání má své jedinečné kouzlo. Rád sedám i&nbsp;do ultralehkých letadel, kde mě baví především čistá svoboda v&nbsp;legislativě, jednoduchost a&nbsp;dostupné náklady, díky kterým je létání blízko k&nbsp;ryzí radosti z&nbsp;pohybu ve vzduchu.</p>
                <p>Létání pro mě není jen o&nbsp;přesunu z&nbsp;bodu&nbsp;A do bodu&nbsp;B - je o&nbsp;vášni, přátelství, o&nbsp;rozhodování, důkladné přípravě a&nbsp;jistotě za řízením i&nbsp;na zemi a&nbsp;hlavně o&nbsp;nikdy nekončícím procesu učení. Ať už plánujeme dálkový přelet, zdokonalujeme přístrojové přiblížení nebo se učíte naplno využít potenciál svého stroje, mým hlavním cílem je vytvořit bezpečné, profesionální a&nbsp;přátelské prostředí. Těším se na společné hodiny v&nbsp;oblacích i&nbsp;sdílení zkušeností a&nbsp;nevšedních zážitků na zemi!</p>
              <p className="sig">Honza Čermák</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOTKY S HONZOU z archivu starého webu (popisky doslova z galerií) ===== */}
      <section className="sec sec--white" aria-labelledby="foto-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div>
              <SectionSign>Fotky</SectionSign>
              <h2 id="foto-nadpis" className="headline-md">
                Z&nbsp;cest a&nbsp;přeletů
              </h2>
            </div>
            <p>Fotky z&nbsp;archivu FLY America.</p>
          </div>
          <div className="gallery">
            <Figure photo="honza-lake-powell" sizes={GALLERY_SIZES} />
            <Figure photo="z-cest/honza-key-west-09" sizes={GALLERY_SIZES} />
            <Figure photo="honza-robinson" sizes={GALLERY_SIZES} />
            <Figure photo="honza-gronsko" sizes={GALLERY_SIZES} />
            <Figure photo="honza-mustang-kalmar" sizes={GALLERY_SIZES} />
            <Figure photo="honza-r44" sizes={GALLERY_SIZES} />
          </div>
        </div>
      </section>

      {/* ===== Z CEST A KONTAKT ve sloupci textu ===== */}
      <section className="sec sec--tight" aria-labelledby="denik-nadpis">
        <div className="fa-wrap">
          <div className="read-body">
            <div className="read-col mentor-posts">
              <span className="lbl">Z&nbsp;cest</span>
              <h2 id="denik-nadpis" className="headline-md">
                Přelety popsané Honzou
              </h2>
              <FerryFlightPosts />
              <p className="sec-more">
                <Link className="fa-link" href={ROUTES.posts}>
                  Všechny články z&nbsp;cest <Arrow />
                </Link>
                <Link className="fa-link" href={ROUTES.contact}>
                  Kontakt na Honzu <Arrow />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Výzva na konci stránky */}
      <CtaSection />
    </>
  );
}

/**
 * Blok „V kostce“ (.mentor-facts, article.css): štítek a seznam údajů dl/dt/dd
 * z MENTOR_FACTS. V HTML stojí před textem O mně, protože na telefonu a tabletu
 * je panel nad textem (pořadí čtení odpovídá pořadí na obrazovce). Od 1200 px
 * stojí v pravém okraji v řádku s nadpisem O mně.
 */
function MentorFacts() {
  return (
    <aside className="aside mentor-facts" aria-labelledby="fakta-nadpis">
      <span className="lbl" id="fakta-nadpis">V&nbsp;kostce</span>
      <dl className="dest-data">
        {MENTOR_FACTS.map((fact) => (
          <div key={fact.label} className={fact.pair ? "mentor-facts-pair" : undefined}>
            <dt>{czechNbspText(fact.label)}</dt>
            <dd>
              {fact.figure ? (
                <>
                  {fact.figure.before ? <span className="mentor-facts-unit">{fact.figure.before}&nbsp;</span> : null}
                  <span className="mentor-facts-num">{czechNbspText(fact.figure.value)}</span>
                  {fact.figure.after ? <span className="mentor-facts-unit">&nbsp;{fact.figure.after}</span> : null}
                </>
              ) : (
                czechNbspText(fact.text ?? "")
              )}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

/**
 * Seznam Honzových článků o přeletech (.honza-clanky): rok cesty (postYear,
 * úprava 33) a titulek z databáze, jen publikované. Když není publikovaný
 * žádný, seznam se nevykreslí a zůstanou odkazy na Z cest a kontakt.
 */
async function FerryFlightPosts() {
  const published = await getPublishedPosts();
  const posts = FERRY_FLIGHT_SLUGS.flatMap((slug) => published.filter((post) => post.slug === slug));
  if (posts.length === 0) return null;
  return (
    <ul className="honza-clanky">
      {posts.map((post) => (
        <li key={post.id}>
          <time className="date" dateTime={isoDate(post.publishedAt)}>{postYear(post)}</time>
          <Link href={postPath(post.slug)}>{czechNbspText(postDisplayTitle(post.title))}</Link>
        </li>
      ))}
    </ul>
  );
}
