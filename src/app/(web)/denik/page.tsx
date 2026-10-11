import Link from "next/link";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { PageHead } from "@/components/web/PageHead";
import { formatDate, isoDate } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { postDisplayTitle } from "@/lib/post-title";
import { getPublishedPosts, type PublicPostSummary } from "@/lib/public-posts";
import { czechNbspText } from "@/lib/typography";
import { DiaryTeaser } from "./_components/DiaryTeaser";
import { PostImage } from "./_components/PostImage";

// Deník podle prototyp/denik.html: nejnovější článek nahoře, starší jako
// karty. Všechny články jsou z databáze (jen publikované, nejnovější první),
// každá karta je celá odkaz na článek. Stránka se obnoví po každé změně
// článku v administraci (revalidatePublicPosts, src/lib/posts-cache.ts).

export const metadata = pageMetadata({
  title: "Deník",
  description: "Články o létání po Floridě a USA a o přeletech letadel přes Atlantik, od roku 2010.",
  path: "/denik",
});

/** sizes fotky na kartě (.grid-3: 3 / 2 / 1 sloupec). */
const CARD_PHOTO_SIZES =
  "(max-width: 600px) calc(100vw - 32px), (max-width: 960px) calc(50vw - 36px), (max-width: 1248px) calc(33.3vw - 32px), 368px";

export default async function DenikPage() {
  const [latest, ...older] = await getPublishedPosts();

  return (
    <>
      <PageHead
        label="Deník"
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
                <span className="lbl">Archiv</span>
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

/** Karta staršího článku: celá je odkaz (.dn-post-link), fotka 4 : 3, datum, nadpis, perex v serifu. */
function PostCard({ post }: { post: PublicPostSummary }) {
  const headingId = `c-${post.slug}`;
  return (
    <article className="dn-post" aria-labelledby={headingId}>
      <Link className="dn-post-link" href={`/denik/${post.slug}`}>
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
            {formatDate(post.publishedAt)}
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
