import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { Figure } from "@/components/web/Figure";
import { PageHead } from "@/components/web/PageHead";
import { isoDate, yearOf } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { postDisplayTitle } from "@/lib/post-title";
import { getPublishedPosts } from "@/lib/public-posts";
import { ROUTES, postPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";

// Váš mentor (dřív O Honzovi) podle prototyp/o-honzovi.html. Text „O mně“ je Honzova verze 2
// z modelu, doslova. Slovo „instruktor“ je v něm Honzovo, v našich textech
// je Honza vždy mentor.
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
 * Na webu se ukáže jen publikovaný článek: článek 2025 je zatím koncept
 * a odkaz na něj by vedl na 404.
 */
const FERRY_FLIGHT_SLUGS = ["dalsi-prelet-oceanu-2025", "druhy-prelet-atlantiku-2017"];

export default function MentorPage() {
  return (
    <>
      {/* ===== ZÁHLAVÍ STRÁNKY (stránka sekce: bez drobečků) ===== */}
      <PageHead
        label="Váš mentor"
        title="Honza Čermák"
        perex={<>Pilot a&nbsp;mentor, se kterým poletíte po Floridě. Svůj příběh popisuje sám.</>}
      />

      {/* ===== O MNĚ: Honzův text doslova (serif = mluví Honza). Na mobilu fotka nad textem. ===== */}
      <section className="sec sec--tight honza-uvod" aria-labelledby="omne-nadpis">
        <div className="fa-wrap honza-grid">
          <Figure photo="honza-mustang-goteborg" sizes="(max-width: 960px) 90vw, 400px" className="fig fig--34" credit priority />
          <div className="prose">
            <h2 id="omne-nadpis">O&nbsp;mně</h2>
            <p>Moje vášeň pro letectví začala už ve 14&nbsp;letech, kdy jsem v&nbsp;roce 1995 poprvé odlepil kola od země na větroních v&nbsp;kolínském aeroklubu. To, co začalo jako klukovský dětský sen, se v&nbsp;roce 2010 stalo mou plnohodnotnou profesí, když jsem se vydal na dráhu nezávislého letového instruktora.</p>
            <p>Dnes jsem obchodním pilotem a&nbsp;instruktorem letadel i&nbsp;vrtulníků s&nbsp;celkovým náletem něco přes 6000&nbsp;hodin. V&nbsp;držení mám evropské i&nbsp;americké doložky pro jednomotorové i&nbsp;vícemotorové letouny, přístrojové létání (IFR) a&nbsp;vrtulníky. Mé zkušenosti sahají od malých pístových strojů přes vrtulníky letecké záchranné služby (HEMS) až po vícemotorové a&nbsp;proudové letouny. Jako instruktor se zaměřuji na praktický výcvik pilotů od PPL a&nbsp;CPL až po doložky NIGHT a&nbsp;IFR a&nbsp;v&nbsp;poslední době hlavně na „flight mentoring“ pilotům majitelům.</p>
            <p>Velmi oblíbenou část mého leteckého života tvoří také mezinárodní přelety a&nbsp;dodávky nových i&nbsp;olétaných strojů majitelům po celé Evropě, USA a&nbsp;Blízkém východě.</p>
            <p>Žádnou kategorii letectví přitom nepovažuji za druhořadou a&nbsp;žádnou neupřednostňuji - každé létání má své jedinečné kouzlo. Rád sedám i&nbsp;do ultralehkých letadel, kde mě baví především čistá svoboda v&nbsp;legislativě, jednoduchost a&nbsp;dostupné náklady, díky kterým je létání blízko k&nbsp;ryzí radosti z&nbsp;pohybu ve vzduchu.</p>
            <p>Létání pro mě není jen o&nbsp;přesunu z&nbsp;bodu&nbsp;A do bodu&nbsp;B - je o&nbsp;vášni, přátelství, o&nbsp;rozhodování, důkladné přípravě a&nbsp;jistotě za řízením i&nbsp;na zemi a&nbsp;hlavně o&nbsp;nikdy nekončícím procesu učení. Ať už plánujeme dálkový přelet, zdokonalujeme přístrojové přiblížení nebo se učíte naplno využít potenciál svého stroje, mým hlavním cílem je vytvořit bezpečné, profesionální a&nbsp;přátelské prostředí. Těším se na společné hodiny v&nbsp;oblacích i&nbsp;sdílení zkušeností a&nbsp;nevšedních zážitků na zemi!</p>
            <p className="sig">Honza Čermák</p>
          </div>
          {/* Panel „V číslech“ skrytý, dokud Honza čísla nepošle (o čísla zatím nebyl žádán, nevyplňovat sami).
               Po doplnění vrátit a v src/styles/web.css doplnit oblast „cisla“ do .honza-grid.
          <aside className="aside" aria-labelledby="cisla-nadpis">
            <span className="lbl" id="cisla-nadpis">V číslech</span>
            <dl className="dest-data">
              <div><dt>V USA létá od</dt><dd>…</dd></div>
              <div><dt>Nalétané hodiny</dt><dd>…</dd></div>
              <div><dt>Přelety oceánu</dt><dd>…</dd></div>
            </dl>
          </aside>
          */}
        </div>
      </section>

      {/* ===== FOTKY S HONZOU z archivu starého webu (popisky doslova z galerií) ===== */}
      <section className="sec sec--white" aria-labelledby="foto-nadpis">
        <div className="fa-wrap">
          <div className="sec-head">
            <div><span className="lbl">Fotky</span><h2 id="foto-nadpis">Z&nbsp;cest a&nbsp;přeletů</h2></div>
            <p>Fotky z&nbsp;archivu FLY America.</p>
          </div>
          <div className="gallery">
            <Figure photo="honza-lake-powell" sizes={GALLERY_SIZES} />
            <Figure photo="honza-vision-jet" sizes={GALLERY_SIZES} />
            <Figure photo="honza-robinson" sizes={GALLERY_SIZES} />
            <Figure photo="honza-gronsko" sizes={GALLERY_SIZES} />
            <Figure photo="honza-mustang-kalmar" sizes={GALLERY_SIZES} />
            <Figure photo="honza-r44" sizes={GALLERY_SIZES} />
          </div>
        </div>
      </section>

      {/* ===== Z CEST A KONTAKT ===== */}
      <section className="sec sec--tight" aria-labelledby="denik-nadpis">
        <div className="fa-wrap honza-denik">
          <div>
            <span className="lbl">Z&nbsp;cest</span>
            <h2 id="denik-nadpis">Přelety popsané Honzou</h2>
          </div>
          <div>
            <FerryFlightPosts />
            <p className="sec-more"><Link className="fa-link" href={ROUTES.posts}>Všechny články z&nbsp;cest <Arrow /></Link><Link className="fa-link" href={ROUTES.contact}>Kontakt na Honzu <Arrow /></Link></p>
          </div>
        </div>
      </section>

      {/* Výzva na konci stránky */}
      <CtaSection />
    </>
  );
}

/**
 * Seznam Honzových článků o přeletech (.honza-clanky): rok a titulek
 * z databáze, jen publikované. Když není publikovaný žádný, seznam se
 * nevykreslí a zůstanou odkazy na Z cest a kontakt.
 */
async function FerryFlightPosts() {
  const published = await getPublishedPosts();
  const posts = FERRY_FLIGHT_SLUGS.flatMap((slug) => published.filter((post) => post.slug === slug));
  if (posts.length === 0) return null;
  return (
    <ul className="honza-clanky">
      {posts.map((post) => (
        <li key={post.id}>
          <time className="date" dateTime={isoDate(post.publishedAt)}>{yearOf(post.publishedAt)}</time>
          <Link href={postPath(post.slug)}>{czechNbspText(postDisplayTitle(post.title))}</Link>
        </li>
      ))}
    </ul>
  );
}
