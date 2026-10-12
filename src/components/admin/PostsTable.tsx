"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, FileText, ImageIcon, Pencil, Plus, Search } from "lucide-react";
import { postPath } from "@/lib/routes";

type PostStatus = "draft" | "published" | "archived";

export interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  imageUrl: string | null;
  createdAt: string;
  publishedAt: string | null;
}

const STATUS_META: Record<PostStatus, { label: string; className: string }> = {
  draft: { label: "Koncept", className: "bg-yellow text-foreground" },
  published: { label: "Publikováno", className: "bg-green-light text-foreground" },
  archived: { label: "Archivováno", className: "bg-warm-gray text-text-secondary" },
};

export type PostFilter = "all" | PostStatus;

const FILTERS: { value: PostFilter; label: string }[] = [
  { value: "all", label: "Všechny" },
  { value: "published", label: "Publikované" },
  { value: "draft", label: "Koncepty" },
  { value: "archived", label: "Archivované" },
];

const dateFormat = new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague" });

function formatDate(iso: string | null) {
  return iso ? dateFormat.format(new Date(iso)) : "-";
}

/** initialFilter z adresy (?stav=draft), na ni vedou karty na přehledu. */
export function PostsTable({
  posts,
  initialFilter = "all",
}: {
  posts: PostRow[];
  initialFilter?: PostFilter;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PostFilter>(initialFilter);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("cs");
    return posts.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (q && !p.title.toLocaleLowerCase("cs").includes(q)) return false;
      return true;
    });
  }, [posts, search, filter]);

  const counts = useMemo(() => {
    const c = { all: posts.length, published: 0, draft: 0, archived: 0 };
    for (const p of posts) c[p.status]++;
    return c;
  }, [posts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-80">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat podle názvu"
            aria-label="Hledat podle názvu"
            className="h-10 w-full rounded-lg border border-field bg-white pl-9 pr-4 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div
          role="group"
          aria-label="Filtr podle stavu"
          className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1"
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent/10 text-accent-ink"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-[11px] text-text-secondary">
                  {counts[f.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <FileText size={32} aria-hidden className="mx-auto mb-3 text-text-secondary" />
          {posts.length === 0 ? (
            <>
              <p className="mb-4 text-text-secondary">Zatím tu není žádný článek.</p>
              <Link
                href="/admin/posts/new"
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                <Plus size={16} aria-hidden />
                Napsat první článek
              </Link>
            </>
          ) : (
            <p className="text-text-secondary">Žádný článek neodpovídá filtru.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="hidden w-20 px-4 py-3 sm:table-cell">
                  <span className="sr-only">Titulní fotka</span>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary sm:px-4">
                  Název
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-text-secondary sm:px-4">
                  Stav
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-text-secondary md:table-cell">
                  Publikováno
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-text-secondary md:table-cell">
                  Vytvořeno
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-text-secondary sm:px-4">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post) => {
                const status = STATUS_META[post.status];
                return (
                  <tr
                    key={post.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                  >
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="relative h-12 w-16 overflow-hidden rounded-md bg-warm-gray">
                        {post.imageUrl ? (
                          <Image
                            src={post.imageUrl}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-text-secondary">
                            <ImageIcon size={16} aria-hidden />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="font-medium text-foreground hover:text-accent-ink hover:underline"
                      >
                        {post.title}
                      </Link>
                      <div className="break-all text-xs text-text-secondary">{postPath(post.slug)}</div>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-text-secondary md:table-cell">
                      {formatDate(post.publishedAt)}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-text-secondary md:table-cell">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/posts/${post.id}/edit`}
                          title="Upravit"
                          aria-label={`Upravit článek ${post.title}`}
                          className="rounded-md p-1.5 text-text-secondary hover:bg-white hover:text-accent-ink"
                        >
                          <Pencil size={16} />
                        </Link>
                        {post.status === "published" && (
                          <a
                            href={postPath(post.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Zobrazit na webu"
                            aria-label={`Zobrazit článek ${post.title} na webu`}
                            className="rounded-md p-1.5 text-text-secondary hover:bg-white hover:text-accent-ink"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
