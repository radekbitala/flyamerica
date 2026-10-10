import { INQUIRY_STATUS_LABELS, type InquiryStatus } from "@/lib/inquiries/options";

const STYLES: Record<InquiryStatus, string> = {
  // Žlutá jen u nových, ať v seznamu na první pohled vystoupí.
  new: "bg-yellow text-foreground",
  in_progress: "border border-foreground bg-white text-foreground",
  done: "bg-green-light text-green",
  archived: "bg-warm-gray text-text-secondary",
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {INQUIRY_STATUS_LABELS[status]}
    </span>
  );
}
