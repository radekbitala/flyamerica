"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInquiry } from "@/app/admin/(dashboard)/poptavky/actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/** Trvalé smazání jen přes potvrzovací dialog. Běžná cesta je archivace. */
export function DeleteInquiryButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      // Po smazání akce přesměruje na seznam, vrací se jen při chybě.
      const result = await deleteInquiry(id);
      if (result?.ok === false) {
        setOpen(false);
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-salmon px-3 py-2 text-sm font-medium text-salmon transition-colors hover:bg-salmon hover:text-white"
      >
        <Trash2 size={16} aria-hidden="true" />
        Smazat trvale
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        title="Smazat poptávku trvale?"
        description={`Poptávka od ${name} zmizí i s interní poznámkou a vrátit ji nepůjde. Když ji chcete jen schovat ze seznamu, dejte ji do archivu.`}
        confirmLabel="Smazat"
        pendingLabel="Mažu..."
        pending={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
