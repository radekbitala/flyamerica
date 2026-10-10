"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Hláška po přesměrování ze server action (?toast=klic). Další klíče
 * přidávají stránky administrace podle potřeby.
 */
const MESSAGES: Record<string, { kind: "success" | "info"; msg: string }> = {
  saved: { kind: "success", msg: "Uloženo" },
  deleted: { kind: "success", msg: "Smazáno" },
  // Deník
  "post-draft": { kind: "success", msg: "Koncept uložen" },
  "post-published": { kind: "success", msg: "Článek publikován" },
  "post-updated": { kind: "success", msg: "Změny uloženy" },
  "post-unpublished": { kind: "info", msg: "Článek vrácen do konceptů, na webu už není" },
  "post-deleted": { kind: "success", msg: "Článek smazán" },
};

export function ToastOnParam() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const key = params.get("toast");
    if (!key) return;
    const m = MESSAGES[key];
    if (m) toast[m.kind](m.msg);

    const next = new URLSearchParams(params.toString());
    next.delete("toast");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, router, pathname]);

  return null;
}
