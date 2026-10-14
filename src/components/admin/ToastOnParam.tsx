"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { postPath } from "@/lib/routes";

/**
 * Hláška po přesměrování ze server action (?toast=klic). Další klíče
 * přidávají stránky administrace podle potřeby.
 */
const MESSAGES: Record<string, { kind: "success" | "info"; msg: string }> = {
  saved: { kind: "success", msg: "Uloženo" },
  deleted: { kind: "success", msg: "Smazáno" },
  // Články (Z cest)
  "post-draft": { kind: "success", msg: "Koncept uložen" },
  "post-published": { kind: "success", msg: "Článek publikován" },
  "post-updated": { kind: "success", msg: "Změny uloženy" },
  "post-unpublished": { kind: "info", msg: "Článek stažen z webu, je v konceptech" },
  "post-deleted": { kind: "success", msg: "Článek smazán" },
};

/** Adresa článku z ?clanek= (po publikaci odkaz Zobrazit na webu). Jen tvar adresy článku. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function ToastOnParam() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const key = params.get("toast");
    if (!key) return;
    const m = MESSAGES[key];
    const slug = params.get("clanek");
    if (m && slug && SLUG.test(slug)) {
      toast[m.kind](m.msg, {
        duration: 10_000,
        action: (
          <a
            href={postPath(slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 text-sm font-semibold text-foreground underline underline-offset-2"
          >
            Zobrazit na webu
          </a>
        ),
      });
    } else if (m) {
      toast[m.kind](m.msg);
    }

    const next = new URLSearchParams(params.toString());
    next.delete("toast");
    next.delete("clanek");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, router, pathname]);

  return null;
}
