"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Dotaz před odchodem ze stránky s neuloženými změnami (článek, interní
 * poznámka poptávky). Hlídá:
 *   - odkazy v administraci (menu, drobečky, Zpět na články): vlastní dialog,
 *     po potvrzení se klik na odkaz zopakuje, takže se zavře i menu na telefonu,
 *   - odeslání jiného formuláře na stránce (Odhlásit v menu),
 *   - zavření okna, obnovení stránky a odkaz na jiný web: dotaz prohlížeče
 *     (beforeunload, text dotazu určuje prohlížeč).
 * Tlačítko Zpět v prohlížeči hlídat nejde, u článku proto zůstává záloha
 * v prohlížeči (PostForm).
 *
 * Kliky se zachytávají v document ve fázi capture, tedy dřív, než je dostane
 * React a Link z Next. Odkaz do nové záložky nebo s klávesou Ctrl/Cmd
 * stránku neopouští a projde.
 */
export function LeaveGuard({
  when,
  title,
  description,
  confirmLabel = "Odejít bez uložení",
  ownForm,
}: {
  when: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Formulář, jehož odeslání je uložení (ten se nehlídá). */
  ownForm?: React.RefObject<HTMLFormElement | null>;
}) {
  const [pending, setPending] = useState<(() => void) | null>(null);
  // Zopakovaný klik nebo odeslání po potvrzení projde bez dotazu.
  const allowNext = useRef(false);
  // Po potvrzení odchodu (i na jiný web) se už nehlásí beforeunload.
  const leaving = useRef(false);

  useEffect(() => {
    if (!when) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
      // Starší Safari a Chrome chtějí i returnValue.
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (allowNext.current) {
        allowNext.current = false;
        return;
      }
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (!url.protocol.startsWith("http")) return; // mailto:, tel:
      // Kotva na stejné stránce stránku neopouští.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPending(() => () => {
        leaving.current = true;
        allowNext.current = true;
        link.click();
      });
    };

    const onSubmit = (event: SubmitEvent) => {
      if (allowNext.current) {
        allowNext.current = false;
        return;
      }
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form === ownForm?.current) return;
      event.preventDefault();
      event.stopPropagation();
      const submitter = event.submitter;
      setPending(() => () => {
        leaving.current = true;
        allowNext.current = true;
        form.requestSubmit(submitter instanceof HTMLButtonElement ? submitter : null);
      });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [when, ownForm]);

  return (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel="Zůstat"
      onConfirm={() => {
        const go = pending;
        setPending(null);
        // Až po zavření dialogu: dokud je otevřený, zbytek stránky je inert.
        if (go) window.setTimeout(go, 0);
      }}
    />
  );
}
