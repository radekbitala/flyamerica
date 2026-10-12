import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-guard";
import { isStorageConfigured } from "@/lib/post-files";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { PostForm } from "@/components/admin/PostForm";
import { postPath } from "@/lib/routes";
import { deletePost, updatePost } from "../../actions";
import { getCategories, getPostForEdit } from "../../queries";

export const metadata: Metadata = {
  title: "Upravit článek",
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;

  const [found, categories] = await Promise.all([getPostForEdit(id), getCategories()]);
  if (!found) notFound();
  const { post, categoryIds } = found;

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Z cest", href: "/admin/posts" }, { label: post.title }]}
      />
      <h1 className="mb-6 text-2xl font-bold text-foreground">Upravit článek</h1>

      <PostForm
        // Po uložení se formulář načte znovu z databáze, i s textem tak,
        // jak ho vyčistil server.
        key={post.updatedAt.toISOString()}
        mode="edit"
        categories={categories}
        action={updatePost.bind(null, post.id)}
        onDelete={deletePost.bind(null, post.id)}
        publicUrl={post.status === "published" ? postPath(post.slug) : null}
        uploadsEnabled={isStorageConfigured()}
        defaults={{
          title: post.title,
          slug: post.slug,
          perex: post.perex,
          content: post.content,
          imageUrl: post.imageUrl,
          imageWidth: post.imageWidth,
          imageHeight: post.imageHeight,
          imageBlur: post.imageBlur,
          imageAlt: post.imageAlt,
          videoUrl: post.videoUrl,
          gallery: post.gallery,
          status: post.status,
          categoryIds,
        }}
      />
    </div>
  );
}
