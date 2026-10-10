import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Obnoví veřejné stránky, které ukazují články deníku. Administrace ho volá
 * po každé změně článku (uložení, publikace, archivace, smazání).
 *
 * Se slugem obnoví jen detail toho článku, bez slugu všechny detaily. Při
 * změně slugu je potřeba zavolat ho pro starý i nový slug, nebo bez slugu.
 */
export function revalidatePublicPosts(slug?: string): void {
  // Úvodní stránka ukazuje poslední články.
  revalidatePath("/");
  revalidatePath("/denik");

  if (slug) {
    revalidatePath(`/denik/${slug}`);
  } else {
    // Vzor cesty musí obsahovat i skupinu (web), viz dokumentace revalidatePath.
    revalidatePath("/(web)/denik/[slug]", "page");
  }
}
