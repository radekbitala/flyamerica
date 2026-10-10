import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { requireAdminPage } from "@/lib/admin-guard";
import { getInquiry } from "@/lib/inquiries/admin";
import { INQUIRY_KIND_LABELS, packageName } from "@/lib/inquiries/options";
import { InquiryStatusBadge } from "@/components/admin/inquiries/InquiryStatusBadge";
import { InquiryStatusControls } from "@/components/admin/inquiries/InquiryStatusControls";
import { InquiryNoteForm } from "@/components/admin/inquiries/InquiryNoteForm";
import { DeleteInquiryButton } from "@/components/admin/inquiries/DeleteInquiryButton";
import { formatDateTime, telHref } from "@/components/admin/inquiries/format";

export const metadata: Metadata = {
  title: "Poptávka",
};

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();

  const { id } = await params;
  // Neplatné id by v Postgresu skončilo chybou typu uuid, ne prázdným výsledkem.
  if (!z.uuid().safeParse(id).success) notFound();
  const inquiry = await getInquiry(id);
  if (!inquiry) notFound();

  const callback = inquiry.kind === "callback";

  return (
    <div className="space-y-6">
      <Link
        href="/admin/poptavky"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Zpět na poptávky
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-secondary">
            {INQUIRY_KIND_LABELS[inquiry.kind]} z {formatDateTime(inquiry.createdAt)}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{inquiry.name}</h1>
        </div>
        <InquiryStatusBadge status={inquiry.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Kontakt">
            <Field label="E-mail">
              {inquiry.email && (
                <a href={`mailto:${inquiry.email}`} className="font-medium text-foreground underline">
                  {inquiry.email}
                </a>
              )}
            </Field>
            <Field label="Telefon">
              {inquiry.phone && (
                <a href={telHref(inquiry.phone)} className="font-medium text-foreground underline">
                  {inquiry.phone}
                </a>
              )}
            </Field>
            {!callback && <Field label="Odkud o nás ví">{inquiry.referralSource}</Field>}
          </Section>

          {!callback && (
            <Section title="Let">
              <Field label="Balíček">{packageName(inquiry.packageSlug)}</Field>
              <Field label="Termín">{inquiry.travelDate}</Field>
              <Field label="Počet pilotů">{inquiry.pilotCount}</Field>
              <Field label="Doprovod">{inquiry.companions}</Field>
              <Field label="Licence">{inquiry.licence}</Field>
            </Section>
          )}

          {!callback && (
            <Section title="Od zájemce">
              <Field label="Pár slov o pilotovi" long>
                {inquiry.aboutPilot}
              </Field>
              <Field label="Zpráva" long>
                {inquiry.message}
              </Field>
            </Section>
          )}

          <Section title="Záznam">
            <Field label="Přijato">{formatDateTime(inquiry.createdAt)}</Field>
            <Field label="Naposledy změněno">{formatDateTime(inquiry.updatedAt)}</Field>
          </Section>
        </div>

        <aside className="space-y-6">
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-foreground">Stav</h2>
            <InquiryStatusControls id={inquiry.id} status={inquiry.status} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <InquiryNoteForm id={inquiry.id} note={inquiry.internalNote} />
          </div>

          <DeleteInquiryButton id={inquiry.id} name={inquiry.name} />
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <dl className="divide-y divide-gray-100">{children}</dl>
    </section>
  );
}

/** Řádek údajů, prázdná hodnota se ukáže jako „nevyplněno". */
function Field({
  label,
  long = false,
  children,
}: {
  label: string;
  long?: boolean;
  children: React.ReactNode;
}) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div className={`py-2.5 ${long ? "" : "sm:grid sm:grid-cols-3 sm:gap-4"}`}>
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd
        className={`text-sm text-foreground ${long ? "mt-1 whitespace-pre-line" : "sm:col-span-2"}`}
      >
        {empty ? <span className="text-text-secondary">nevyplněno</span> : children}
      </dd>
    </div>
  );
}
