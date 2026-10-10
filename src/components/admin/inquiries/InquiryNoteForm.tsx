"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveInquiryNote } from "@/app/admin/(dashboard)/poptavky/actions";

export function InquiryNoteForm({ id, note }: { id: string; note: string | null }) {
  const [value, setValue] = useState(note ?? "");
  const [saved, setSaved] = useState(note ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value.trim() !== saved;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveInquiryNote(id, value);
      if (result.ok) {
        setSaved(value.trim());
        toast.success("Poznámka uložená");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
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
      <button
        type="submit"
        disabled={pending || !dirty}
        className="cursor-pointer rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-default disabled:opacity-50"
      >
        {pending ? "Ukládám..." : "Uložit poznámku"}
      </button>
    </form>
  );
}
