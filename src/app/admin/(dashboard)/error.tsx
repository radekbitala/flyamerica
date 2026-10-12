"use client";

import { useEffect } from "react";

/**
 * Chyba při vykreslení stránky administrace. Next 16 předává error,
 * reset a retry (ErrorInfo v next/dist/client/components/error-boundary).
 * retry() načte stránku znovu ze serveru a překreslí ji, reset() by jen
 * zrušil chybu bez nového načtení dat, takže by stejná chyba přišla hned znovu.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Něco se pokazilo</h1>
      <p className="text-text-secondary">
        Stránku se nepodařilo načíst. Zkuste to znovu, a když chyba trvá,
        dejte vědět Radkovi.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="cursor-pointer rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        Zkusit znovu
      </button>
    </div>
  );
}
