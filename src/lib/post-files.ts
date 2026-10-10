import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, type PostGallery } from "@/lib/db/schema";
import {
  DENIK_BUCKET,
  getSupabaseAdmin,
  publicImageUrl,
} from "@/lib/supabase/admin";

/**
 * Bez těchto proměnných nahrávání fotek nejde (lokálně je npm run db:local
 * nezapisuje). Článek se dá uložit i tak, jen bez fotek.
 */
export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Fotka z našeho úložiště? Formulář posílá adresy ve skrytých polích, takže
 * je server ověřuje. Bez nastaveného úložiště (lokálně, ukázková data
 * z placehold.co) projde každá adresa.
 */
export function isOwnFileUrl(url: string): boolean {
  if (!isStorageConfigured()) return true;
  const prefix = publicImageUrl("");
  return url.startsWith(prefix) && url.length > prefix.length;
}

/** Adresy obrázků vložených do textu článku (<img src="...">). */
export function contentImageUrls(html: string): string[] {
  return Array.from(html.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/g), (match) => match[1]);
}

interface PostFiles {
  imageUrl: string | null;
  content: string;
  gallery: PostGallery[];
}

/**
 * Cesty souborů v bucketu "denik", které článek používá: titulní fotka,
 * fotky v textu a fotky galerií. Bere jen adresy z našeho úložiště, cizí
 * obrázky (a ukázková data z placehold.co) přeskočí.
 */
export function postFilePaths(post: PostFiles): Set<string> {
  const paths = new Set<string>();
  if (!isStorageConfigured()) return paths;

  const prefix = publicImageUrl("");
  const add = (url: string | null | undefined) => {
    if (url?.startsWith(prefix) && url.length > prefix.length) {
      paths.add(url.slice(prefix.length));
    }
  };

  add(post.imageUrl);
  for (const url of contentImageUrls(post.content)) add(url);
  for (const gallery of post.gallery) {
    for (const item of gallery.items) {
      // Cesta z formuláře se maže, jen když sedí s adresou fotky.
      if (item.url === prefix + item.path) paths.add(item.path);
    }
  }
  return paths;
}

/**
 * Smaže soubory, které článek přestal používat. Volá se až po úspěšném
 * zápisu do databáze: když smazání selže, zůstane v úložišti soubor navíc,
 * což je lepší než rozbitý obrázek. Soubor, na který odkazuje jiný článek
 * (třeba vložené HTML s fotkou z jiného článku), zůstane.
 */
export async function removeUnusedFiles(
  paths: Iterable<string>,
  postId: string,
): Promise<void> {
  const candidates = [...new Set(paths)];
  if (candidates.length === 0 || !isStorageConfigured()) return;

  try {
    const values = sql.join(
      candidates.map((path) => sql`(${path}::text)`),
      sql`, `,
    );
    const stillUsed = await db.execute<{ path: string }>(sql`
      select v.path from (values ${values}) as v(path)
      where exists (
        select 1 from ${posts}
        where ${posts.id} <> ${postId}
          and (strpos(${posts.content}, v.path) > 0
            or strpos(coalesce(${posts.imageUrl}, ''), v.path) > 0
            or strpos(${posts.gallery}::text, v.path) > 0)
      )`);
    const keep = new Set(Array.from(stillUsed, (row) => row.path));
    const remove = candidates.filter((path) => !keep.has(path));
    if (remove.length === 0) return;

    const { error } = await getSupabaseAdmin()
      .storage.from(DENIK_BUCKET)
      .remove(remove);
    if (error) throw error;
  } catch (error) {
    console.error("[admin/denik] fotky se nepodařilo smazat z úložiště:", error);
  }
}
