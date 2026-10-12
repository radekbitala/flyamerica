"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES, destinationPath } from "@/lib/routes";

/**
 * Dřívější kotvy detailů (/kam-letet#cedar-key, i /tipy-na-vylety#cedar-key,
 * přesměrování na serveru kotvu zachová) vedou na detail destinace. Kotva
 * se na server neposílá, proto přesměrování až v prohlížeči.
 *
 * Kotva se nejdřív z adresy smaže (replaceState), pak se detail otevře
 * v okně nad rozcestníkem jako po kliku na dlaždici. Zavřít (router.back())
 * se tak vrátí na /kam-letet bez kotvy a okno se znovu neotevře. Neznámá
 * kotva nedělá nic.
 *
 * replaceState musí zachovat stav záznamu historie, který si do něj zapsal
 * Next (__NA a strom stránky, HistoryUpdater v useInsertionEffect, tedy už
 * před tímto efektem). Bez něj by Next událost popstate po router.back()
 * ignoroval: adresa by se vrátila na /kam-letet, ale okno by zůstalo otevřené
 * a stránka pod ním zamknutá. Vlastní obsluhu replaceState, která stav
 * doplní sama, si Next instaluje až v efektu kořene aplikace, ten při prvním
 * načtení běží po efektech stránky.
 */
export function LegacyAnchorRedirect({ slugs }: { slugs: readonly string[] }) {
  const router = useRouter();

  useEffect(() => {
    const slug = window.location.hash.slice(1);
    if (!slugs.includes(slug)) return;
    window.history.replaceState(window.history.state, "", `${ROUTES.destinations}${window.location.search}`);
    router.push(destinationPath(slug), { scroll: false });
  }, [router, slugs]);

  return null;
}
