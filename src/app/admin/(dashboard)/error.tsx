"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
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
        onClick={() => unstable_retry()}
        className="cursor-pointer rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        Zkusit znovu
      </button>
    </div>
  );
}
