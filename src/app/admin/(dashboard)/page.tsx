import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { CircleDashed, FileText, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { inquiries, posts } from "@/lib/db/schema";
import { requireAdminPage } from "@/lib/admin-guard";

export const metadata: Metadata = {
  title: "Přehled",
};

// Zatím jen počty. Obsah přehledu doplní další krok.
export default async function AdminDashboardPage() {
  await requireAdminPage();

  const [postCounts] = await db
    .select({
      published: sql<number>`count(*) filter (where ${posts.status} = 'published')::int`,
      drafts: sql<number>`count(*) filter (where ${posts.status} = 'draft')::int`,
    })
    .from(posts);

  const [inquiryCounts] = await db
    .select({
      fresh: sql<number>`count(*) filter (where ${inquiries.status} = 'new')::int`,
    })
    .from(inquiries);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Přehled</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Inbox size={20} />}
          label="Nové poptávky"
          value={inquiryCounts?.fresh ?? 0}
          href="/admin/poptavky"
        />
        <StatCard
          icon={<FileText size={20} />}
          label="Publikované články"
          value={postCounts?.published ?? 0}
          href="/admin/posts"
        />
        <StatCard
          icon={<CircleDashed size={20} />}
          label="Koncepty"
          value={postCounts?.drafts ?? 0}
          href="/admin/posts"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-accent"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-gray text-accent-ink">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-text-secondary">{label}</div>
      </div>
    </Link>
  );
}
