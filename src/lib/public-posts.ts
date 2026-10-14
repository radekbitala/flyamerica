import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, type PostGallery } from "@/lib/db/schema";
import { PUBLIC_POSTS_TAG } from "@/lib/posts-cache";

/**
 * Články deníku pro veřejný web: jen publikované (status published),
 * nejnovější první (publishedAt sestupně). Administrace má vlastní dotazy
 * (src/app/admin/(dashboard)/posts/queries.ts).
 *
 * Výsledky jsou v cache Next.js (unstable_cache) s tagem PUBLIC_POSTS_TAG,
 * který po každé změně článku zneplatní revalidatePublicPosts()
 * (src/lib/posts-cache.ts). V rámci jednoho vykreslení se dotaz neopakuje
 * (React cache), i když ho volá generateMetadata i stránka.
 *
 * Build bez DATABASE_URL: stránka, která volá tyhle funkce, se při buildu
 * nevygeneruje a vykreslí se až při návštěvě (connection()). S databází
 * (Vercel) se vygeneruje při buildu a obnovuje se přes tag.
 *
 * content je HTML vyčištěné při uložení (sanitizePostHtml), bez pevných
 * mezer. Při vykreslení ho prožene czechNbsp() (src/lib/typography.ts).
 */

export interface PublicPostImage {
  url: string;
  width: number;
  height: number;
  /** Popis pro nevidomé (v administraci povinný u titulní fotky). */
  alt: string;
  /** Malý data URL náhled pro placeholder="blur", když je. */
  blur: string | null;
}

export interface PublicPostSummary {
  id: string;
  slug: string;
  title: string;
  perex: string | null;
  /** Titulní fotka, null když článek žádnou nemá (nebo chybí rozměry). */
  image: PublicPostImage | null;
  /** Datum publikace (u starších článků původní datum z WordPressu). */
  publishedAt: Date;
  /**
   * Rok cesty z administrace, null = neuvedený. Rok k zobrazení dává
   * postYear() ze src/lib/post-year.ts (rok cesty, rok z titulku, rok publikace).
   */
  tripYear: number | null;
}

export interface PublicPost extends PublicPostSummary {
  /** Vyčištěné HTML se značkami galerií <p data-gallery="ID"></p>. */
  content: string;
  gallery: PostGallery[];
  videoUrl: string | null;
  updatedAt: Date;
}

export interface AdjacentPosts {
  /** Novější článek (v seznamu nad tímto), null u nejnovějšího. */
  newer: PublicPostSummary | null;
  /** Starší článek (v seznamu pod tímto), null u nejstaršího. */
  older: PublicPostSummary | null;
}

// unstable_cache ukládá JSON, Date by se vrátil jako řetězec. Cache proto
// drží data s ISO řetězci a na Date se převádí až po čtení.
type Json<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };
type SummaryJson = Omit<Json<PublicPostSummary>, "image"> & { image: PublicPostImage | null };
type PostJson = SummaryJson & Omit<Json<PublicPost>, keyof PublicPostSummary>;

/** Datum publikace pro řazení i zobrazení: u publikovaného článku je vždy, pojistka createdAt. */
const publishedOrCreated = sql<Date>`coalesce(${posts.publishedAt}, ${posts.createdAt})`.mapWith(posts.publishedAt);

const summaryColumns = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  perex: posts.perex,
  imageUrl: posts.imageUrl,
  imageWidth: posts.imageWidth,
  imageHeight: posts.imageHeight,
  imageAlt: posts.imageAlt,
  imageBlur: posts.imageBlur,
  publishedAt: publishedOrCreated,
  tripYear: posts.tripYear,
};

type SummaryRow = {
  id: string;
  slug: string;
  title: string;
  perex: string | null;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageAlt: string | null;
  imageBlur: string | null;
  publishedAt: Date | string;
  tripYear: number | null;
};

function toSummaryJson(row: SummaryRow): SummaryJson {
  const image =
    row.imageUrl && row.imageWidth && row.imageHeight
      ? {
          url: row.imageUrl,
          width: row.imageWidth,
          height: row.imageHeight,
          alt: row.imageAlt ?? "",
          blur: row.imageBlur,
        }
      : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    perex: row.perex,
    image,
    publishedAt: new Date(row.publishedAt).toISOString(),
    tripYear: row.tripYear,
  };
}

// Záznam v cache uložený před přidáním sloupce trip_year pole tripYear nemá.
function fromSummaryJson(json: SummaryJson): PublicPostSummary {
  return { ...json, publishedAt: new Date(json.publishedAt), tripYear: json.tripYear ?? null };
}

const loadSummaries = unstable_cache(
  async (): Promise<SummaryJson[]> => {
    const rows = await db
      .select(summaryColumns)
      .from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(desc(publishedOrCreated), desc(posts.createdAt));
    return rows.map(toSummaryJson);
  },
  ["public-posts", "summaries"],
  { tags: [PUBLIC_POSTS_TAG] },
);

const loadPostBySlug = unstable_cache(
  async (slug: string): Promise<PostJson | null> => {
    const [row] = await db
      .select({
        ...summaryColumns,
        content: posts.content,
        gallery: posts.gallery,
        videoUrl: posts.videoUrl,
        updatedAt: posts.updatedAt,
        status: posts.status,
      })
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);
    if (!row || row.status !== "published") return null;
    return {
      ...toSummaryJson(row),
      content: row.content,
      gallery: row.gallery ?? [],
      videoUrl: row.videoUrl,
      updatedAt: row.updatedAt.toISOString(),
    };
  },
  ["public-posts", "by-slug"],
  { tags: [PUBLIC_POSTS_TAG] },
);

/** Bez databáze (build bez proměnných) se stránka nevygeneruje předem, ale až při požadavku. */
async function waitForRequestWithoutDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) await connection();
}

/** Všechny publikované články bez textu, nejnovější první. */
export const getPublishedPosts = cache(async (): Promise<PublicPostSummary[]> => {
  await waitForRequestWithoutDatabase();
  return (await loadSummaries()).map(fromSummaryJson);
});

/** Posledních n publikovaných článků (úvodní stránka, O Honzovi). */
export async function getLatestPublishedPosts(n: number): Promise<PublicPostSummary[]> {
  return (await getPublishedPosts()).slice(0, Math.max(0, n));
}

/** Publikovaný článek s textem a galeriemi, nebo null (koncept, neexistuje). */
export const getPublishedPostBySlug = cache(async (slug: string): Promise<PublicPost | null> => {
  await waitForRequestWithoutDatabase();
  const json = await loadPostBySlug(slug);
  if (!json) return null;
  return {
    ...json,
    publishedAt: new Date(json.publishedAt),
    updatedAt: new Date(json.updatedAt),
    tripYear: json.tripYear ?? null,
  };
});

/** Sousední publikované články podle data publikace (odkazy na konci článku). */
export async function getAdjacentPosts(slug: string): Promise<AdjacentPosts> {
  const list = await getPublishedPosts();
  const index = list.findIndex((post) => post.slug === slug);
  if (index === -1) return { newer: null, older: null };
  return {
    newer: index > 0 ? list[index - 1] : null,
    older: index < list.length - 1 ? list[index + 1] : null,
  };
}

/**
 * Adresy publikovaných článků pro generateStaticParams. Bez DATABASE_URL
 * vrátí prázdné pole (build bez proměnných), články se pak vykreslí až při
 * první návštěvě. Nevolá connection(), generateStaticParams běží mimo
 * požadavek.
 */
export async function getPublishedSlugs(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  return (await loadSummaries()).map((post) => post.slug);
}
