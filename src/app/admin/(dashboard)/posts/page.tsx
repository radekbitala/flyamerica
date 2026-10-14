import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { requireAdminPage } from "@/lib/admin-guard";
import { PostsTable, type PostFilter, type PostRow } from "@/components/admin/PostsTable";

export const metadata: Metadata = {
  title: "Z cest",
};

// Bez archivu: archivace článků v administraci není (filtr je skrytý).
const STATUS_FILTERS = new Set<string>(["published", "draft"]);

function parseFilter(value: string | string[] | undefined): PostFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return v && STATUS_FILTERS.has(v) ? (v as PostFilter) : "all";
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ stav?: string | string[] }>;
}) {
  await requireAdminPage();
  const filter = parseFilter((await searchParams).stav);

  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .orderBy(desc(posts.createdAt));

  const data: PostRow[] = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  }));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Z cest</h1>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          <Plus size={16} aria-hidden />
          Nový článek
        </Link>
      </div>

      {/* key: při přechodu na jinou ?stav= v rámci stránky se filtr nastaví znovu */}
      <PostsTable key={filter} posts={data} initialFilter={filter} />
    </div>
  );
}
