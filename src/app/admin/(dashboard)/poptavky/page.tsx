import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-guard";
import { isEmailConfigured } from "@/lib/email";
import {
  getInquiryCounts,
  listInquiries,
  parseInquiryFilter,
} from "@/lib/inquiries/admin";
import { InquiryList } from "@/components/admin/inquiries/InquiryList";
import {
  InquiryFilterTabs,
  inquiryFilterHref,
} from "@/components/admin/inquiries/InquiryFilterTabs";

export const metadata: Metadata = {
  title: "Poptávky",
};

// Opakovaný parametr v adrese dorazí jako pole, bere se první hodnota.
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ stav?: string | string[]; strana?: string | string[] }>;
}) {
  await requireAdminPage();

  const params = await searchParams;
  const filter = parseInquiryFilter(first(params.stav));
  const requestedPage = Number(first(params.strana));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 1 ? requestedPage : 1;

  const [counts, { items, hasMore }] = await Promise.all([
    getInquiryCounts(),
    listInquiries(filter, page),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Poptávky</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Poptávky a žádosti o zavolání z webu, nové nahoře.
        </p>
      </div>

      {!isEmailConfigured() && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-dark bg-white p-4 text-sm text-foreground">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <strong>E-maily zatím neodcházejí.</strong> Poptávky se ukládají sem, ale
            upozornění ani potvrzení zájemcům nechodí. Zapne se doplněním proměnných
            RESEND_API_KEY, RESEND_FROM a NOTIFY_TO.
          </p>
        </div>
      )}

      <InquiryFilterTabs current={filter} counts={counts} />

      {items.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-text-secondary">
          {page > 1 ? (
            <>
              Na této stránce už nic není.{" "}
              <Link href={inquiryFilterHref(filter)} className="font-semibold text-foreground underline">
                Zpět na začátek
              </Link>
            </>
          ) : filter === "active" ? (
            "Zatím tu žádná poptávka není."
          ) : (
            "V tomto stavu teď žádná poptávka není."
          )}
        </p>
      ) : (
        <InquiryList items={items} />
      )}

      {(page > 1 || hasMore) && (
        <nav aria-label="Stránkování" className="flex justify-between text-sm font-semibold">
          {page > 1 ? (
            <Link href={inquiryFilterHref(filter, page - 1)} className="text-foreground underline">
              Novější
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={inquiryFilterHref(filter, page + 1)} className="text-foreground underline">
              Starší
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
