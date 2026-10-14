"use client";

import { useEffect, useId, useRef } from "react";

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Potvrdit",
  cancelLabel = "Zrušit",
  pendingLabel = "Pracuji...",
  destructive = false,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  destructive?: boolean;
  pending?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => onOpenChange(false)}
      // Během akce nejde dialog zavřít Escapem ani klikem vedle.
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !pending) onOpenChange(false);
      }}
      // m-auto je tu nutné: nativní <dialog> se přes showModal() centruje
      // právě okrajem auto, jenže reset Tailwindu nuluje margin všem prvkům.
      // Bez toho dialog vyskočí v levém horním rohu přes boční menu.
      className="m-auto rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="w-96 max-w-[90vw] p-6">
        {/* h2: dialog leží nad stránkou s h1, h3 by v osnově přeskočil úroveň. */}
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm text-text-secondary">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              destructive ? "bg-salmon hover:opacity-90" : "bg-accent hover:bg-accent-dark"
            }`}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
