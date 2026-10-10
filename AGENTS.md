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
- `src/styles/fa-tokeny.css` a `src/styles/web.css` jsou kopie z klikacího modelu a neupravují se.
- Veřejné stránky: hlavičku, patičku a `<main id="obsah">` dodává layout `(web)`, stránka vrací jen obsah. Metadata každé stránky přes `pageMetadata()` (`src/lib/metadata.ts`), fotky přes `Figure`/`Photo` a `src/data/photos.ts`, text článků z databáze přes `czechNbsp()` (`src/lib/typography.ts`). Přehled v README, část Veřejný web.
- Každá server action a API routa administrace volá hned na začátku `await requireAdmin()` (`src/lib/admin-guard.ts`). Hlídá to ESLint pravidlo `local/require-admin`.
- HTML článků se před uložením čistí přes `sanitizePostHtml()` (`src/lib/sanitize.ts`), po každé změně článku se volá `revalidatePublicPosts()` (`src/lib/posts-cache.ts`).
- Soubory `.env*` se nečtou, nevypisují ani necommitují. Lokální testovací hodnoty zapisuje jen `scripts/local-db.mjs` do `.env.development.local`.
