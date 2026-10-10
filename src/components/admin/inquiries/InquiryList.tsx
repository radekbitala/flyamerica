import Link from "next/link";
import { PhoneCall } from "lucide-react";
import type { InquiryListItem } from "@/lib/inquiries/admin";
import { packageName } from "@/lib/inquiries/options";
import { InquiryStatusBadge } from "./InquiryStatusBadge";
import { formatDateTime } from "./format";

/** Seznam poptávek, každý řádek vede na detail. */
export function InquiryList({ items }: { items: InquiryListItem[] }) {
  return (
    <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {items.map((item) => {
        const callback = item.kind === "callback";
        const summary = callback
          ? "Chce zavolat zpět"
          : [
              packageName(item.packageSlug),
              item.travelDate,
              item.pilotCount && `pilotů: ${item.pilotCount}`,
            ]
              .filter(Boolean)
              .join(", ");

        return (
          <li key={item.id}>
            <Link
              href={`/admin/poptavky/${item.id}`}
              className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{item.name}</span>
                  {callback && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warm-gray px-2 py-0.5 text-xs font-medium text-foreground">
                      <PhoneCall size={12} aria-hidden="true" />
                      Zavolat zpět
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-sm text-text-secondary">{summary}</div>
              </div>
              <div className="truncate text-sm text-text-secondary sm:w-56">
                {item.email ?? item.phone}
              </div>
              <div className="flex items-center justify-between gap-4 sm:w-48 sm:justify-end">
                <time
                  dateTime={item.createdAt.toISOString()}
                  className="text-sm text-text-secondary"
                >
                  {formatDateTime(item.createdAt)}
                </time>
                <InquiryStatusBadge status={item.status} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
