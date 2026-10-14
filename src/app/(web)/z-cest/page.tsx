import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { SectionSign } from "@/components/web/SectionSign";
import { isoDate } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { postDisplayTitle } from "@/lib/post-title";
import { postDateLabel } from "@/lib/post-year";
import { getPublishedPosts, type PublicPostSummary } from "@/lib/public-posts";
import { ROUTES, postPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { DiaryTeaser } from "./_components/DiaryTeaser";
import { PostImage } from "./_components/PostImage";

// Z cest (dřív Deník) podle prototyp/denik.html: nejnovější článek nahoře, starší jako
// karty. Všechny články jsou z databáze (jen publikované, nejnovější první),
// nejnovější článek i každá karta jsou celé odkaz na článek. Stránka se obnoví
// po každé změně článku v administraci (revalidatePublicPosts, src/lib/posts-cache.ts).
//
// Polohové tabule (DESIGN.md, The One Location Sign Rule): „Z cest“ nad h1
// a „Archiv“ nad staršími články. Mezi nimi je nejnovější článek s fotkou,
// takže jsou od sebe víc než výšku obrazovky (1440 x 900 i 375 x 667). Bez
// fotky by byl blok nízký a Archiv má šedý .lbl. Štítek „Nejnovější“ je hned
// pod záhlavím, proto zůstává šedý .lbl.

export const metadata = pageMetadata({
  title: "Z cest",
  description: "Články o létání po Floridě a USA a o přeletech letadel přes Atlantik, od roku 2010.",
  path: ROUTES.posts,
});

/** sizes fotky na kartě (.grid-3: 3 / 2 / 1 sloupec). */
const CARD_PHOTO_SIZES =
  "(max-width: 600px) calc(100vw - 32px), (max-width: 960px) calc(50vw - 36px), (max-width: 1248px) calc(33.3vw - 32px), 368px";

export default async function PostsPage() {
  const [latest, ...older] = await getPublishedPosts();

  return (
    <>
      <PageHead
        label={<>Z&nbsp;cest</>}
        title={<>Zápisky z&nbsp;letů</>}
        perex={<>Cesty po Floridě a&nbsp;USA a&nbsp;přelety letadel přes Atlantik. Články od roku 2010, nejnovější nahoře.</>}
      />

      {latest ? (
        <section className="sec sec--tight sec--line" aria-labelledby="nejnovejsi">
          <DiaryTeaser post={latest} label="Nejnovější" headingId="nejnovejsi" linkText="Číst celý článek" priority />
        </section>
      ) : null}

      {older.length > 0 ? (
        <section className="sec sec--white" aria-labelledby="starsi">
          <div className="fa-wrap">
            <div className="sec-head">
              <div>
                {latest?.image ? <SectionSign>Archiv</SectionSign> : <span className="lbl">Archiv</span>}
                <h2 id="starsi">Starší články</h2>
              </div>
              <p>Články z&nbsp;původního webu flyamerica.cz.</p>
            </div>
            <div className="grid-3 dn-posts">
              {older.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CtaSection />
    </>
  );
}

/**
 * Karta staršího článku: celá je odkaz (.dn-post-link), fotka 4 : 3, datum, nadpis, perex v serifu.
 * Datum publikace, u článku s jiným rokem cesty s předponou „vydáno“ (postDateLabel, úprava 33).
 */
function PostCard({ post }: { post: PublicPostSummary }) {
  const headingId = `c-${post.slug}`;
  return (
    <article className="dn-post" aria-labelledby={headingId}>
      <Link className="dn-post-link" href={postPath(post.slug)}>
        {post.image ? (
          <div className="dn-post-img">
            <PostImage
              src={post.image.url}
              width={post.image.width}
              height={post.image.height}
              alt={post.image.alt}
              sizes={CARD_PHOTO_SIZES}
              blurDataURL={post.image.blur}
            />
          </div>
        ) : null}
        <div className="dn-post-meta">
          <time className="date" dateTime={isoDate(post.publishedAt)}>
            {postDateLabel(post)}
          </time>
        </div>
        <h3 id={headingId}>{czechNbspText(postDisplayTitle(post.title))}</h3>
        {post.perex ? <p>{czechNbspText(post.perex)}</p> : null}
        <div className="dn-post-foot">
          <span className="fa-link">
            Číst článek <Arrow />
          </span>
        </div>
      </Link>
    </article>
  );
}
