import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { CircleDashed, FileText, Inbox, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { requireAdminPage } from "@/lib/admin-guard";
import { getInquiryCounts, listRecentInquiries } from "@/lib/inquiries/admin";
import { InquiryList } from "@/components/admin/inquiries/InquiryList";

export const metadata: Metadata = {
  title: "Přehled",
};

export default async function AdminDashboardPage() {
  await requireAdminPage();

  const [[postCounts], inquiryCounts, recentInquiries] = await Promise.all([
    db
      .select({
        published: sql<number>`count(*) filter (where ${posts.status} = 'published')::int`,
        drafts: sql<number>`count(*) filter (where ${posts.status} = 'draft')::int`,
      })
      .from(posts),
    getInquiryCounts(),
    listRecentInquiries(5),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Přehled</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/posts/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            <Plus size={16} aria-hidden="true" />
            Nový článek
          </Link>
          <Link
            href="/admin/poptavky"
            className="inline-flex items-center gap-2 rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
          >
            <Inbox size={16} aria-hidden="true" />
            Poptávky
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Inbox size={20} />}
          label="Nové poptávky"
          value={inquiryCounts.new}
          href="/admin/poptavky?stav=new"
        />
        <StatCard
          icon={<FileText size={20} />}
          label="Publikované články"
          value={postCounts?.published ?? 0}
          href="/admin/posts?stav=published"
        />
        <StatCard
          icon={<CircleDashed size={20} />}
          label="Koncepty"
          value={postCounts?.drafts ?? 0}
          href="/admin/posts?stav=draft"
        />
      </div>

      <section aria-labelledby="recent-inquiries" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="recent-inquiries" className="text-lg font-semibold text-foreground">
            Poslední poptávky
          </h2>
          <Link href="/admin/poptavky" className="text-sm font-semibold text-foreground underline">
            Všechny poptávky
          </Link>
        </div>
        {recentInquiries.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-text-secondary">
            Zatím nepřišla žádná poptávka.
          </p>
        ) : (
          <InquiryList items={recentInquiries} />
        )}
      </section>
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
