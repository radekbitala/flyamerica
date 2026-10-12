import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/web/ArrowSymbol";
import { CtaSection } from "@/components/web/CtaSection";
import { PAGE_PHOTO_SIZES, PHOTO_CREDIT } from "@/components/web/Figure";
import { PageHead } from "@/components/web/PageHead";
import { SectionSign } from "@/components/web/SectionSign";
import { formatDate, isoDate, yearOf } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import {
  articleLeadText,
  isBlank,
  prepareArticleBody,
  textOf,
  youtubeLink,
  youtubeVideo,
  type HtmlNode,
} from "@/lib/post-content";
import { modelDescription, postDescription, postShortTitle } from "@/lib/post-display";
import { postDisplayTitle } from "@/lib/post-title";
import {
  getAdjacentPosts,
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedSlugs,
  type PublicPost,
} from "@/lib/public-posts";
import { ROUTES, postPath } from "@/lib/routes";
import { czechNbspText } from "@/lib/typography";
import { ArticleContent } from "../_components/ArticleContent";
import { ArticleToc } from "../_components/ArticleToc";
import { DiaryTeaser } from "../_components/DiaryTeaser";
import { PostGalleryGrid } from "../_components/PostGalleryGrid";
import { PostImage } from "../_components/PostImage";
import { ArticleVideo } from "../_components/ArticleVideo";
import styles from "../z-cest.module.css";

// Článek Z cest (dřív Deník) podle šablon prototyp/denik-druhy-prelet-atlantiku-2017.html
// a denik-dalsi-prelet-oceanu-2025.html. Data z databáze (jen publikované),
// stránky se generují při buildu (s DATABASE_URL), nové při první návštěvě
// a obnovují se po změně článku (tag PUBLIC_POSTS_TAG, src/lib/posts-cache.ts).
//
// Rozložení (12. 10. 2026, src/styles/pages/article.css): záhlaví a text ve
// sloupci 680 px na střed, titulní fotka přes celý kontejner, fotky a galerie
// v textu širší než text, obsah „V článku“ od 1200 px v levém okraji.

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

/**
 * Text článku aspoň takhle dlouhý (znaky) je vyšší než obrazovka (sloupec
 * 680 px, asi 75 znaků na řádek, 33 px na řádek): sekce Fotky pod ním smí
 * mít polohovou tabuli a od tabule v drobečcích ji dělí víc než výška
 * obrazovky 1440 x 900 i 375 x 667 (DESIGN.md, The One Location Sign Rule).
 * U kratšího textu má sekce šedý štítek.
 */
const SIGN_MIN_TEXT = 2500;

/** Délka textu článku ve znacích (bez značek). */
function textLength(nodes: HtmlNode[]): number {
  return nodes.reduce((sum, node) => sum + textOf(node).trim().length, 0);
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
    path: postPath(post.slug),
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
  const video = post.videoUrl ? youtubeVideo(post.videoUrl) : null;
  const videoHref = post.videoUrl ? youtubeLink(post.videoUrl) : null;
  const hasPhotos = body.trailingGalleries.length > 0;
  const hasToc = body.toc.length > 0;
  // Článek jen s galerií na konci nemá text: sekce s textem se vynechá.
  const hasText = body.nodes.some((node) => !isBlank(node)) || videoHref !== null;
  const photosSign = hasText && textLength(body.nodes) >= SIGN_MIN_TEXT;
  const videoTitle = `Video k článku ${postDisplayTitle(post.title)}`;
  // Podtitul z textu (článek 2017) je v záhlaví místo perexu jako v modelu,
  // perex pak zůstává jen na kartách v Z cest a na úvodu.
  const headPerex = body.subtitle ?? (post.perex ? czechNbspText(post.perex) : undefined);
  const image = post.image;
  const imageAlt = image?.alt.trim() ?? "";

  // Na konci článku předchozí (starší) článek velkým blokem jako v modelu,
  // další (novější) odkazem pod ním. U nejstaršího článku jen novější.
  const teaser = older ?? newer;
  const alsoNewer = older ? newer : null;

  return (
    <>
      {/* Záhlaví ve sloupci textu: tabule Z cest v drobečcích, nadpis, perex v serifu, datum. */}
      <div className="read-head">
        <PageHead
          crumbs={{ href: ROUTES.posts, label: <>Z&nbsp;cest</>, current: czechNbspText(postShortTitle(post.title)) }}
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
      </div>

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
          <div className="fa-wrap">
            <div className={hasToc ? "read-body read-body--toc" : "read-body"}>
              {hasToc ? (
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
                <ArticleContent nodes={body.nodes} galleries={body.galleries} hasToc={hasToc} videoTitle={videoTitle} />
                {video && videoHref ? (
                  <ArticleVideo id={video.id} start={video.start} href={videoHref} title={videoTitle} />
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hasPhotos ? (
        <section className="sec sec--white" id="fotky" aria-labelledby="fotky-nadpis">
          <div className="fa-wrap">
            <div className="sec-head">
              <div>
                {photosSign ? <SectionSign>Fotky</SectionSign> : <span className="lbl">Fotky</span>}
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
          <DiaryTeaser post={teaser} label={<>Z&nbsp;cest</>} headingId="dalsi-nadpis" linkText="Číst článek">
            <p className="diary-older">
              {alsoNewer ? (
                <>
                  Novější článek:{" "}
                  <Link href={postPath(alsoNewer.slug)}>
                    {czechNbspText(postDisplayTitle(alsoNewer.title))}, {yearOf(alsoNewer.publishedAt)}
                  </Link>
                  <span className="dot" aria-hidden="true" />
                  <Link href={ROUTES.posts}>Všechny články</Link>
                </>
              ) : (
                <Link href={ROUTES.posts}>Všechny články z&nbsp;cest</Link>
              )}
            </p>
          </DiaryTeaser>
        </section>
      ) : null}

      <CtaSection />
    </>
  );
}
