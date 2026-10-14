"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface PromptField {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: "text" | "url";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

/**
 * Malé okno s jedním nebo více poli místo window.prompt (odkaz, video,
 * popisek fotky v editoru). Systémové okno prohlížeče na telefonu překryje
 * stránku, neumí nápovědu ani chybovou hlášku a nedá se zavřít jen
 * klávesou. Tady Enter potvrdí, Esc zavře, fokus jde do prvního pole.
 *
 * Okno leží uvnitř formuláře článku a samo formulář být nesmí (form ve
 * formuláři HTML nedovoluje). Enter v poli proto potvrdí okno ručně, jinak
 * by odeslal článek.
 *
 * onConfirm vrátí text chyby (okno zůstane otevřené s hláškou u polí),
 * nebo null (okno se zavře).
 */
export function PromptDialog({
  open,
  title,
  description,
  fields,
  confirmLabel,
  cancelLabel = "Zrušit",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  fields: PromptField[];
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: (values: Record<string, string>) => string | null;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const baseId = useId();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Celý obsah pole označený, aby šel rovnou přepsat (např. adresa odkazu).
      dialog.querySelector<HTMLInputElement>("input")?.select();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function values(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const input of ref.current?.querySelectorAll<HTMLInputElement>("input[data-field]") ?? []) {
      result[input.dataset.field ?? ""] = input.value;
    }
    return result;
  }

  function confirm() {
    const message = onConfirm(values());
    setError(message);
    if (message) ref.current?.querySelector<HTMLInputElement>("input")?.focus();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => {
        setError(null);
        if (open) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      {/* Pole se při každém otevření vykreslí znovu s výchozí hodnotou. */}
      {open && (
        <div className="w-[28rem] max-w-[90vw] p-6">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-2 text-sm text-text-secondary">
              {description}
            </p>
          )}
          <div className="mt-4 space-y-4">
            {fields.map((field, index) => {
              const id = `${baseId}-${field.name}`;
              const hintId = field.hint ? `${id}-hint` : undefined;
              const describedBy = [hintId, error && index === 0 ? errorId : undefined]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={field.name}>
                  <label htmlFor={id} className="mb-1 block text-sm font-semibold text-foreground">
                    {field.label}
                  </label>
                  <input
                    id={id}
                    data-field={field.name}
                    type={field.type ?? "text"}
                    inputMode={field.inputMode}
                    defaultValue={field.defaultValue ?? ""}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    aria-invalid={error && index === 0 ? true : undefined}
                    aria-describedby={describedBy || undefined}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        confirm();
                      }
                    }}
                    className={`h-11 w-full rounded-[10px] border bg-white px-4 text-sm text-foreground focus:border-accent focus:outline-none ${
                      error && index === 0 ? "border-salmon" : "border-field"
                    }`}
                  />
                  {field.hint && (
                    <p id={hintId} className="mt-1 text-xs text-text-secondary">
                      {field.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {error && (
            <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-salmon">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="min-h-11 cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 sm:min-h-0"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={confirm}
              className="min-h-11 cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark sm:min-h-0"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
