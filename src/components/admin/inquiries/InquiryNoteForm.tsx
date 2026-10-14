"use client";

import { useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { saveInquiryNote } from "@/app/admin/(dashboard)/poptavky/actions";
import { LeaveGuard } from "@/components/admin/LeaveGuard";

/** Výjimka ze server action (výpadek sítě, chyba serveru): text zůstává v poli. */
const SAVE_FAILED_MESSAGE =
  "Poznámku se nepodařilo uložit. Zkontrolujte připojení a zkuste to znovu, text zůstává tady.";

export function InquiryNoteForm({ id, note }: { id: string; note: string | null }) {
  const [value, setValue] = useState(note ?? "");
  const [saved, setSaved] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = value.trim() !== saved;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await saveInquiryNote(id, value);
        if (result.ok) {
          setSaved(value.trim());
          setError(null);
          toast.success("Poznámka uložená");
        } else {
          setError(result.error);
        }
      } catch (err) {
        // Bez try/catch by výjimka skončila na chybové stránce a text by zmizel.
        unstable_rethrow(err);
        console.warn("[admin] uložení poznámky selhalo", err);
        setError(SAVE_FAILED_MESSAGE);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="inquiry-note" className="mb-1 block text-sm font-semibold text-foreground">
          Interní poznámka
        </label>
        <textarea
          id="inquiry-note"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          aria-describedby="inquiry-note-hint"
          className="w-full rounded-[10px] border border-field bg-white px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
        />
        <p id="inquiry-note-hint" className="mt-1 text-xs text-text-secondary">
          Vidí ji jen administrace, zájemci se neposílá.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="cursor-pointer rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Ukládám..." : "Uložit poznámku"}
        </button>
        <span role="status" className="text-sm font-semibold text-foreground">
          {dirty && !pending ? "Neuložené změny" : ""}
        </span>
      </div>
      {error && !pending && (
        <p role="alert" className="text-sm font-medium text-salmon">
          {error}
        </p>
      )}
      <LeaveGuard
        when={dirty}
        ownForm={formRef}
        title="Odejít bez uložení?"
        description="Interní poznámka není uložená. Když odejdete, změny v ní se ztratí."
      />
    </form>
  );
}
