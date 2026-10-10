import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { postCategories, postCategoryMap, posts } from "@/lib/db/schema";

// Čtení pro stránky administrace. Schválně ne v actions.ts: každý export
// souboru s "use server" je veřejný endpoint.

export async function getCategories() {
  return db
    .select({ id: postCategories.id, name: postCategories.name })
    .from(postCategories)
    .orderBy(asc(postCategories.sortOrder), asc(postCategories.name));
}

/** Článek k úpravě, nebo null. Neplatné id v adrese = neexistující článek. */
export async function getPostForEdit(id: string) {
  if (!z.uuid().safeParse(id).success) return null;

  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) return null;

  const categories = await db
    .select({ categoryId: postCategoryMap.categoryId })
    .from(postCategoryMap)
    .where(eq(postCategoryMap.postId, id));

  return { post, categoryIds: categories.map((c) => c.categoryId) };
}
