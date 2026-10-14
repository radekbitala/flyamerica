import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-guard";
import { allowedImagePrefixes, isStorageConfigured } from "@/lib/post-files";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { PostForm } from "@/components/admin/PostForm";
import { createPost } from "../actions";
import { getCategories } from "../queries";

export const metadata: Metadata = {
  title: "Nový článek",
};

export default async function NewPostPage() {
  await requireAdminPage();
  const categories = await getCategories();

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Z cest", href: "/admin/posts" }, { label: "Nový článek" }]}
      />
      <h1 className="mb-6 text-2xl font-bold text-foreground">Nový článek</h1>

      <PostForm
        mode="new"
        categories={categories}
        action={createPost}
        uploadsEnabled={isStorageConfigured()}
        allowedImagePrefixes={allowedImagePrefixes()}
      />
    </div>
  );
}
