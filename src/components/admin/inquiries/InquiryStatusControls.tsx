"use client";

import { useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { setInquiryStatus } from "@/app/admin/(dashboard)/poptavky/actions";
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  type InquiryStatus,
} from "@/lib/inquiries/options";

/**
 * Přepínač stavu. Archivace je jen další stav: archivovaná poptávka zmizí
 * z výchozího seznamu a vrátí se volbou jiného stavu.
 */
export function InquiryStatusControls({ id, status }: { id: string; status: InquiryStatus }) {
  const [pending, startTransition] = useTransition();

  function change(next: InquiryStatus) {
    startTransition(async () => {
      try {
        const result = await setInquiryStatus(id, next);
        if (result.ok) toast.success(`Stav změněn: ${INQUIRY_STATUS_LABELS[next]}`);
        else toast.error(result.error);
      } catch (err) {
        // Výpadek sítě nebo chyba serveru: hláška místo chybové stránky
        // (rozepsaná poznámka vedle tak zůstane).
        unstable_rethrow(err);
        console.warn("[admin] změna stavu poptávky selhala", err);
        toast.error("Stav se nepodařilo změnit. Zkontrolujte připojení a zkuste to znovu.");
      }
    });
  }

  return (
    <div role="group" aria-label="Stav poptávky" className="flex flex-wrap gap-2">
      {INQUIRY_STATUSES.map((s) => {
        const current = s === status;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={current}
            disabled={pending || current}
            onClick={() => change(s)}
            className={`min-h-11 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-default sm:min-h-0 pointer-coarse:min-h-11 ${
              current
                ? "border-foreground bg-foreground text-white"
                : "border-gray-300 bg-white text-foreground hover:border-foreground disabled:opacity-50"
            }`}
          >
            {INQUIRY_STATUS_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
