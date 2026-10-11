"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  requireAdmin,
  SESSION_EXPIRED_MESSAGE,
  signedOutAsNull,
} from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { postCategories, postCategoryMap, posts } from "@/lib/db/schema";
import { sanitizePostHtml } from "@/lib/sanitize";
import { revalidatePublicPosts } from "@/lib/posts-cache";
import { isAllowedImageUrl } from "@/lib/image-hosts";
import {
  contentImageUrls,
  postFilePaths,
  removeUnusedFiles,
} from "@/lib/post-files";
import {
  POST_LIMITS,
  postSchema,
  slugify,
  type PostFormState,
  type PostInput,
} from "@/lib/post-form";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const SLUG_TAKEN: PostFormState = {
  status: "error",
  fieldErrors: { slug: "Tuhle adresu už má jiný článek." },
};

const SIGNED_OUT: PostFormState = { status: "error", formError: SESSION_EXPIRED_MESSAGE };

/**
 * Hlášky pro chyby, ke kterým schéma nemá vlastní text. Týkají se hlavně
 * skrytých polí (galerie, kategorie), která se rozbijí jen výjimečně.
 */
const FALLBACK_ERRORS: Record<string, string> = {
  gallery: "Galerie obsahuje poškozenou fotku. Odeberte ji a nahrajte znovu.",
  categoryIds: "Vybraná kategorie neexistuje. Načtěte stránku znovu.",
  newCategories: "Název nové kategorie není platný.",
  imageUrl: "Titulní fotka má neplatnou adresu. Nahrajte ji znovu.",
  status: "Neplatný stav článku.",
};

/** Seznam ze skrytého pole formuláře. Rozbitý JSON nesmí shodit uložení. */
function json(formData: FormData, key: string): unknown {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw === "") return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function read(formData: FormData) {
  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const title = str("title");
  return {
    title,
    // Adresa se srovná i na serveru, spojovník na konci po psaní nevadí.
    slug: slugify(str("slug") || title),
    perex: str("perex"),
    content: str("content"),
    imageUrl: str("imageUrl"),
    imageWidth: str("imageWidth"),
    imageHeight: str("imageHeight"),
    imageBlur: str("imageBlur") || undefined,
    imageAlt: str("imageAlt"),
    videoUrl: str("videoUrl"),
    gallery: json(formData, "gallery"),
    categoryIds: formData
      .getAll("categoryIds")
      .filter((value) => typeof value === "string"),
    newCategories: json(formData, "newCategories"),
    status: str("status"),
  };
}

type Issue = { path: PropertyKey[]; message: string; code?: string };

function fieldErrors(issues: Issue[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    // Formulář má jedno místo pro chybu všech galerií, hláška proto říká,
    // která galerie a fotka to je (číslování jako v administraci).
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = key === "gallery" ? galleryMessage(issue) : issue.message;
  }
  return errors;
}

/**
 * Hláška k chybě v galerii podle cesty chyby: ["gallery"] celý seznam
 * (moc galerií), ["gallery", 1, "items"] fotky galerie, ["gallery", 1,
 * "items", 4, "caption"] popisek páté fotky druhé galerie.
 */
function galleryMessage({ path, message, code }: Issue): string {
  const [, gallery, items, photo, field] = path;
  if (typeof gallery !== "number") return message;
  const name = `Galerie ${gallery + 1}`;
  if (items !== "items") return FALLBACK_ERRORS.gallery;
  if (typeof photo !== "number") {
    return code === "too_big"
      ? `${name} má příliš mnoho fotek, nejvýš ${POST_LIMITS.photosPerGallery}.`
      : FALLBACK_ERRORS.gallery;
  }
  if (field === "caption") {
    return `${name}, fotka ${photo + 1}: popisek je příliš dlouhý, nejvýš ${POST_LIMITS.caption} znaků.`;
  }
  return `${name}, fotka ${photo + 1} je poškozená. Odeberte ji a nahrajte znovu.`;
}

/**
 * Vyčistí HTML a srovná značky galerií: značka galerie, která v článku
 * není, zmizí, a každá galerie je v textu nejvýš jednou.
 */
function prepareContent(html: string, galleryIds: Set<string>): string {
  const placed = new Set<string>();
  return sanitizePostHtml(html).replace(
    /<p data-gallery="([a-z0-9-]+)">[\s\S]*?<\/p>/g,
    (_match, id: string) => {
      if (!galleryIds.has(id) || placed.has(id)) return "";
      placed.add(id);
      return `<p data-gallery="${id}"></p>`;
    },
  );
}

function hasContent(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/g, " ")
    .trim();
  return text !== "" || /<(?:img|iframe)\s|data-gallery=/.test(html);
}

type Parsed =
  | { ok: true; data: PostInput; content: string }
  | { ok: false; state: PostFormState };

function fail(errors: Record<string, string>): Parsed {
  return { ok: false, state: { status: "error", fieldErrors: errors } };
}

function parse(formData: FormData): Parsed {
  const result = postSchema.safeParse(read(formData), {
    error: (issue) =>
      FALLBACK_ERRORS[String(issue.path?.[0] ?? "")] ?? "Neplatná hodnota.",
  });
  if (!result.success) return fail(fieldErrors(result.error.issues));

  const data = result.data;
  // Fotky jen z našeho úložiště (bucket "denik", při vývoji i lokální, viz
  // src/lib/image-hosts.ts). Formulář posílá adresy ve skrytých polích.
  // Cizí adresa by na webu načítala fotku z cizího serveru a dostal by IP
  // návštěvníků, next/image by ji navíc odmítl.
  if (data.imageUrl && !isAllowedImageUrl(data.imageUrl)) {
    return fail({ imageUrl: FALLBACK_ERRORS.imageUrl });
  }
  for (const [g, gallery] of data.gallery.entries()) {
    const p = gallery.items.findIndex((item) => !isAllowedImageUrl(item.url));
    if (p >= 0) {
      return fail({
        gallery: `Galerie ${g + 1}, fotka ${p + 1} není z úložiště webu. Odeberte ji a nahrajte znovu.`,
      });
    }
  }

  // Obrázek zkopírovaný s textem z jiného webu by se načítal odtamtud
  // a po zániku starého webu by zmizel. Tiše ho nezahazujeme (ani http,
  // který by čištění HTML odstranilo), Honza by nevěděl, kam fotka zmizela.
  if (contentImageUrls(data.content).some((url) => !isAllowedImageUrl(url))) {
    return fail({
      content:
        "Text obsahuje obrázek z jiného webu. Odeberte ho a fotku nahrajte tlačítkem Fotka do textu.",
    });
  }

  const content = prepareContent(
    data.content,
    new Set(data.gallery.map((g) => g.id)),
  );
  if (data.status === "published" && !hasContent(content)) {
    return fail({ content: "Před publikováním napište text článku." });
  }
  return { ok: true, data, content };
}

function toRow(data: PostInput, content: string) {
  const image = data.imageUrl ?? null;
  return {
    title: data.title,
    slug: data.slug,
    perex: data.perex || null,
    content,
    imageUrl: image,
    imageWidth: image ? (data.imageWidth ?? null) : null,
    imageHeight: image ? (data.imageHeight ?? null) : null,
    imageBlur: image ? (data.imageBlur ?? null) : null,
    imageAlt: image ? data.imageAlt || null : null,
    videoUrl: data.videoUrl ?? null,
    gallery: data.gallery,
    status: data.status,
  };
}

/** Slug musí být volný, jinak by zápis spadl na chybu z databáze. */
async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      exceptId
        ? and(eq(posts.slug, slug), ne(posts.id, exceptId))
        : eq(posts.slug, slug),
    )
    .limit(1);
  return Boolean(row);
}

function isUniqueViolation(error: unknown): boolean {
  const code = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value
      ? value.code
      : undefined;
  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? error.cause
      : undefined;
  return code(error) === "23505" || code(cause) === "23505";
}

/**
 * Vazby na kategorie. Nové kategorie se zakládají až s článkem, aby po
 * rozepsaném a neuloženém článku nezůstávaly prázdné kategorie. Kategorie
 * se stejnou adresou (např. "Florida" a "florida") se nezakládá znovu.
 */
async function setCategories(tx: Tx, postId: string, data: PostInput) {
  const ids = new Set<string>();

  if (data.categoryIds.length > 0) {
    const existing = await tx
      .select({ id: postCategories.id })
      .from(postCategories)
      .where(inArray(postCategories.id, data.categoryIds));
    for (const row of existing) ids.add(row.id);
  }

  if (data.newCategories.length > 0) {
    const [{ maxOrder }] = await tx
      .select({
        maxOrder: sql<number>`coalesce(max(${postCategories.sortOrder}), 0)::int`,
      })
      .from(postCategories);
    let sortOrder = maxOrder;

    for (const name of data.newCategories) {
      const slug = slugify(name);
      const [created] = await tx
        .insert(postCategories)
        .values({ slug, name, sortOrder: ++sortOrder })
        .onConflictDoNothing({ target: postCategories.slug })
        .returning({ id: postCategories.id });
      if (created) {
        ids.add(created.id);
        continue;
      }
      const [found] = await tx
        .select({ id: postCategories.id })
        .from(postCategories)
        .where(eq(postCategories.slug, slug))
        .limit(1);
      if (found) ids.add(found.id);
    }
  }

  if (ids.size > 0) {
    await tx
      .insert(postCategoryMap)
      .values([...ids].map((categoryId) => ({ postId, categoryId })));
  }
}

async function loadPost(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [row] = await db
    .select({
      slug: posts.slug,
      status: posts.status,
      publishedAt: posts.publishedAt,
      imageUrl: posts.imageUrl,
      content: posts.content,
      gallery: posts.gallery,
    })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return row ?? null;
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const admin = await requireAdmin().catch(signedOutAsNull);
  if (!admin) return SIGNED_OUT;

  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  const { data, content } = parsed;

  if (await slugTaken(data.slug)) return SLUG_TAKEN;

  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(posts)
        .values({
          ...toRow(data, content),
          publishedAt: data.status === "published" ? new Date() : null,
          createdBy: admin.id,
        })
        .returning({ id: posts.id });
      await setCategories(tx, row.id, data);
      return row.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return SLUG_TAKEN;
    console.error("[admin/denik] založení článku selhalo:", error);
    return {
      status: "error",
      formError: "Článek se nepodařilo uložit, zkuste to znovu.",
    };
  }

  revalidatePublicPosts(data.slug);
  // Koncept se po uložení dál píše, publikovaný článek je hotový.
  redirect(
    data.status === "published"
      ? "/admin/posts?toast=post-published"
      : `/admin/posts/${id}/edit?toast=post-draft`,
  );
}

export async function updatePost(
  id: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  if (!(await requireAdmin().catch(signedOutAsNull))) return SIGNED_OUT;

  const current = await loadPost(id);
  if (!current) {
    return {
      status: "error",
      formError: "Článek už neexistuje, mezitím ho někdo smazal.",
    };
  }

  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  const { data, content } = parsed;

  if (await slugTaken(data.slug, id)) return SLUG_TAKEN;

  const row = toRow(data, content);
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          ...row,
          // Datum první publikace zůstává i po vrácení do konceptů.
          publishedAt:
            data.status === "published" && !current.publishedAt
              ? new Date()
              : current.publishedAt,
        })
        .where(eq(posts.id, id));
      await tx.delete(postCategoryMap).where(eq(postCategoryMap.postId, id));
      await setCategories(tx, id, data);
    });
  } catch (error) {
    if (isUniqueViolation(error)) return SLUG_TAKEN;
    console.error("[admin/denik] uložení článku selhalo:", error);
    return {
      status: "error",
      formError: "Změny se nepodařilo uložit, zkuste to znovu.",
    };
  }

  // Fotky, které z článku zmizely (vyměněná titulní fotka, odebraná fotka
  // z galerie nebo z textu), se uklidí až po úspěšném zápisu.
  const kept = postFilePaths(row);
  await removeUnusedFiles(
    [...postFilePaths(current)].filter((path) => !kept.has(path)),
    id,
  );

  revalidatePublicPosts(data.slug);
  if (current.slug !== data.slug) revalidatePublicPosts(current.slug);

  const wasPublished = current.status === "published";
  if (data.status === "published") {
    redirect(`/admin/posts?toast=${wasPublished ? "post-updated" : "post-published"}`);
  }
  redirect(
    `/admin/posts/${id}/edit?toast=${wasPublished ? "post-unpublished" : "post-draft"}`,
  );
}

export async function deletePost(id: string): Promise<void> {
  await requireAdmin();

  const current = await loadPost(id);
  if (current) {
    // Vazby na kategorie smaže databáze sama (on delete cascade).
    await db.delete(posts).where(eq(posts.id, id));
    await removeUnusedFiles(postFilePaths(current), id);
    revalidatePublicPosts(current.slug);
  }

  redirect("/admin/posts?toast=post-deleted");
}
