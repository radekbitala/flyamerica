import Link from "next/link";
import type { InquiryFilter } from "@/lib/inquiries/admin";

const TABS: { filter: InquiryFilter; label: string }[] = [
  { filter: "active", label: "Aktivní" },
  { filter: "new", label: "Nové" },
  { filter: "in_progress", label: "Rozpracované" },
  { filter: "done", label: "Vyřízené" },
  { filter: "archived", label: "Archiv" },
];

export function inquiryFilterHref(filter: InquiryFilter, page = 1): string {
  const q = new URLSearchParams();
  if (filter !== "active") q.set("stav", filter);
  if (page > 1) q.set("strana", String(page));
  const qs = q.toString();
  return qs ? `/admin/poptavky?${qs}` : "/admin/poptavky";
}

export function InquiryFilterTabs({
  current,
  counts,
}: {
  current: InquiryFilter;
  counts: Record<InquiryFilter, number>;
}) {
  return (
    <nav aria-label="Filtr podle stavu">
      <ul className="flex flex-wrap gap-2">
        {TABS.map(({ filter, label }) => {
          const active = filter === current;
          return (
            <li key={filter}>
              <Link
                href={inquiryFilterHref(filter)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-white"
                    : "border-gray-300 bg-white text-foreground hover:border-foreground"
                }`}
              >
                {label}{" "}
                <span className={active ? "text-white/80" : "text-text-secondary"}>
                  {counts[filter]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
