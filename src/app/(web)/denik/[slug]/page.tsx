import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { PAGE_PHOTO_SIZES, PHOTO_CREDIT } from "@/components/web/Figure";
import { PageHead } from "@/components/web/PageHead";
import { formatDate, isoDate, yearOf } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { articleLeadText, isBlank, prepareArticleBody, youtubeLink } from "@/lib/post-content";
import { modelDescription, postDescription, postShortTitle } from "@/lib/post-display";
import { postDisplayTitle } from "@/lib/post-title";
import {
  getAdjacentPosts,
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedSlugs,
  type PublicPost,
} from "@/lib/public-posts";
import { czechNbspText } from "@/lib/typography";
import { ArticleContent } from "../_components/ArticleContent";
import { ArticleToc } from "../_components/ArticleToc";
import { DiaryTeaser } from "../_components/DiaryTeaser";
import { PostGalleryGrid } from "../_components/PostGalleryGrid";
import { PostImage } from "../_components/PostImage";
import { VideoLink } from "../_components/VideoLink";
import styles from "../denik.module.css";

// Článek deníku podle šablon prototyp/denik-druhy-prelet-atlantiku-2017.html
// a denik-dalsi-prelet-oceanu-2025.html. Data z databáze (jen publikované),
// stránky se generují při buildu (s DATABASE_URL), nové při první návštěvě
// a obnovují se po změně článku (tag PUBLIC_POSTS_TAG, src/lib/posts-cache.ts).

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

/** Adresa článku jako v administraci (src/lib/post-form.ts): jen a-z, 0-9 a spojovník. */
const SLUG = /^[a-z0-9-]{1,255}$/;

/**
 * Publikovaný článek, nebo null. Adresa se nejdřív hledá v seznamu
 * publikovaných článků (jeden záznam v cache), aby náhodné adresy od robotů
 * nezakládaly záznamy v cache dotazu na jeden článek.
 */
async function loadPost(slug: string): Promise<PublicPost | null> {
  if (!SLUG.test(slug)) return null;
  const published = await getPublishedPosts();
  if (!published.some((post) => post.slug === slug)) return null;
  return getPublishedPostBySlug(slug);
}

/** Prázdné pole bez databáze: články se pak vykreslí při první návštěvě (ISR). */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await getPublishedSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  // Náhled odkazu je u všech článků og-image-foto.jpg 1200 x 630 (_PRAVIDLA.md,
  // část 7). Titulní fotky jsou 4 : 3 a Facebook nebo WhatsApp by je ořízly.
  return pageMetadata({
    title: postShortTitle(post.title),
    description:
      modelDescription(post.slug) ??
      postDescription(post.perex || articleLeadText(post.content) || postDisplayTitle(post.title)),
    path: `/denik/${post.slug}`,
    ogImage: "photo",
    article: {
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  const { newer, older } = await getAdjacentPosts(post.slug);
  const body = prepareArticleBody(post);
  const videoHref = post.videoUrl ? youtubeLink(post.videoUrl) : null;
  const hasPhotos = body.trailingGalleries.length > 0;
  // Článek jen s galerií na konci nemá text: sekce s textem se vynechá.
  const hasText = body.nodes.some((node) => !isBlank(node)) || videoHref !== null;
  // Podtitul z textu (článek 2017) je v záhlaví místo perexu jako v modelu,
  // perex pak zůstává jen na kartách v deníku a na úvodu.
  const headPerex = body.subtitle ?? (post.perex ? czechNbspText(post.perex) : undefined);
  const image = post.image;
  const imageAlt = image?.alt.trim() ?? "";

  // Na konci článku předchozí (starší) článek velkým blokem jako v modelu,
  // další (novější) odkazem pod ním. U nejstaršího článku jen novější.
  const teaser = older ?? newer;
  const alsoNewer = older ? newer : null;

  return (
    <>
      <PageHead
        crumbs={{ href: "/denik", label: "Deník", current: czechNbspText(postShortTitle(post.title)) }}
        title={czechNbspText(postDisplayTitle(post.title))}
        perex={headPerex}
        perexVoice
      >
        <p className="dn-by">
          <time className="date" dateTime={isoDate(post.publishedAt)}>
            {formatDate(post.publishedAt)}
          </time>
        </p>
      </PageHead>

      {image ? (
        <div className="fa-wrap">
          <figure className="page-photo">
            <PostImage
              src={image.url}
              width={image.width}
              height={image.height}
              alt={imageAlt}
              sizes={PAGE_PHOTO_SIZES}
              priority
              blurDataURL={image.blur}
            />
            <figcaption>
              {imageAlt ? `${czechNbspText(imageAlt)}${/[.!?…]$/.test(imageAlt) ? "" : "."} ${PHOTO_CREDIT}` : PHOTO_CREDIT}
            </figcaption>
          </figure>
        </div>
      ) : null}

      {hasText ? (
        <section className="sec sec--tight" aria-label="Text článku">
          <div className="fa-wrap split dn-split">
            {body.toc.length > 0 ? (
              <ArticleToc
                entries={body.toc}
                footer={
                  hasPhotos ? (
                    <div className="dn-toc-foot">
                      <a className="fa-link" href="#fotky">
                        Fotky z&nbsp;cesty <Arrow />
                      </a>
                    </div>
                  ) : null
                }
              />
            ) : null}
            <div className="prose">
              <ArticleContent nodes={body.nodes} galleries={body.galleries} />
              {videoHref ? <VideoLink href={videoHref} /> : null}
            </div>
          </div>
        </section>
      ) : null}

      {hasPhotos ? (
        <section className="sec sec--white" id="fotky" aria-labelledby="fotky-nadpis">
          <div className="fa-wrap">
            <div className="sec-head">
              <div>
                <span className="lbl">Fotky</span>
                <h2 id="fotky-nadpis">Fotky z&nbsp;cesty</h2>
              </div>
            </div>
            <div className={styles.galleries}>
              {body.trailingGalleries.map((gallery) => (
                <PostGalleryGrid key={gallery.id} gallery={gallery} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {teaser ? (
        <section className="sec sec--line" aria-labelledby="dalsi-nadpis">
          <DiaryTeaser post={teaser} label={<>Z&nbsp;deníku</>} headingId="dalsi-nadpis" linkText="Číst článek">
            <p className="diary-older">
              {alsoNewer ? (
                <>
                  Novější z&nbsp;deníku:{" "}
                  <Link href={`/denik/${alsoNewer.slug}`}>
                    {czechNbspText(postDisplayTitle(alsoNewer.title))}, {yearOf(alsoNewer.publishedAt)}
                  </Link>
                  <span className="dot" aria-hidden="true" />
                  <Link href="/denik">Všechny články</Link>
                </>
              ) : (
                <Link href="/denik">Všechny články z&nbsp;deníku</Link>
              )}
            </p>
          </DiaryTeaser>
        </section>
      ) : null}

      <CtaSection />
    </>
  );
}
