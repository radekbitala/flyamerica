<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pravidla projektu FLY America

- Kód, názvy proměnných a souborů anglicky. Komentáře a dokumentace česky s diakritikou, jen tam, kde vysvětlují proč.
- Texty v UI česky, věcně, bez superlativů. Nikdy dlouhou ani střední pomlčku, jen krátký spojovník "-" (i v rozsazích, 6-8 týdnů).
- Honzova role je v našich textech vždy "mentor", nikdy "instruktor".
- Web a administrace mají oddělené kořenové layouty: `src/app/(web)` (CSS z `src/styles`, bez Tailwindu) a `src/app/admin` (Tailwind). Styly se nemíchají.
- `src/styles/fa-tokeny.css` a `src/styles/web.css` jsou kopie z klikacího modelu a neupravují se. Styly stránek patří do `src/styles/pages/` (`home.css`, `trips.css`, `destinations.css`, `article.css`, `contact.css`, `status.css` pro chybovou stránku a 404, každá oblast webu jen do svého souboru). `site.css` jsou společné styly všech stránek (oblast Globální prvky: mobilní menu, výběr textu, zalamování, seznam kontaktů, role Honzy u fotky `.who-role`), layout `(web)` i `global-not-found.tsx` ho načítají jako poslední.
- Menu a adresy webu (12. 10. 2026): Letecké výlety `/letecke-vylety`, Kam letět `/kam-letet`, Z cest `/z-cest`, Váš mentor `/vas-mentor`, Kontakt `/kontakt`. Adresy v kódu jen přes `src/lib/routes.ts`. Slovo „balíček“ na webu nepoužívat, je to „výlet“. Texty výletů, destinací (včetně tipů pro piloty) a požadavky na piloty jsou v `src/data/trips.ts`, `src/data/destinations.ts` a `src/data/pilot-requirements.ts` doslova od Honzy. Opravuje se jen pravopis a jen po Radkově rozhodnutí (14. 10. 2026 překlepy v textech destinací a v požadavcích na piloty, formulace, čárky a zápis času beze změny), podklady v `../podklady-od-Honzy` zůstávají doslova. Další výjimky podle Radkova rozhodnutí k auditu 14. 10. 2026 (`../design/audit-2026-10-13/ROZHODNUTI-2026-10-14.md`, popsané v úvodu `trips.ts`): 13 = řádek „Výcvik“ u Grand Tour je „Náplň programu“, text doslova; 20 = ceny ve tvaru „7 400 USD“, stejné záhlaví tabulek „Co zahrnuje cena“, hodnoty Ano a Ne a „(doporučeno)“; 23 = perex Letecké výlety složený ze dvou Honzových vět beze změny slov. Jiné změny Honzových textů ne.
- Na webu nesmí být žádná značka `[doplnit: …]` (úprava 7 z auditu): chybějící obsah od Honzy se skryje, nic se nevymýšlí, co chybí, patří do `../design/audit-2026-10-13/BACKLOG-po-spusteni.md`. Hlídá to e2e test „web bez značek [doplnit]“ a administrace článek se značkou nepublikuje.
- Název stránky nebo sekce je polohová tabule `SectionSign` (`src/components/web/SectionSign.tsx`), v jednom záběru obrazovky nejvýš jedna (`../prototyp/DESIGN.md`, The One Location Sign Rule).
- Veřejné stránky: hlavičku, patičku a `<main id="obsah">` dodává layout `(web)`, stránka vrací jen obsah. Metadata každé stránky přes `pageMetadata()` (`src/lib/metadata.ts`), fotky přes `Figure`/`Photo` a `src/data/photos.ts`, text článků z databáze přes `czechNbsp()` (`src/lib/typography.ts`, pevné mezery a české uvozovky). Přehled v README, část Veřejný web.
- Každá server action a API routa administrace volá hned na začátku `await requireAdmin()` (`src/lib/admin-guard.ts`). Hlídá to ESLint pravidlo `local/require-admin`.
- Nový formulář administrace: výjimku ze server action (výpadek sítě, chyba serveru) chytit ve formuláři a ukázat hlášku, rozepsaný text nesmí skončit na chybové stránce. Přesměrování po úspěšném uložení propustit přes `unstable_rethrow`. Neuložené změny hlídat přes `LeaveGuard` (`src/components/admin/LeaveGuard.tsx`). Vzor je `PostForm.tsx` a `inquiries/InquiryNoteForm.tsx` (úprava 10 z auditu).
- HTML článků se před uložením čistí přes `sanitizePostHtml()` (`src/lib/sanitize.ts`), po každé změně článku se volá `revalidatePublicPosts()` (`src/lib/posts-cache.ts`).
- Soubory `.env*` se nečtou, nevypisují ani necommitují. Lokální testovací hodnoty zapisuje jen `scripts/local-db.mjs` do `.env.development.local`.
