import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { ROUTES, postPath } from "@/lib/routes";

/**
 * Tag dat článků (Z cest, dřív Deník) pro veřejný web. Mají ho všechny dotazy v
 * src/lib/public-posts.ts (seznam, detail, sousední články). Jeden tag
 * stačí: změna jednoho článku mění i seznamy a odkazy na sousední články
 * na detailech jiných článků, a článků je málo.
 */
export const PUBLIC_POSTS_TAG = "public-posts";

/**
 * Obnoví veřejné stránky, které ukazují články. Administrace ho volá
 * po každé změně článku (uložení, publikace, vrácení do konceptů, smazání).
 *
 * Tag zneplatní data článků všude (i stránky, které se vygenerovaly při
 * buildu a data z tagu použily). Cesty se obnovují navíc pro stránky, které
 * by data četly jinak než přes public-posts.ts. Se slugem obnoví detail toho
 * článku, bez slugu všechny detaily. Při změně slugu se volá pro starý
 * i nový slug.
 */
export function revalidatePublicPosts(slug?: string): void {
  // expire: 0 = další návštěva počká na čerstvá data. Honza po uložení hned
  // otevírá článek na webu a nemá vidět starou verzi. Funguje v server
  // actions i v route handlerech (updateTag jen v server actions).
  revalidateTag(PUBLIC_POSTS_TAG, { expire: 0 });

  // Úvodní stránka ukazuje poslední články, Váš mentor Honzovy přelety.
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.posts);
  revalidatePath(ROUTES.mentor);

  if (slug) {
    revalidatePath(postPath(slug));
  } else {
    // Vzor cesty musí obsahovat i skupinu (web), viz dokumentace revalidatePath.
    revalidatePath("/(web)/z-cest/[slug]", "page");
  }
}
