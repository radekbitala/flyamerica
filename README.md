# FLY America - web

Nový web www.flyamerica.cz: veřejné stránky (Letecké výlety, Kam letět, Z cest, Váš mentor, Kontakt s poptávkovým formulářem) a administrace pro články Z cest a poptávky. Honza Čermák létá jako mentor s českými piloty na Floridě.

Stav: administrace (přihlášení, přehled, články, poptávky) i veřejný web jsou hotové. Stránky webu jsou převedené z klikacího modelu `../prototyp` (úvod, oba výlety, Kam letět, Váš mentor, Z cest a články, Kontakt s poptávkou, zásady zpracování osobních údajů jako návrh), články jsou z databáze a deník starého webu převádí importní skript (část Import deníku). 12. 10. 2026 dostal web nové menu a adresy (Letecké výlety, Kam letět, Z cest, Váš mentor, Kontakt, dřív Balíčky, Tipy na výlety, Deník, O Honzovi), slovo „balíček“ z textů zmizelo a dřívější adresy trvale přesměrovávají na nové (Veřejný web, Přesměrování). 14. 10. 2026 přibyly další podklady od Honzy: nové texty a tipy pro piloty u destinací, kód Palatky 28J, požadavky na piloty a sídlo provozovatele (Výlety a destinace, Poptávky). 14. 10. 2026 jsou zapracované úpravy z auditu webu (`../design/audit-2026-10-13/NAVRH-UPRAV.md`) podle Radkových rozhodnutí z 14. 10. 2026 (`ROZHODNUTI-2026-10-14.md`): na webu není žádná značka `[doplnit]`, poptávka si pamatuje rozepsané údaje, destinace vedou k výletům a poptávce, kratší mobil (Kam letět jako seznam, galerie článků v náhledech), sjednocené ceny a tabulky výletů, rok cesty u článků, úpravy administrace proti ztrátě textu a galerie, zásady se spisovou značkou a poskytovateli a menší písma. Co čeká na spuštění, na Honzu nebo je až po spuštění, je v `../design/audit-2026-10-13/BACKLOG-po-spusteni.md`. Web je nasazený na Vercelu na `https://flyamerica.vercel.app` (produkce v regionu `dub1`, Dublin, blízko databáze Supabase v eu-west-1), do vyhledávačů zatím nesmí (Spuštění webu). Podrobnosti v části Nasazení.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Postgres na Supabase, Drizzle ORM a postgres-js
- Přihlášení: Auth.js (next-auth v5) s e-mailem a heslem, hesla v bcryptu
- Obrázky deníku: Supabase Storage (bucket `denik`)
- E-maily: Resend přes HTTP API
- Administrace: Tailwind 4, Tiptap 3 (editor článků), sonner, lucide-react
- Veřejný web: CSS z klikacího modelu (`src/styles`), bez Tailwindu, písma lokálně přes `next/font/local`, fotky přes `next/image` (AVIF a WebP)
- Testy: lokální Postgres (embedded-postgres), e2e přes playwright-core a systémový Chrome

## Struktura

```
src/
  app/
    (web)/                 veřejný web, vlastní kořenový layout a CSS, stránky viz Veřejný web
      letecke-vylety/      /letecke-vylety (přehled) a /letecke-vylety/[slug] (detail výletu), fotky v _data/trip-media.ts
      kam-letet/           /kam-letet (destinace) a /kam-letet/[slug] (detail jako celá stránka), _components/
      @modal/              paralelní slot pro okno s detailem destinace (default.tsx = nic, (.)kam-letet = okno)
      z-cest/              /z-cest a /z-cest/[slug] (články, dřív Deník), komponenty článku v _components/
      vas-mentor/          /vas-mentor (dřív O Honzovi)
      kontakt/             /kontakt: poptávka, Zavolejte mi, server actions
    admin/                 administrace, vlastní kořenový layout s Tailwindem
      (auth)/login/        přihlášení
      (dashboard)/         stránky za přihlášením (přehled, Z cest, poptávky)
    api/auth/[...nextauth] Auth.js
    api/admin/upload/      nahrávání fotek článků do úložiště
    global-not-found.tsx   404 pro neznámé adresy (oba layouty)
    global-error.tsx       chyba v kořenovém layoutu (oba layouty), česky, bez stylů webu
    (web)/error.tsx        chybová stránka webu (Zkusit znovu, úvod, telefon)
    sitemap.ts, robots.ts  /sitemap.xml a /robots.txt
    favicon.ico, icon.png, apple-icon.png
  components/
    admin/                 komponenty administrace (mimo jiné LeaveGuard.tsx dotaz před odchodem, PromptDialog.tsx
                           malé okno editoru, post-backup.ts záloha článku v prohlížeči, AdminHelpContact.tsx kontakt na Radka)
    web/                   komponenty webu (hlavička, patička, záhlaví, polohová tabule, výzva, seznam kontaktů, fotky, Honza, panel Poptávka, 404), viz Veřejný web
  data/
    trips.ts               letecké výlety: texty, tabulky a ceny doslova od Honzy, letadlo jednou (AIRCRAFT)
    trip-slugs.ts          slugy výletů (adresy a ?vylet=), samostatně kvůli menu v prohlížeči
    destinations.ts        destinace Kam letět: názvy, kódy, texty a tipy pro piloty od Honzy (opravený jen pravopis), fotky
    pilot-requirements.ts  požadavky na piloty od Honzy, opravený jen pravopis (úvod, oba výlety, nápověda licence na Kontaktu)
    photos.ts              fotky stránek: z modelu a sloučené sady z fotobanky (photos-home/trips/destinations/article.ts)
    redirects.json         přesměrování starých adres (načte next.config.ts)
  lib/
    db/schema.ts           databázové schéma (tabulky, enumy, RLS)
    db/index.ts            připojení k databázi (vytvoří se až při prvním dotazu)
    auth.ts                Auth.js
    admin-guard.ts         requireAdmin(), requireAdminPage(), signedOutAsNull()
    login-limit.ts         omezení pokusů o přihlášení podle otisku IP
    email.ts               e-maily přes Resend
    site.ts                název, adresa (SITE_URL, výchozí https://www.flyamerica.cz), kontakt webu (i WhatsApp a lhůta odpovědi), sídlo a spisová značka provozovatele
    routes.ts              adresy stránek webu (ROUTES, tripPath, destinationPath, postPath)
    metadata.ts            pageMetadata(): titulek, popis, canonical, og a twitter stránky
    public-posts.ts        články pro veřejný web (jen publikované, cache s tagem)
    typography.ts          czechNbsp(): pevné mezery podle pravidla R4 z modelu a české uvozovky
    dates.ts               data jako v modelu („21. 12. 2023“, pražský čas)
    inquiries/             poptávky: volby formuláře, zod schéma, ochrana proti spamu, dotazy administrace
    supabase/admin.ts      úložiště obrázků (servisní klíč, jen server)
    sanitize.ts            čištění HTML článků
    post-form.ts           články: zod schéma formuláře článku, limity, adresa z názvu
    post-files.ts          články: fotky článku v úložišti (kontrola adres, úklid, allowedImagePrefixes() pro editor)
    posts-cache.ts         obnovení veřejných stránek po změně článku
    post-content.ts        články na webu: text článku na strom pro React, podtitul, obsah článku, galerie a odkaz na video
    post-display.ts        články na webu: krátký název článku a popis stránky
    post-title.ts          postDisplayTitle(): titulek článku bez přípony „ | 2016“
    post-year.ts           rok cesty u článku: postYear(), postDateLabel() („vydáno …“), titleLabelYear()
    image-hosts.ts         odkud smí být fotky deníku (bucket denik, při vývoji lokální), pro next/image i uložení článku
    fonts.ts               písma přes next/font/local (soubory z modelu)
  types/next-auth.d.ts     verze přihlášení v session (Auth.js)
  styles/                  fa-tokeny.css a web.css z klikacího modelu (neupravovat), fonts.css
    pages/                 styly stránek po web.css: home, trips, destinations, article, contact, status (každá oblast svůj soubor), site.css (společné pro všechny stránky, načítá se poslední)
  fonts/                   WOFF2 z modelu: Overpass, Overpass Mono, Source Serif 4 (OFL), latin-ext zúžené na českou a slovenskou diakritiku (Písma)
public/
  img/                     fotky stránek (největší varianta z modelu), fotky z fotobanky v img/<oblast>/
  logo/                    logo do hlavičky (pixelové SVG 32 a 24 px)
  og/                      náhledy odkazu 1200 x 630
drizzle/                   SQL migrace
scripts/
  local-db.mjs             lokální databáze pro vývoj a testy
  create-admin.mjs         založení účtu do administrace
  import-denik.mjs         import deníku ze starého webu (../migrace), viz Import deníku
  e2e.mjs                  spouštěč e2e testů (administrace i veřejný web), pořadí modulů v RUN_ORDER
  e2e/                     e2e testy po oblastech: admin, uvod-vylety, globalni, kam-letet, kontakt, z-cest (_lib.mjs pomocné funkce)
  test-redirects.mjs       test přesměrování starých adres proti běžícímu serveru
  test-inquiry-action.mjs  test validace poptávky bez serveru a databáze
  test-typography.mjs      test pevných mezer (texty z modelu), českých uvozovek a smajlíků
eslint-rules/              vlastní pravidlo local/require-admin
```

Web a administrace mají každý svůj kořenový layout, aby se jejich styly nikdy nemíchaly. Přechod mezi webem a administrací je proto vždy celé načtení stránky. Adresu, která neodpovídá žádné stránce, obsluhuje `global-not-found.tsx` (vzhled webu), `notFound()` uvnitř webu `(web)/not-found.tsx` a uvnitř administrace `admin/(dashboard)/not-found.tsx`.

Chyby při vykreslení: stránky webu `(web)/error.tsx` (v layoutu webu s hlavičkou a patičkou: „Stránku se nepodařilo načíst“, Zkusit znovu, odkaz na úvod a Honzův telefon, žádné technické podrobnosti), stránky administrace `admin/(dashboard)/error.tsx` („Něco se pokazilo“, Zkusit znovu). Obě volají `retry()` z props error.js v Next 16 (`error`, `reset`, `retry`): načte segment znovu ze serveru a překreslí ho, `reset()` by jen zrušil chybu bez nových dat. Chybu v kořenovém layoutu (error.tsx je pod ním) zachytí `global-error.tsx`: stejný text s vlastním `<html>` a vloženým CSS v barvách webu. Styly webu (`web.css`, písma) nenačítá, protože patří i k administraci. Bez nich by se ukázala anglická stránka Next „This page couldn’t load“.

## Proměnné prostředí

Hodnoty patří do Vercelu (produkce) nebo do `.env.development.local` (lokálně, zapisuje ho `npm run db:local`). Soubory `.env*` se necommitují.

| Proměnná | K čemu |
| --- | --- |
| `DATABASE_URL` | připojení k Postgresu (Supabase), s `?sslmode=require`. Na Vercelu sdílený pooler Supabase (Nasazení, krok 4) |
| `AUTH_SECRET` | podepisování přihlašovacích cookies (Auth.js) |
| `SUPABASE_URL` | adresa projektu Supabase (úložiště obrázků). Musí být nastavená i při buildu, jen pro ni povolí `next/image` fotky z bucketu `denik`. Podle ní administrace při uložení článku ověřuje adresy fotek |
| `SUPABASE_SERVICE_ROLE_KEY` | servisní klíč Supabase, jen na serveru (nahrávání a mazání obrázků) |
| `RESEND_API_KEY` | klíč Resendu pro odesílání e-mailů |
| `RESEND_FROM` | ověřený odesílatel, např. `FLY America <poptavky@flyamerica.cz>` |
| `NOTIFY_TO` | kam chodí upozornění na nové poptávky |
| `IP_HASH_SALT` | sůl pro otisk IP u poptávek a přihlášení (omezení četnosti, samotná IP se neukládá). Bez ní poslouží `AUTH_SECRET` |
| `DB_POOL_MAX` | volitelně: počet spojení do databáze (výchozí 10 v produkci, 1 při vývoji) |
| `NEXT_PUBLIC_SITE_URL` | volitelně: adresa webu pro canonical, og:url, mapu webu a náhledy odkazu, výchozí `https://www.flyamerica.cz` (hlavní doména s www, rozhodnutí 12. 10. 2026). Jiná jen pro náhledy a testy. Vkládá se při buildu |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `true` = web smí do vyhledávačů. Bez ní (výchozí, do spuštění webu) robots.txt zakáže celý web, stránky mají `<meta name="robots" content="noindex, nofollow">` a odpovědi hlavičku `X-Robots-Tag: noindex`. Vkládá se při buildu, po změně nové nasazení (Spuštění webu) |

Bez `RESEND_*` a `NOTIFY_TO` se e-maily jen zalogují, poptávka se uloží i tak. Build projde úplně bez proměnných, databáze ani úložiště se při importu nepřipojují. Stránky s články se pak nevygenerují při buildu, ale až při návštěvě (viz Veřejný web, Z cest).

## Lokální vývoj

```bash
npm install
npm run db:local            # lokální Postgres na portu 54329, běží do Ctrl+C
npm run dev                 # v druhém terminálu, http://localhost:3000
```

`npm run db:local` při prvním spuštění založí databázi v `.local-db/`, aplikuje migrace, vloží testovacího admina (`admin@test.local`, náhodné heslo), dva ukázkové články a kategorii a zapíše testovací hodnoty do `.env.development.local`. Heslo testovacího admina je v tom souboru (`TEST_ADMIN_PASSWORD`).

- `npm run db:local -- reset` smaže data a založí čistou databázi (s novými hesly)
- `npm run db:local -- stop` zastaví databázi spuštěnou v jiném terminálu

Kontroly:

```bash
npm run lint                # ESLint, včetně pravidla local/require-admin
npm run typecheck
npm run build
npx next dev -p 3201        # s běžící lokální databází
npm run e2e                 # e2e testy proti http://localhost:3201 (systémový Chrome)
node scripts/test-redirects.mjs        # přesměrování starých adres, proti http://localhost:3201
node scripts/test-inquiry-action.mjs   # validace poptávky, bez serveru a databáze
node scripts/test-typography.mjs       # pevné mezery, bez serveru a databáze
```

e2e testy veřejného webu počítají s ukázkovými daty z `npm run db:local`. S importovaným deníkem (`node scripts/import-denik.mjs --local`) a serverem fotek níž prověří i články ze starého webu (článek 2017, Oblet Ameriky) a uložení všech importovaných článků v administraci beze změny. Jen některé testy: `E2E_ONLY="Z cest" npm run e2e` (část názvu testu), jen jeden modul: `E2E_FILE=kontakt npm run e2e` (název souboru ve `scripts/e2e`). Test „web bez značek [doplnit]“ projde i všechny publikované články v lokální databázi: s publikovaným konceptem 2025, který značku v textu má, selže (správně). Změnu velikosti okna uprostřed testu dělá `resizeAndSettle()` ze `scripts/e2e/_lib.mjs`: po `page.setViewportSize` počká na logo hlavičky pro novou šířku (`<picture>` ho vymění až po načtení) a na ustálené rozložení, jinak by kontrola přetečení chytila přechodný stav hlavičky (na 375 px o 14 px).

Fotky deníku z migrace lokálně (dokud nejsou v Supabase), adresy `http://127.0.0.1:8816/<slug>/<soubor>` povolí `next/image`, čištění HTML i uložení článku v administraci jen při `next dev`:

```bash
python3 -m http.server 8816 --bind 127.0.0.1 --directory ../migrace/storage
```

## Veřejný web

Vzor vzhledu a obsahu je klikací model `../prototyp` (HTML stránek, `css/web.css`, `_PRAVIDLA.md`, `DESIGN.md`). Stránky přebírají jeho HTML struktury, třídy a texty doslova, Honzovy texty včetně pevných mezer. Značky `[doplnit: …]` z modelu se na webu od 14. 10. 2026 neukazují (úprava 7 z auditu): chybějící obsah je skrytý (tip u FA83, galerie Palatky, třetí výlet ve formuláři) a co chybí, je v `../design/audit-2026-10-13/BACKLOG-po-spusteni.md`. Hlídá to e2e test „web bez značek [doplnit]“ (stránky, destinace, zásady, 404, publikované články a zdroje v `src`).

Menu a adresy (rozhodnutí 12. 10. 2026, `src/lib/routes.ts`): Letecké výlety `/letecke-vylety` (přehled), `/letecke-vylety/florida-week` a `/letecke-vylety/grand-tour`; Kam letět `/kam-letet` a `/kam-letet/<slug>`; Z cest `/z-cest` a `/z-cest/<slug>`; Váš mentor `/vas-mentor`; Kontakt `/kontakt` (předvyplnění výletu `?vylet=florida-week|grand-tour`, starší `?balicek=` platí dál). Dál `/` a `/zasady-zpracovani-osobnich-udaju`. Slovo „balíček“ se na webu nepoužívá ani v Honzových nadpisech („Varianty a cena“, „Cena“, „Poptat tento výlet“), popisy, ceny a tabulky zůstávají doslova. Dřívější adresy přesměrovávají (Přesměrování). Adresy v kódu jen přes `ROUTES`, `tripPath()`, `destinationPath()` a `postPath()`.

Styly: `web.css` je kopie z modelu a neupravuje se. Úpravy stránek patří do `src/styles/pages/` (`home.css` úvod, `trips.css` letecké výlety, `destinations.css` Kam letět a okno s detailem, `article.css` články, Váš mentor a zásady, `contact.css` kontakt, `status.css` chybová stránka a 404), layout je načítá po `web.css`. Poslední je `site.css` se společnými styly všech stránek (oblast Globální prvky: mobilní menu na nízkém okně, barva výběru textu a kurzoru, `text-wrap: pretty` pro dd, li, figcaption a td, šířka štítků v seznamu kontaktů, řádek role Honzy `.who-role` u malého portrétu i na úvodu), načítá ho layout `(web)` i `global-not-found.tsx`. Chybová stránka a 404 mají globální třídy, ne CSS modul: CSS modul hraničních souborů (`error.tsx`, `not-found.tsx`) Next přednačítá na každé stránce a prohlížeč pak hlásí „preloaded but not used“. Barvy a písma jen z tokenů.

### Layout a komponenty

Layout `src/app/(web)/layout.tsx` vykreslí symbol šipky, odkaz „Přeskočit na obsah“, hlavičku, `<main id="obsah">` a patičku. Stránka vrací jen obsah `<main>` (záhlaví a sekce), hlavičku ani patičku nevkládá. Odkazy v rámci webu přes `next/link`.

| Komponenta | Props | Použití |
| --- | --- | --- |
| `SiteHeader` | žádné | v layoutu. Logo (SVG v křivkách, 32 px, pod 601 px 24 px přes `<picture>`), menu s `aria-current` podle cesty (`page` na stránce sekce, `true` na detailu), tichá výzva „Poptat termín“, mobilní menu |
| `MobileMenu` | `logo: ReactNode` | jediná klientská komponenta, jen uvnitř `SiteHeader`. Chování z `prototyp/js/web.js`: Escape zavře menu a vrátí fokus na tlačítko, odkaz v menu a šířka nad 960 px ho zavřou, tichá výzva se schová, když je pod hlavičkou vidět `main .fa-dir` nebo `main #poptavka`, na stránkách výletů vede na `/kontakt?vylet=…#poptavka` |
| `SiteFooter` | žádné | v layoutu, texty doslova z modelu. Pod sídlem řádek „Spisová značka C 236725, Městský soud v Praze“ (`FA_COMPANY_FILE_NO`, `FA_COMPANY_COURT`, úprava 7) |
| `PageHead` | `title`, `label?`, `crumbs?`, `perex?`, `perexVoice?`, `children?` | záhlaví podstránky (`.page-head`). Stránka sekce `label` (polohová tabule `SectionSign` nad h1), detail `crumbs`. `perexVoice` = perex Honzova článku v serifu. `children` pod perex (`.dn-by`, `.kt-tel`) |
| `Crumbs` | `href`, `label`, `current` | drobečky s polohovou tabulí (`.crumbs` a `.fa-loc`), samostatně pro záhlaví výletu `.pk-head` |
| `SectionSign` | `children`, `as?` (`"p"` výchozí, `"h2"`, `"span"`), `id?`, `className?` | polohová tabule (vzhled `.fa-loc`) jako označení stránky nebo sekce místo šedého `.lbl`. `p` a `h2` na vlastním řádku s mezerou pod sebou, `span` v řádku. V záběru obrazovky nejvýš jedna polohová tabule (`../prototyp/DESIGN.md`, The One Location Sign Rule), drobečky a patička (FA83) se počítají |
| `CtaSection` | `id?` | výzva „Napište, kdy chcete letět.“ na konci stránky, na úvodu `id="poptat"`, kontakty přes `ContactList` |
| `ContactList` | žádné | seznam kontaktů Telefon, WhatsApp („Napsat zprávu“, `FA_WHATSAPP_HREF`, skrytá část „na WhatsApp“ pro čtečky, bez plovoucí bubliny, úprava 21) a E-mail (`FA_EMAIL`) ve výzvě na konci stránek a v panelu Poptávka u výletu. Štítky ve sloupci 80 px (`site.css`) |
| `Figure` | `photo`, `sizes`, `className?`, `style?`, `caption?`, `credit?`, `priority?`, `alt?`, `blurDataURL?` | fotka s popiskem. Popisek je výchozí alt s pevnými mezerami, `credit` přidá „Foto: archiv FLY America“, `priority` pro první fotku stránky (bez líného načítání, `fetchPriority="high"`) |
| `Photo` | `photo`, `sizes`, `priority?`, `alt?`, `className?`, `style?`, `blurDataURL?` | fotka bez popisku (dlaždice, karty, portrét) |
| `ArrowSymbol`, `Arrow` | žádné | symbol `#arr` (v layoutu) a šipka `<svg><use href="#arr"/></svg>` v odkazech a tabulích |
| `HonzaWho`, `HonzaIntro` | žádné | `HonzaWho` je malý portrét Honzy (`.who`) v panelu Poptávka výletů, na úvodu je místo něj velká fotka Honzy v „Co za vás zařídíme“. Obě místa představují Honzu přes `HonzaIntro` stejně: jméno, pod ním role „Váš mentor v kabině“ (`.who-role` v `site.css`, styl Caption, 15. 10. 2026) a odkaz „Kdo je Honza“ na Váš mentor. Na úvodu je to uvnitř `figcaption` |
| `TripAsk` | `trip` | panel Poptávka vedle tabulky cen výletu (`.pk-ask`, `<section aria-labelledby>`, úprava 38), jediná výzva na obrazovce, „Poptat tento výlet“ vede na `/kontakt?vylet=…#poptavka`, kontakty přes `ContactList` |
| `PilotRequirements` | `className?` | Honzovy požadavky na piloty (`src/data/pilot-requirements.ts`) jako odstavce pod sebou. Na úvodu v Průběhu přípravy (`.req`, obal `.req-text`), u výletů pod přehledem programu (`.pk-req`, obal `.pk-req-text`), nadpis „Požadavky na piloty“ dává stránka |
| `NotFoundContent` | žádné | obsah stránky 404 pro `global-not-found.tsx` i `(web)/not-found.tsx`, aspoň na výšku obrazovky, aby pod patičkou nezůstal světlý pruh. Pod sebou odkazy Na úvodní stránku, Letecké výlety a Kontakt a „Spěcháte? Zavolejte Honzovi: +420 602 214 719“ (úprava 43, třídy `.status-links` a `.kt-tel` ve `status.css`), bez žluté výzvy |

Pomocné moduly: `src/lib/routes.ts` (adresy stránek), `src/components/web/nav.ts` (`NAV_ITEMS`, `inquiryHref(trip?)`, `tripFromPath()`), `src/lib/site.ts` (kontakt, `FA_PHONE_HREF`, `FA_WHATSAPP_HREF` = odkaz wa.me na Honzovo číslo, `FA_REPLY_TIME` = „do 2 dnů“, `SITE_URL`, `SITE_HOST`, `FA_COMPANY_SEAT` = sídlo SKYSHARE s.r.o. od Honzy 13. 10. 2026 s pevnými mezerami, `FA_COMPANY_FILE_NO` a `FA_COMPANY_COURT` = spisová značka C 236725 u Městského soudu v Praze podle ARES 14. 10. 2026; sídlo a spisová značka jsou na Kontaktu, v patičce a v zásadách. `FA_EMAIL` je zároveň místo pro budoucí e-mail na doméně flyamerica.cz, schránka zatím neexistuje), `src/lib/dates.ts` (`formatDate`, `isoDate`, `yearOf`), `src/lib/post-title.ts` (`postDisplayTitle()`: titulek článku bez přípony „ | 2017“ nebo „ | Prosinec 2023“), `src/lib/post-year.ts` (rok cesty, viz Z cest).

Úvod a Váš mentor čtou články z databáze (nejnovější dva články, seznam Honzových přeletů jen z publikovaných). S `DATABASE_URL` při buildu se vygenerují při buildu a obnoví je tag `PUBLIC_POSTS_TAG`, bez něj se vykreslí až při návštěvě. Úvod nemá pod článkem podpis „Honza Čermák“ z modelu: databáze autora nemá a u archivních článků není jistý (Oblet Ameriky je psaný ve třetí osobě).

Váš mentor (`src/app/(web)/vas-mentor/page.tsx`): záhlaví, velká fotka a Honzův text „O mně“ doslova ve čtecím rozložení (`article.css`). Vedle textu je blok „V kostce“ (15. 10. 2026, podnět Radka zvýraznit nálet a kvalifikace): údaje z Honzova textu O mně v poli `MENTOR_FACTS` (celkový nálet přes 6 000 hodin, létá od 1995, profesně od 2010, kvalifikace obchodní pilot, doložky EU i USA, zkušenosti, přelety a dodávky) jako `<aside>` se seznamem `dl`. Hierarchie: nálet a roky velká čísla, kvalifikace zvýrazněná (Overpass 600 18 px), ostatní běžný text. Od 1200 px okrajová poznámka v pravém okraji v řádku s nadpisem O mně, na okně od 840 px výšky přilepená pod hlavičkou, pod 1200 px bílý panel nad textem, na telefonu roky vedle sebe pod jednou linkou přes celou šířku panelu. Blok nahradil skrytý panel „V číslech“. Čísla, která Honza ještě nedodal (V USA létá od, Přelety oceánu, Výpravy s klienty), mají v `MENTOR_FACTS` zakomentované místo (`../design/audit-2026-10-13/BACKLOG-po-spusteni.md`, otázka 10), nic se nedopočítává. Formulace jsou zkrácené naše, ne Honzovy, ke schválení Honzovi. Po přidání údajů přeměřit výšku bloku (práh přilepení v `article.css`). e2e test „Váš mentor: fakta V kostce u textu O mně“.

### Výlety a destinace

Texty výletů a destinací nejsou ve stránkách, ale v datech, ze kterých stránky skládají obsah. Texty jsou doslova z Honzových podkladů (`../podklady-od-Honzy/2026-10-10_balicky-o-mne-destinace.md`, u destinací kromě FA83 novější `2026-10-14_destinace-texty-a-tipy-pro-piloty.md`, požadavky na piloty `2026-10-13_pozadavky-na-piloty-a-sidlo.md`) s běžnými mezerami, pevné mezery doplní při vykreslení `czechNbspText()`. Opravuje se jen pravopis a jen po Radkově rozhodnutí: 14. 10. 2026 překlepy z konce podkladu ze 14. 10. (Orlanda, international, základny, Merritt, Caesar, opustila, u Merritt Islandu „jsme“) a v požadavcích na piloty („zájemce“, „angličtina“). Formulace, čárky a zápis času („1:30 minut“, „0:50 minut“) zůstávají, podklady v `../podklady-od-Honzy` se nemění. Smajlíky z Honzova dokumentu (za „plachetnic“ u Albert Whitted a za „salátem“ u Vero Beach) jsou na webu jako znak 😀.

- `src/data/trips.ts`: `TRIPS` (pořadí na webu), `getTrip(slug)`, `otherTrip(slug)`, `AIRCRAFT` a pomocníci `formatTripSubtitle()` (řádek „9 dní na Floridě • 20 letových hodin“ se láme jen za tečkou), `tripFact(trip, "length" | "hours")` (délka a nálet z přehledu programu, Honza je u výletů pojmenoval různě) a `splitPrice()` (částka v buňce ceny). Výlet: `slug` (`florida-week`, `grand-tour`, i hodnota `?vylet=`), `name`, `subtitle`, `intro` (perex), `teaser` (text karty), `numbers` (`days`, `flightDays`, `freeDays`, `hours`), `overview` (řádky přehledu programu `{ term, text }` bez řádku Letadlo), `price` (`from` ve tvaru „7 400 USD“, `note`), `included` a `variants` (tabulky `{ title, intro?, columns, rows, note? }`, `included` má u obou výletů stejné záhlaví `INCLUDED_COLUMNS` „Položka nebo služba | V ceně? | Co je zahrnuto“ a hodnoty Ano a Ne), `preparation?` (průběh přípravy, jen Florida Week), `destinations` (slugy destinací, které Honza u výletu jmenuje), `description`. Letadlo je u obou výletů stejné a uvádí se jednou a stejně (Radkův bod 3 z 12. 10. 2026): `AIRCRAFT` = „Cessna 182 Skylane“ a Honzův popis z výletu 1, v přehledu programu a ve srovnání výletů jeden řádek Letadlo, na úvodu jednou v popisu sekce výletů. Proto je podtitul Grand Tour bez Honzova posledního údaje „• Cessna 182“. Tabulky cen zůstávají doslova i s letadlem. Výjimky z doslovného znění podle Radkova rozhodnutí 14. 10. 2026 (audit, Honza se o nich dozví při ukázce): úprava 13 = řádek přehledu programu Grand Tour se jmenuje „Náplň programu“ (dřív „Výcvik“), text včetně „příprava na BFR“ doslova; úprava 20 = ceny všude „7 400 USD“ (bez znaku dolaru), stejné záhlaví tabulek, Ano a Ne, „2 piloti (doporučeno)“ u obou výletů; úprava 23 = perex `/letecke-vylety` je složený z Honzových vět `PRICE_INCLUDES` a `PRICE_EXCLUDES` (`PRICE_EXCLUDES` je i poznámka pod tabulkou variant Florida Week a pod kartami na úvodu). `cheapestTrip()` dává částku odkazu v první obrazovce úvodu „Výlety od 7 400 USD za osobu“ (úprava 15, krátká verze bez „při 2 pilotech“, aby se na 375 x 667 vešla na jeden řádek a do první obrazovky). Slugy jsou i v `src/data/trip-slugs.ts`, aby menu v prohlížeči nestahovalo texty výletů.
- `src/app/(web)/letecke-vylety/_data/trip-media.ts`: fotky výletů (`TRIP_MEDIA[slug]`), jen fotky destinací z Honzova textu, ne letadlo. `card` je fotka karty výletu, stejná na úvodu, na přehledu `/letecke-vylety` a v Kam dál (Florida Week zátoka Crystal River ve vlastním výřezu 16 : 9 bez rámu okna a křídla `vylety/florida-z-vysky-crystal-river-07-karta`, úprava 27, Grand Tour silnice na Florida Keys), `slides` posuvná řada (druhá fotka Grand Tour je Cirrus na Key Westu `vylety/destinace-key-west-15`; u fotky uříznuté okrajem řady je popisek jen průhledný, třída `is-cut`, čtečka ho přečte, bez skriptu a na telefonu jsou vidět všechny, úprava 41) v záhlaví výletu (`_components/PhotoRow.tsx` a `TripPhotoRow.tsx`: bez automatického přetáčení, tlačítka Předchozí a Další, tažení, šipky, Home a End, první fotka se načte hned). Srovnání výletů na přehledu je `_components/TripCompare.tsx`, destinace na trase vedle přehledu programu `_components/TripRoute.tsx` (`<section aria-labelledby>`, úprava 38).
- Karta výletu (úvod, `/letecke-vylety`, Kam dál): nadpis i fotka vedou na detail (`_components/TripCardPhoto.tsx`, fotka je odkaz mimo pořadí Tab a skrytý čtečkám, „Detail výletu“ zůstává), najetí zvětší fotku, podtrhne nadpis a posune šipku (úprava 28). Styly karty jsou jednou v `trips.css`, od 601 px mají karty v řadě vyrovnané řádky přes `grid-template-rows: subgrid` (úprava 39).
- Záhlaví výletu: pod výzvou v panelu Cena od textové odkazy „Ceny pro 1 a 2 piloty“ (`#cena`) a „Co zahrnuje cena“ (`#v-cene`), bez další tabule a bez žluté (úprava 14). Tabulky cen na telefonu bez popisku sloupce z `data-label` u třetí buňky (úprava 24).
- Úvod: výřez úvodní fotky na telefonu posunutý doprava (`object-position: 88% 55%`, úprava 27), kontrast textu na fotce změřený 14. 10. 2026 aspoň 5,8 : 1 v nejhorší desetině plochy. Telefon stahuje úvodní fotku nejvýš 1920 px širokou (úprava 32). Kam letět je pod 601 px seznam s náhledem 112 px bez Honzova výňatku (`home.css`, `TIP_SIZES`, úpravy 12 a R12), od 601 px dlaždice vyrovnané v řadě.
- `src/data/destinations.ts`: `DESTINATIONS` v pořadí podkladu, `getDestination(slug)`, `HOME_BASE_CODE`. Destinace: `slug` (`fa83`, `cedar-key`, `albert-whitted`, `vero-beach`, `palatka`, `kissimmee`, `merritt-island`, `key-west-everglades`), `code` (přesně jak píše Honza: Palatka 28J podle jeho opravy ze 14. 10. 2026, dřív KFLZ, Key West EYW), `name`, `shortName`, `home?` (FA83), `highlights` (Zajímavosti), `whyHeading` a `why` (Proč je dobré tam letět po odstavcích, Merritt Island má dva, u FA83 „odtud létat“), `pilotTip?` (Honzův „Tip pro piloty“: kudy a jak dlouho se letí z Orlanda, u sedmi destinací kromě FA83), `teaser` (výňatek do dlaždice a popis stránky detailu), `todo?` (interní poznámka, co ještě chybí od Honzy: FA83 vzdálenost a tip, Palatka fotky, Kissimmee další fotka; na webu se od 14. 10. 2026 neukazuje, úprava 7, seznam v `../design/audit-2026-10-13/BACKLOG-po-spusteni.md`), `tile` (fotka dlaždice 4 : 3, letiště z výšky nebo letadlo na stojánce, ne pláž, úprava 9: Key West `everglades-airpark`, Vero Beach `kam-letet/letadla-vero-beach-07`, Merritt Island `kam-letet/destinace-cape-canaveral-13`, na úvodu stejné; pláž je jen v galerii Key West), `gallery`, `galleryColumns`. Detail destinace (stránka i okno, `kam-letet/_components/DestinationBody.tsx`) ukazuje pod textem tip jako krátký blok „Tip pro piloty“ (štítek verzálkami, Honzův text v serifu o stupeň menší, vlasová linka nad ním, bez plochy a bez polohové tabule, `.kl-tip` v `destinations.css`), pod ním řádek s výlety a odkazem Poptat termín (`DestinationTrips`, `.kl-trips`, úprava 11): výlety podle pole `destinations` v `trips.ts` s odkazy `tripPath()`, u FA83 „Domovská základna obou výletů:“ s oběma výlety. Vero Beach, Palatka, Kissimmee a Merritt Island mají zatím jen Poptat termín (čeká na Honzu). Poptat termín je textový odkaz `.fa-link` na `inquiryHref()`, u destinace jen jednoho výletu (Key West) s předvyplněným výletem, bez žluté výzvy a bez tabule. FA83 bez tipu a Palatku bez galerie nic nenahrazuje. Mezititulky (Zajímavosti, Proč…, Tip pro piloty) jsou na celé stránce h2, v okně h3, vzhled je stejný (úprava 35). Na úvodu jsou dlaždice čtyř destinací napsané přímo ve stránce (`page.tsx`, výňatky ze Zajímavostí nebo Proč), po změně Honzových textů je upravit i tam. Archivní fotka Palatky má v popisku kód K28J (jiný zápis než Honzův 28J), proto zůstává jen jako dlaždice bez viditelného popisku. Dlaždice na rozcestníku Kam letět mají od 601 px v řadě vyrovnanou fotku, nadpis, trasu a výňatek (`grid-template-rows: subgrid` na `.kl-tiles`, úprava 39): mřížka je bez mezery mezi řádky (jinak by se mezera dostala dovnitř dlaždice), mezi řadami je horní okraj dlaždic od druhé řady (40 px do 1100 px, 56 px od 1101 px), při změně počtu sloupců upravit `nth-child`.
- `/letecke-vylety/[slug]` a `/kam-letet/[slug]` mají `dynamicParams = false`: jiný slug než z dat je 404.
- Detail destinace v okně (rozhodnutí 12. 10. 2026): proklik na `/kam-letet/<slug>` z kterékoli stránky webu (dlaždice na rozcestníku, na úvodu, destinace na trase výletu) zachytí slot `@modal` (`src/app/(web)/@modal/(.)kam-letet`, layout ho dostává jako `modal`, `default.tsx` vrací nic) a detail se otevře v okně nad stránkou. Rám okna je `layout.tsx` zachycené cesty (`kam-letet/_components/DestinationDialog.tsx`: nativní `<dialog>` přes `showModal()`, fokus na nadpis a po zavření zpět na dlaždici, Zavřít, Escape, klik mimo okno i Zpět v prohlížeči přes `router.back()`, Předchozí a Další i šipkami přes `router.replace()` bez nových záznamů v historii, zamknutý posun stránky pod oknem), obsah `[slug]/page.tsx`. Okno se ukáže jen na adrese známé destinace. Přímá adresa, nové načtení, sdílený odkaz a prohlížeč bez JavaScriptu dostanou celou stránku `kam-letet/[slug]/page.tsx`, její Předchozí a Další jsou obyčejné odkazy (`next/link` by otevřel okno nad celou stránkou). Dřívější kotvy `/kam-letet#cedar-key` (i přes přesměrování `/tipy-na-vylety#cedar-key`) otevře `LegacyAnchorRedirect.tsx`: kotvu smaže přes `replaceState` se zachovaným stavem historie Nextu (bez něj by Next po `router.back()` okno nezavřel) a detail otevře v okně. Odkazy na výlet a Poptat termín v okně jsou `next/link`: cílová stránka se otevře měkkou navigací, okno se samo zavře a odemkne posun stránky, Zpět v prohlížeči vrátí okno nad původní stránku. e2e testy „Kam letět: detail destinace v okně“ a „Kam letět: bez značek [doplnit], výlety a poptávka, mezititulky a dlaždice“.

### Fotky

`public/img` má od každé fotky použité v modelu jen největší variantu (název bez velikosti, `img/cedar-key-letecky-800.jpg` v modelu = `/img/cedar-key-letecky.jpg`), menší velikosti a AVIF/WebP dělá `next/image`. `src/data/photos.ts` je převedený `prototyp/img/_seznam.tsv` (`MODEL_PHOTOS`): klíč je název bez přípony, hodnota `{ src, width, height, alt, caption? }`. `alt` je popisek z archivu doslova, viditelný popisek je `caption`, chybí-li, stejný text jako `alt`, s pevnými mezerami (výjimky jsou v komentáři `photos-destinations.ts`). Dvě zásady pro výběr fotek (R8 z auditu) jsou v `../prototyp/DESIGN.md`, Fotka s popiskem: kus letadla (vzpěra, rám okna) se z fotky z kabiny nevyřezává napůl a destinaci ukazuje letecký pohled na letiště nebo letadlo na stojánce, pláž, město a příroda jsou jen v galerii detailu.

Fotky z fotobanky (`../fotobanka/fotobanka.json`) jsou po oblastech webu v samostatných souborech, aby úpravy různých stránek nekolidovaly: `src/data/photos-home.ts` (úvod, složka `uvod`), `photos-trips.ts` (letecké výlety, `vylety`), `photos-destinations.ts` (Kam letět, `kam-letet`), `photos-article.ts` (články, `z-cest`). `photos.ts` je sloučí (`mergePhotoSets()`, stejný klíč dvakrát skončí chybou při buildu i v `next dev`) a `Figure`/`Photo` je berou podle klíče jako fotky z modelu. Přidání fotky:

1. Ve fotobance vybrat fotku (`kvalita`, `osoby`: nikdy „ano, souhlas nutný“) a z `varianty` největší potřebnou JPG (obvykle 1600, přes celou šířku 2400).
2. Zkopírovat ji do `public/img/<složka>/<id>.jpg` (id z fotobanky, bez velikosti), např. `public/img/vylety/destinace-key-west-01.jpg`.
3. Do `photos-<oblast>.ts` přidat `"<složka>/<id>": { src: "/img/<složka>/<id>.jpg", width, height, alt, caption }`: rozměry souboru z `varianty`, `alt` z pole `alt`, `caption` z pole `popisek`.
4. Ve stránce `<Figure photo="vylety/destinace-key-west-01" sizes="…" />` (s popiskem) nebo `<Photo … />` (bez popisku). `sizes` se přebírá z HTML modelu, pro velkou fotku podstránky je `PAGE_PHOTO_SIZES`. Šířky obrázků (`deviceSizes`, `imageSizes`) jsou v `next.config.ts` podle modelu. Úvodní fotka s jinými variantami pro mobil (`<picture>` v modelu) jde přes `getImageProps()`.

### Metadata

Každá stránka skládá metadata přes `pageMetadata({ title, description, path, absoluteTitle?, ogImage?, article? })` ze `src/lib/metadata.ts`: titulek „Název - FLY America“, stejný `og:title` a `og:description`, canonical a `og:url` s adresou stránky, náhled odkazu 1200 x 630 (`/og/og-image.jpg`, u článků `ogImage: "photo"` = `/og/og-image-foto.jpg`) a `twitter:card` `summary_large_image`. Next slučuje metadata jen do první úrovně, stránka s vlastním `openGraph` by jinak přišla o obrázek z layoutu. Adresy doplní `metadataBase` = `SITE_URL`.

### Písma

Všechna tři písma jsou soubory z modelu (`src/fonts`, WOFF2 jen se znaky latin a latin-ext) přes `next/font/local` (`src/lib/fonts.ts`), nic se nestahuje z Google Fonts. Soubory latin-ext u Source Serif 4, jeho kurzívy a Overpass Mono mají od 14. 10. 2026 jen českou a slovenskou diakritiku mimo latin (Č Ď Ě Ĺ Ľ Ň Ŕ Ř Š Ť Ů Ž a malá písmena, úprava 32 z auditu): serif 40 332 → 8 256 B, kurzíva 43 912 → 8 980 B, Overpass Mono 32 576 → 4 164 B, úvod stáhne o 67 kB písem méně (na Slow 4G se písma načetla asi o 0,4-0,7 s dřív, měřeno 14. 10. 2026 na dev serveru). Tvary písmen jsou stejné, Overpass a soubory latin se nemění. Vyrábí je `python3 ../prototyp/_nastroje/pisma.py web` (stejné volby subsetteru jako pro model), který vypíše i `unicode-range` k ručnímu přepsání do `src/lib/fonts.ts`. Znak mimo sadu (třeba polské ł) by nakreslilo náhradní písmo: po textu s novým znakem z latin-ext skript spustit znovu. Overpass je jediné přednačtené písmo. Overpass Mono a Source Serif 4 mají latin a latin-ext v samostatných souborech, každá podmnožina je vlastní rodina s `unicode-range` a v CSS jdou za sebou. `src/styles/fonts.css` je dosadí do aliasů `--f-sans`, `--f-mono` a `--f-serif` z `web.css`.

Náhradní písma (`adjustFontFallback`) next/font negeneruje, používají se ruční z modelu (`web.css`, část 1): `Overpass Fallback` z Arialu zvlášť pro váhy 400, 600 a 700, `Source Serif Fallback` z Georgie (na mobilu `Source Serif Fallback 18`) a `Overpass Mono Fallback` z Courier New. Porovnání 11. 10. 2026 na 9 stránkách modelu v Chrome (výška stránky bez webových písem proti výšce s nimi): s ručními náhradními písmy rozdíl 0-66 px na 1440 px a 0-60 px na 375 px, s `adjustFontFallback` (Arial a Times New Roman, jedno náhradní písmo na rodinu) až 103 px na 1440 px a až 340 px na 375 px. Android Arial, Georgii ani Courier New nemá, tam text po načtení písma poskočit může (ověřit na telefonu, `_PRAVIDLA.md`, část 4).

### Pevné mezery a uvozovky

`czechNbsp(html)` a `czechNbspText(text)` ze `src/lib/typography.ts` doplní pevné mezery podle pravidla R4 z `prototyp/_PRAVIDLA.md`: za jednopísmennými předložkami a spojkami, mezi číslem a jednotkou nebo počítaným slovem, v tisících a telefonu, u dat a v celcích (Key West, St. Augustine, Cessna 182), s výjimkou pro označení za slovem (bodu A, Saturn V). Mění jen druh mezery a jen v textu, nikdy v atributech a značkách. Před samostatným „-“ a „/“ mezi slovy je pevná mezera, takže jimi řádek nezačne, a kolem „&“ v názvech Florida Week & Fly a Florida Grand Tour & Fly jsou pevné mezery i tehdy, když je „&“ v HTML zapsané jako `&amp;` (úprava 29). Spojovník ve slově, lomítko bez mezer a „->“ se nemění. Rozsah čísel („3-3,5 hodiny“, „6-8 týdnů“) a archivní šipka „->“ se za spojovníkem nezalomí (`tieText()`: neviditelný znak WORD JOINER U+2060, spojovník zůstává obyčejný „-“, data v databázi beze změny). Text článků z databáze se prožene `czechNbsp()` při vykreslení, perexy, titulky a popisky fotek `czechNbspText()`, texty výletů a destinací z `src/data` také. Statické texty stránek mají pevné mezery rovnou z modelu (`&nbsp;` v JSX). Kromě odstavců (`web.css`) se `text-wrap: pretty` zalamují i dd, li, figcaption a td (`site.css`), aby řádek nekončil jedním krátkým slovem.

Obě funkce zároveň převádějí rovné dvojité uvozovky na české (`czechQuotesText()`, rozhodnutí 12. 10. 2026): data v databázi zůstávají beze změny, „…“ je jen při zobrazení. Páruje se v rámci bloku (odstavec, položka, nadpis, popisek), i přes řádkové značky. Horní uvozovka “ na začátku slova je chybně sázená otevírací a zobrazí se jako „ (články 2010, 2018, 2019 a 2022 mají „“latentní““). Rovná uvozovka po české „ ji zavře (článek 2025 má „shutdownu"), rovná před českou “ ji otevře, ostatní rovné se střídají „ a “ jen při sudém počtu v bloku, lichý počet nechá blok beze změny. Nikdy v atributech, v `<code>`, `<pre>` a podobných značkách ani v adrese URL v textu. Entita `&quot;` v textu se převádí také. Smajlíky (😀 v textech destinací, 🙂 na konci článku 2025) zůstávají beze změny, pevná mezera před nimi se nevkládá. Test: `node scripts/test-typography.mjs`.

### Z cest (články)

Sekce Z cest je dřívější Deník (adresy `/denik` a `/denik/<slug>` přesměrovávají). V kódu a v databázi se články dál jmenují `posts`, bucket fotek `denik`.

`src/lib/public-posts.ts` (jen na serveru): `getPublishedPosts()`, `getLatestPublishedPosts(n)`, `getPublishedPostBySlug(slug)`, `getAdjacentPosts(slug)` (`{ newer, older }`) a `getPublishedSlugs()` pro `generateStaticParams`. Jen články se stavem `published`, nejnovější první. Souhrn článku nese i `tripYear` (sloupec `trip_year`, migrace 0002). Výsledky jsou v cache Next.js (`unstable_cache`) s tagem `PUBLIC_POSTS_TAG`. Po každé změně článku ho administrace zneplatní přes `revalidatePublicPosts()` (`src/lib/posts-cache.ts`, `revalidateTag` s `expire: 0` a obnova cest `/`, `/z-cest`, `/vas-mentor`, `/z-cest/[slug]`), takže Honza po uložení hned vidí novou verzi. Bez `DATABASE_URL` se stránka s články při buildu nevygeneruje (`connection()`) a `getPublishedSlugs()` vrátí prázdné pole. `content` je HTML vyčištěné při uložení, galerie zastupuje značka `<p data-gallery="ID"></p>`, fotka galerie má volitelné `alt` (`GalleryItem` v `src/lib/db/schema.ts`), chybí-li, platí `caption`.

Stránky `src/app/(web)/z-cest/` podle `prototyp/denik.html` a šablon článků:

- `/z-cest`: nejnovější článek velkým blokem (`.diary.dn-lead`), ostatní jako karty `.dn-post`, každá karta je celá odkaz (`.dn-post-link`). Titulek přes `postDisplayTitle()` (`src/lib/post-title.ts`, bez přípony „ | 2016“).
- Rok cesty (úprava 33, `src/lib/post-year.ts`): kde je jen rok (blok článku `DiaryTeaser` na úvodu a pod článkem, „Novější článek“, přelety na Váš mentor), ukazuje `postYear()`: Rok cesty z administrace, jinak rok ze štítku titulku, jinak rok publikace. Kde je celé datum (karty na `/z-cest`, záhlaví článku), ukazuje `postDateLabel()` datum publikace a při jiném roce cesty s předponou „vydáno“ („vydáno 19. 11. 2023“ u článku 2022). Strojové datum (`<time dateTime>`) je všude datum publikace.
- Článek bez titulní fotky (úprava 6, článek 2025): blok článku s třídou `teaser--text` je jeden sloupec textu (ne levý sloupec vedle prázdného místa), záhlaví článku bez fotky navazuje na text třídou `read-next` (bez druhé svislé mezery sekce).
- `/z-cest/[slug]`: záhlaví ve sloupci textu (tabule Z cest v drobečcích, nadpis, perex v serifu, datum), titulní fotka (`.page-photo`, popisek z popisu fotky a „Foto: archiv FLY America“), obsah „V článku“, text v `.prose`, galerie, video, na konci předchozí (starší) článek velkým blokem (celý blok je odkaz) a odkaz na novější, výzva. Rozložení čtecích stránek (článek, Váš mentor, zásady; `src/styles/pages/article.css`, rozhodnutí 12. 10. 2026): text ve sloupci 680 px na středu, fotky na šířku od 1000 px a galerie v textu širší než text, popisky zarovnané se sloupcem. Od 1200 px je „V článku“ přilepené v levém okraji a široké fotky článku s obsahem jdou jen doprava (916 px), aby obsah nezakryly. Polohová tabule „Fotky“ nad galerií na konci jen u textu delšího než 2 500 znaků (jinak by byla v jednom záběru s tabulí v drobečcích). Neexistující adresa i koncept vrací 404. `generateMetadata`: `<title>` z krátkého názvu (část před dvojtečkou), popis u článků s vlastní stránkou v modelu (2017, 2025) doslova z modelu (`modelDescription()` v `src/lib/post-display.ts`), jinak z perexu (celé věty do 160 znaků, když by celé věty daly méně než 90 znaků, zkrácený na slova s „…“). Náhled odkazu je u všech článků `og-image-foto.jpg` 1200 x 630 (`_PRAVIDLA.md`, část 7), titulní fotky 4 : 3 by Facebook a WhatsApp ořízly.
- Text článku (`prepareArticleBody()` v `src/lib/post-content.ts`): HTML z databáze znovu projde `sanitizePostHtml()` a `czechNbsp()`, rozloží se na strom a stránka ho skládá z Reactu (`_components/ArticleContent.tsx`), bez `dangerouslySetInnerHTML`. Fotka v textu je `<figure class="fig">`, popisek je následující odstavec jen s `<em>` (tak ukládá popisky import). Fotka jde přes `next/image`, jen když má rozměry a adresa je z bucketu `denik` (`canOptimizeImage()` v `src/lib/image-hosts.ts`, stejná pravidla jako `images.remotePatterns`), jinak `<img loading="lazy">`. `[doplnit: …]` v textu se ukáže jako `.todo` (žlutý rámeček), proto ho publikovaný článek mít nesmí: administrace publikaci se značkou zablokuje (`todoMarkErrors()` v `src/lib/post-form.ts`), koncept s ní uložit jde. Dlouhé adresy v textu se zalomí kdekoli (`.prose` a odkazy v ní, úprava 34), stránka na 320 px nepřetéká.
- Video z YouTube (iframe z editoru i pole „Video z YouTube“, rozhodnutí 12. 10. 2026): náhled s tlačítkem „Přehrát video“, přehrávač `youtube-nocookie.com` (s `autoplay`, fokus do přehrávače) se načte až po kliknutí (`_components/ArticleVideo.tsx` na serveru a `YouTubeVideo.tsx` v prohlížeči). Náhled stahuje náš server přes `next/image` (`images.remotePatterns`: `i.ytimg.com/vi/**`), prohlížeč návštěvníka se před kliknutím na Google neptá. Velikost náhledu vybere server (`src/lib/youtube-thumbnail.ts`, požadavek HEAD v cache Next.js): `maxresdefault` 1280 x 720, když ho video má, jinak `sddefault`, nakonec `hqdefault`. Pod náhledem je vždy odkaz „Video na YouTube“ (`https://youtu.be/ID`), bez JavaScriptu vede na YouTube i náhled. Video uvnitř odstavce nebo nadpisu zůstává jen odkazem (`_components/VideoLink.tsx`). Adresa, ze které nejde vyčíst id videa, se nevykreslí. Zásady zmiňují, že se přehrávač načte až po kliknutí.
- Podtitul: když text začíná nadpisem, za kterým hned následuje odstavec, a jiný nadpis stejné úrovně v článku není (článek 2017 Druhý přelet Atlantiku), nadpis se z textu vyjme a je v záhlaví místo perexu jako v modelu. První odstavec pak zůstává celý a kapitoly v h3 se vykreslí jako h2.
- Perex bývá doslova začátek prvního odstavce. Ten začátek se v textu vynechá, aby se pod záhlavím neopakoval (jako model článku 2025): jen při přesné shodě (liší se nejvýš mezery a uvozovky), v prvním odstavci, před kterým smí být jen nadpis nebo krátký tučný mezititulek. Odstavec pod nadpisem se celý nevynechá. Článek s podtitulem perex v textu nevynechává.
- Obsah „V článku“ je z nadpisů h2 (když jsou méně než dva, z h3), nadpisy dostanou id z textu. Od 1200 px rozbalený a přilepený v levém okraji vedle sloupce textu, obsah vyšší než obrazovka (Oblet Ameriky, 17 dní) se posouvá sám, pod 1200 px sbalený nad textem (`_components/ArticleToc.tsx`, nález 19: souhrn na počítači skrytý před čtečkou). `<details>` je v HTML ze serveru zavřený a skript ho otevře až od 1200 px, takže na tabletu text neposkočí (úprava 37). Od 1200 px je obsah v okraji vidět hned i před spuštěním skriptu (`::details-content` v `article.css`), prohlížeč, který to neumí, ho ukáže až po otevření skriptem.
- Galerie: značku `<p data-gallery="ID"></p>` nahradí mřížka `.gallery.gallery--nahledy` (`_components/PostGalleryGrid.tsx`): náhledy 4 : 3 bez popisků ve 4 sloupcích s mezerou 24 px, pod 961 px ve 3 a pod 601 px ve 2 s mezerou 16 px (úprava 12, rozhodnutí R7, výjimka zapsaná v `DESIGN.md`, Mřížky). `sizes` odpovídá sloupcům. Popisek je doslova v okně zvětšení a v `alt` (`item.alt`, jinak popisek), fotka bez obojího má odkaz se jménem „Fotka N“. Článek 2017 má na telefonu 375 px místo 34 549 px 20 575 px, Oblet Ameriky místo 55 065 px 18 079 px. Galerie destinací, řada fotek výletu a galerie na Váš mentor mají popisky dál. Galerie za posledním odstavcem článku jsou ve vlastní sekci „Fotky z cesty“ přes celou šířku (`#fotky`, odkaz z obsahu článku), kromě galerie hned pod nadpisem (Oblet Ameriky: galerie u každého dne). Neznámé id se nevykreslí.
- Zvětšení fotky (`_components/GalleryLightbox.tsx`, model ho nemá): nativní `<dialog>` přes celou obrazovku v Grafitu, šipky a přejetí prstem listují, Escape a klik mimo fotku (i na tmavý okraj vedle fotky) zavřou, fokus se vrátí na fotku v mřížce. Bez JavaScriptu odkaz otevře samotnou fotku. Fotka se nezvětší nad svou velikost.
- Styly, které `web.css` nemá (zvětšení fotky, galerie v textu, posuvný obsah článku), jsou v `src/app/(web)/z-cest/z-cest.module.css`.
- Hierarchie nadpisů (úprava 40, `DESIGN.md` Hierarchy): vedlejší h2 sekcí (Fotky z cesty v článku, Z cest a přeletů a Přelety popsané Honzou na Váš mentor) mají třídu `.headline-md` (34 px, na telefonu 27 px). „O mně“ na Váš mentor je hlavní text stránky a stojí v `.prose` (nadpisy v textu 28 px), proto má třídu `.headline` s velikostí h2 sekcí (44 px, na telefonu 31 px): hlavní text nesmí mít nejmenší nadpis.

Mapa webu `src/app/sitemap.ts` (stránky webu včetně detailů výletů a destinací z dat a publikované články, seznam stránek je v souboru).

### Indexace

`src/app/robots.ts`, `ALLOW_INDEXING` v `src/lib/site.ts`, proměnná `NEXT_PUBLIC_ALLOW_INDEXING`. Výchozí je indexace vypnutá, dokud web neběží na hlavní doméně, aby se do vyhledávačů nedostala adresa `flyamerica.vercel.app` ani rozpracované texty. Vypnutá znamená `robots.txt` s `Disallow: /` pro všechny roboty (bez odkazu na mapu webu), `robots: noindex, nofollow` v metadatech kořenového layoutu webu a stránky 404 (`SITE_ROBOTS` v `src/lib/metadata.ts`, stránky ho dědí) a hlavičku `X-Robots-Tag: noindex` u všech odpovědí včetně obrázků (`next.config.ts`). S `NEXT_PUBLIC_ALLOW_INDEXING=true` je to jako dřív: `Allow: /`, `Disallow: /admin` a `/api/`, odkaz na mapu webu, žádné meta robots ani hlavička. Administrace má `noindex, nofollow` vždy. e2e test „indexace: výchozí nastavení je noindex“ počítá se serverem bez proměnné.

### Přesměrování

`next.config.ts` načte `src/data/redirects.json` (pole ve tvaru `redirects` z next.config: `source`, `destination`, `permanent: true`, u starých adres `/?p=ID` i `has`) při buildu. Je to převod `../migrace/redirects.vercel.json` (311 pravidel, pořadí zachované, první shoda vyhrává): staré články `/<slug>/` na `/z-cest/<slug>`, archivy a štítky na `/z-cest`, `/instruktor/` na `/vas-mentor`, `/naklady/` na `/letecke-vylety`, `/validace/` na `/#postup` (kotva sekce Jak to probíhá na úvodu musí zůstat), fotky a galerie ze starého webu na článek. Cíle jsou od 12. 10. 2026 na nových adresách (dřív `/denik/<slug>`, `/o-honzovi`, `/tipy-na-vylety`, `/balicek-florida-week`, `/#balicky`), aby stará adresa měla dál jen jedno přesměrování. Na konci souboru jsou trvalá přesměrování dočasných adres nového webu (do 12. 10. 2026 nasazených na flyamerica.vercel.app): `/balicek-florida-week` a `/balicek-grand-tour` na `/letecke-vylety/…`, `/tipy-na-vylety` na `/kam-letet`, `/denik` a `/denik/:slug` na `/z-cest`, `/o-honzovi` na `/vas-mentor`. `permanent: true` je v Next.js kód 308, pro vyhledávače rovnocenný s 301. Kontrola 12. 10. 2026 (`scripts/test-redirects.mjs`): žádné pravidlo nezachytí stránku nového webu (stránky, `/z-cest/<slug>`, `/kam-letet/<slug>`, `/letecke-vylety/<slug>`, `/admin`, `/api`, `/img`, `/og`, `/_next`), všechny cíle existují a žádný se dál nepřesměrovává. Po přidání stránky s adresou v kořeni zkontrolovat, že ji žádné pravidlo nepřebije (`grep '"source":"/nazev' src/data/redirects.json`).

Staré adresy většinou končí lomítkem (`/oblet-ameriky-2016/`). Next by lomítko nejdřív odstranil (308) a teprve pak použil pravidlo (druhé 308), proto je výchozí odstraňování lomítka vypnuté (`skipTrailingSlashRedirect`) a `withTrailingSlash()` v `next.config.ts` přidá ke každému pravidlu variantu s lomítkem na konci (Next porovnává zdroj přesně). Poslední pravidlo `/:path+/` nahrazuje výchozí chování: jiná adresa s lomítkem na konci (`/kontakt/`, `/z-cest/<slug>/`) jde jedním 308 na adresu bez lomítka. Každá stará adresa tak má nejvýš jedno přesměrování. Test proti běžícímu serveru: `node scripts/test-redirects.mjs` (všechna pravidla s lomítkem i bez, s `../migrace/redirects.csv` i všechny adresy starého webu, cíle vrací 200; cíle z CSV z doby migrace test převede na nové adresy, `RENAMED` v testu).

Bezpečnostní hlavičky všech odpovědí (`headers()` v `next.config.ts`): `X-Frame-Options: DENY` a `Content-Security-Policy: frame-ancestors 'none'` (web nejde vložit do rámu na cizím webu), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` bez kamery, mikrofonu a polohy. `X-Powered-By` se neposílá (`poweredByHeader: false`). Plná CSP s nonce pro skripty zatím není, HSTS doplní Vercel.

Cache statických souborů (`STATIC_FILE_SOURCES` v `next.config.ts`): `/img/*`, `/logo/*`, `/og/*`, `/fonts/*` a ikony (`/favicon.ico`, `/icon.png`, `/apple-icon.png`) mají `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`. Soubory nemají v názvu otisk obsahu, proto ne rok a `immutable`: vyměněná fotka se stejným názvem se projeví nejpozději za den. `/_next/static` (s otiskem) má rok a `immutable` od Next, to nejde přepsat. Písma webu jdou přes `next/font` z `/_next/static/media`, pravidlo pro `/fonts/*` je pro soubory v `public/fonts`.

## Poptávky

Stránka Kontakt má dva formuláře: poptávku „Poptat termín" na tři kroky a krátké „Nechte číslo, Honza zavolá". Oba ukládají do tabulky `inquiries` (sloupec `kind`) přes server actions `submitInquiry` a `submitCallback` v `src/app/(web)/kontakt/actions.ts`. Jsou veřejné, proto bez `requireAdmin()`.

- Pole, volby a chybové hlášky jsou z klikacího modelu: `src/lib/inquiries/options.ts` (volby), `fields.ts` (pole po krocích, hlášky, délky, stav formuláře a rychlá kontrola polí bez zod pro prohlížeč) a `schema.ts` (zod schéma pro server). Pole mají anglické názvy podle sloupců tabulky, formulář v prototypu má české. Licence: PPL, CPL/ATPL, Ultralight, Jiná, Nemám. Po volbě Ultralight nebo Nemám je pod volbami nápověda: Honzův třetí odstavec z požadavků na piloty (`PILOT_REQUIREMENTS_NO_LICENCE` v `src/data/pilot-requirements.ts`), oblast s `aria-live`, bez skriptu až po návratu ze serveru. Test `scripts/test-inquiry-action.mjs` hlídá, že prohlížeč i server hlásí totéž (prohlížeč jen u e-mailu volněji).
- Stránka `src/app/(web)/kontakt/`: `page.tsx` (záhlaví, boční sloupec, token, předvyplnění výletu z `?vylet=`, starší odkazy s `?balicek=` fungují dál, popisky voleb výletu s délkou a cenou), `InquiryForm.tsx` (poptávka na tři kroky, chování z `prototyp/js/kontakt.js`), `CallbackForm.tsx` („Nechte číslo, Honza zavolá“). Obě komponenty odesílají přes `useActionState`, v prohlížeči jen řídí kroky, kontrolují pole před pokračováním a hlídají fokus. Se skriptem odesílá `onSubmit` přes `withSendFallback()` (`form-helpers.tsx`): když server action selže výjimkou (výpadek sítě, chyba serveru, chybová stránka místo odpovědi), formulář zůstane vyplněný a ukáže hlášku „Poptávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte Honzovi: +420 602 214 719.“ (u Zavolejte mi „Číslo se nepodařilo odeslat…“, úprava 30) místo chybové stránky. Limit žádostí u Nechte číslo má vlastní hlášku „Z vaší adresy přišlo za poslední hodinu víc žádostí. Zkuste to prosím později, nebo zavolejte Honzovi: +420 602 214 719.“ (telefon vždy z `FA_PHONE`). Bez skriptu odesílá formulář prohlížeč rovnou server action přes `<form action>` jako dřív. Kroky jsou skryté už v HTML ze serveru, bez JavaScriptu je `<noscript>` styl ukáže všechny pod sebou a kontroluje jen server. Po odeslání potvrzení se shrnutím a odkaz „Poslat další poptávku“ (prázdný formulář).
- Volby výletu v kroku 2 (úprava 8): popisky skládá `page.tsx` ze `src/data/trips.ts` (název, `numbers.days`, `price.from`) přes `czechNbspText` ve tvaru „Florida Week & Fly - 6 dní, od 7 400 USD za osobu“ a posílá je do `InquiryForm` jako `packageLabels`, prohlížeč texty výletů nestahuje. Shrnutí po odeslání, e-maily a administrace mají dál `PACKAGES.formLabel` a název výletu. Odkaz Porovnat výlety a nápověda pod volbami ve formuláři nejsou. Volba třetího výletu se neukazuje (úprava 7, čeká na Honzu). Nápověda k termínu: „Stačí měsíc nebo rozmezí. Když ještě nevíte, napište to.“ (úprava 17, zbytek čeká na Honzu).
- Rozepsaný formulář (úprava 8): poptávka (hodnoty polí a krok) a Nechte číslo (jméno, telefon) jsou v sessionStorage karty pod klíči `fa-poptavka` a `fa-zavolam` (`DRAFT_KEYS`, `readDraft`, `writeDraft`, `clearDraft` ve `form-helpers.tsx`), bez tokenu a pasti na roboty, čtení i zápis v try/catch, nic se neposílá na server. Obnoví se až po hydrataci (`useLayoutEffect`), výlet z `?vylet=` a stav ze serveru bez skriptu mají přednost. Smaže se po odeslání a po „Poslat další poptávku“.
- Odesílání (úprava 8): tlačítko ukáže „Odesílám…“ a dostane `aria-disabled` (ne `disabled`, fokus zůstane na něm), formulář `aria-busy`. Čtečce to ohlásí oblast `aria-live="polite"` (`SendingStatus`) za formulářem, ne v něm, kvůli `aria-busy`. Druhé odeslání během běhu formulář zahodí. Obnovený formulář jde odeslat hned po načtení stránky, server by ale odeslání do 3 s od vykreslení odmítl jako robota: formulář se skriptem proto odeslání o zbytek doby pozdrží (`rememberTokenShown`, `waitForMinFill` ve `form-helpers.tsx`, `MIN_FILL_MS` je ve `fields.ts` sdílený se serverem), tlačítko mezitím ukazuje „Odesílám…“.
- Lhůta odpovědi (úprava 16): `FA_REPLY_TIME` („do 2 dnů“) je v potvrzení poptávky na webu, v potvrzovacím e-mailu (HTML i text, `inquiryConfirmationEmail()` v `src/lib/email.ts`, test v `scripts/test-inquiry-action.mjs`) a v potvrzení Nechte číslo („Děkujeme, Honza vám zavolá do 2 dnů.“). Úvod bloku Nechte číslo je „Stačí jméno a telefon.“
- Sloupec kontaktů na Kontaktu je `<section aria-labelledby="kontakt-nadpis">` (úprava 38) s řádkem WhatsApp („Napsat zprávu“, `FA_WHATSAPP_HREF`) mezi Telefonem a E-mailem a pod Sídlem řádkem Spisová značka (`FA_COMPANY_FILE_NO`, `FA_COMPANY_COURT`). Dlouhý e-mail v potvrzení se zalomí (`.kt-done dd, .kt-done strong { overflow-wrap: anywhere }` v `contact.css`, úprava 34).
- Zásady zpracování osobních údajů `/zasady-zpracovani-osobnich-udaju` jsou zatím návrh k odsouhlasení (Radek, Honza), od 14. 10. 2026 bez značek `[doplnit]` (úprava 7): správce se sídlem z `FA_COMPANY_SEAT` a spisovou značkou z `FA_COMPANY_FILE_NO` a `FA_COMPANY_COURT` (`src/lib/site.ts`, ověřeno v ARES), doba uchování obecně („Údaje z poptávek uchováváme po dobu nezbytnou k vyřízení poptávky.“, věta o otisku IP s lhůtou `TRACE_RETENTION_DAYS` zůstává), poskytovatelé Vercel (hosting webu, funkce v EU, region Dublin), Supabase (databáze a fotky, EU, Irsko) a Resend (odesílání e-mailů, USA) a „Platné od spuštění nového webu.“ Záruky pro předání údajů do USA (Resend) čekají na ověření v backlogu. Název firmy má v textu zásad pevnou mezeru (SKYSHARE s.r.o. se na telefonu nerozdělí na dva řádky).
- Souhlas se zpracováním údajů se nezaškrtává (rozhodnutí 10. 10. 2026 v klikacím modelu): oba formuláře mají jen informační větu s odkazem na zásady (u Zavolejte mi navíc proti modelu, čl. 13 GDPR) a validace souhlas nevyžaduje. Sloupce `consent` a `consent_at` zůstávají nevyužité pro případ, že by se zaškrtávátko vrátilo.
- Stav pro `useActionState`: `{ ok, errors, values, formError, token }`. `values` vrací vyplněné hodnoty (při chybě do polí, po odeslání do shrnutí).
- Ochrana proti robotům (`src/lib/inquiries/spam.ts`): skryté pole `website` (vyplněné = tvářit se jako úspěch a nic neuložit), podepsaný čas vykreslení v poli `formToken` (odeslání do 3 s se odmítne, token platí 24 hodin; po vypršení dostane formulář nový token, který platí hned, chybějící nebo podvržený token nový s aktuálním časem) a nejvýš 5 poptávek za hodinu z jedné IP (otisk `sha256(IP + IP_HASH_SALT)`, samotná IP se neukládá). Kdo zná sůl, otisk dopočítá (celé IPv4 za desítky minut), je to tedy pseudonymizovaný osobní údaj: otisk IP a údaj o prohlížeči (`user_agent`) se u poptávek starších než 30 dní mažou (`TRACE_RETENTION_DAYS` v `spam.ts`), bez cronu vždy ve stejné transakci s novou poptávkou. Lhůtu uvádějí zásady, při změně upravit obojí.
- Stránka s formulářem musí vytvářet token při každém požadavku (`await connection()` a `createFormToken()`), jinak by v něm zůstal čas buildu. Po chybě formulář použije `state.token`, po vypršení je v něm nový.
- E-maily odcházejí až po odpovědi (`after()`): upozornění na `NOTIFY_TO` s odpovědí rovnou zájemci a potvrzení zájemci. Bez nastaveného Resendu se poptávka uloží a e-mail se jen zaloguje. Do logu jde jen id poptávky.
- Potvrzení zájemci nenese nic, co návštěvník napsal: oslovení je bez jména a kopie údajů má jen volby z nabídky (licence, výlet, počet pilotů, doprovod, odkud o nás ví). Formulář může vyplnit kdokoli s cizí adresou a web by jinak šel zneužít k rozesílání vlastního textu z naší domény.
- Administrace `/admin/poptavky`: filtr podle stavu s počty (archivované jsou všude „Archiv“), detail se všemi poli, změna stavu (archivace je stav), interní poznámka, trvalé smazání po potvrzení. Na telefonu jsou v detailu pod jménem tlačítka Zavolat a Napsat e-mail, pak stav a interní poznámka, podrobnosti až pod nimi, na počítači beze změny (úprava 53). Poznámka i změna stavu přežijí výpadek sítě (hláška místo chybové stránky), poznámka má ukazatel neuložených změn a dotaz při odchodu. Dokud není nastavený Resend, upozornění říká „E-maily o nových poptávkách zatím nechodí, Radek je zapne. Poptávky se mezitím ukládají sem.“ (úprava 48, bez názvů proměnných prostředí).
- e2e testy oblasti jsou ve `scripts/e2e/kontakt.mjs` (`E2E_FILE=kontakt npm run e2e`): poptávka se skriptem i bez, Zavolejte mi, výpadek sítě a chyba serveru, volby s cenou a sloupec kontaktů, obnova rozepsaného formuláře, „Odesílám…“ při pomalé síti (CDP) bez zdvojení, odeslání obnoveného formuláře hned po načtení a hláška limitu u Nechte číslo.

## Z cest (administrace článků)

Administrace `/admin/posts` (v menu administrace „Z cest“): seznam s hledáním a filtrem podle stavu (Všechny, Publikované, Koncepty: `?stav=draft` a `?stav=published`, na ně vedou karty na přehledu; filtr Archivované je skrytý i v adrese, články archiv nemají), nový článek, úprava, publikace a smazání po potvrzení.

- Tlačítka: koncept má Uložit koncept a Publikovat, publikovaný článek v liště jen Uložit změny. „Stáhnout z webu“ (dřív Vrátit do konceptů) je na konci formuláře nad Smazat s větou, co udělá (úprava 47). Po uložení konceptu zůstává editor otevřený, po publikaci jde administrace na seznam a hláška má odkaz „Zobrazit na webu“. Odkaz zpět je „Zpět na články“ (úprava 55). Datum publikace se nastaví při první publikaci a po stažení z webu zůstane.
- Výpadek sítě (úprava 10): výjimku ze server action (výpadek sítě, chyba serveru) zachytí formulář a ukáže v liště „Článek se nepodařilo uložit. Zkontrolujte připojení a zkuste to znovu, text zůstává tady.“ místo `error.tsx`, přesměrování po úspěšném uložení propustí `unstable_rethrow`. Stejně interní poznámka a stav poptávky.
- Neuložené změny: v liště ukazatel „Neuložené změny“ a před odchodem z administrace (menu, drobečky, Zpět na články, odkazy v hláškách, Odhlásit) dotaz „Odejít bez uložení?“ s volbami Zůstat a Odejít bez uložení (`LeaveGuard.tsx`), při zavření okna nebo obnovení stránky se ptá prohlížeč (`beforeunload`). Tlačítko Zpět prohlížeče hlídat nejde, na to je záloha.
- Záloha v prohlížeči: rozepsaný článek se průběžně ukládá do localStorage pod klíč `fa-admin-clanek:<id>` (nový článek `fa-admin-clanek:new`, `post-backup.ts`, vše v try/catch), okamžitě i při skrytí nebo opuštění stránky. Při dalším otevření nabídne „Máte neuloženou verzi z 14:32. Obnovit?“ (Obnovit, Zahodit), po uložení nebo smazání článku se smaže. Platí jen v tom prohlížeči.
- Chyby (úprava 44): po neúspěšném uložení posun a fokus na první chybné pole, v liště první chyba jako klikací hláška a počet dalších („Ještě 1 další chyba níž.“).
- Značka `[doplnit…]` (úprava 7): publikaci a uložení publikovaného článku se značkou v názvu, perexu nebo textu zablokuje hláška u pole („Text obsahuje značku [doplnit…]. Před publikováním ji nahraďte textem, koncept jde uložit i s ní.“), koncept uložit jde.
- Rok cesty (úprava 33): nepovinné pole „Rok cesty“ (sloupec `trip_year`, rozsah 1950 až příští rok, `TRIP_YEAR_MIN` a `tripYearMax()` v `post-form.ts`). Prázdné pole se uloží prázdné a web pak bere rok ze štítku v názvu (`titleLabelYear()`), jinak rok publikace. Ukázkový text v poli ukazuje, jaký rok to bude (u nového článku letošní). Web rok ukazuje podle `postYear()` (Veřejný web, Z cest).
- Video pod článkem má vlastní sekci s nápovědou „Ukáže se pod textem. Video doprostřed textu vložíte tlačítkem v liště editoru.“ (úprava 54).
- Server actions v `src/app/admin/(dashboard)/posts/actions.ts` ověří formulář přes zod (`src/lib/post-form.ts`) včetně volné adresy (jen a-z, 0-9 a spojovník), vyčistí text přes `sanitizePostHtml()` a obnoví veřejné stránky přes `revalidatePublicPosts()` pro novou i starou adresu. Publikovat jde jen článek s textem.
- Galerie: článek má libovolný počet galerií (sloupec `gallery`). V textu je zastupuje značka `<p data-gallery="ID"></p>`, v editoru blok „Galerie 2: 5 fotek" (`src/components/admin/GalleryMarker.tsx`). Backspace ani Delete ho nesmažou, odebírá se křížkem v bloku nebo spolu s galerií. Při uložení server zahodí značky galerií, které v článku nejsou, a zdvojené značky. Galerie se číslují podle pořadí v textu. Nová galerie se po nahrání fotek sama vloží na konec textu (`appendGalleries` v editoru, hláška), tlačítka u galerie jsou „Přesunout na místo kurzoru“ a u galerie mimo text „Vložit na místo kurzoru“. Publikace (i Uložit změny u publikovaného článku) s galerií mimo text se zeptá „Galerie N (X fotek) není v textu. Na webu se neukáže. Vložit ji na konec článku?“, „Zpět k úpravám“ nic neuloží (úprava 10). Odebranou fotku z galerie i titulní fotku jde vrátit z hlášky „Fotka odebrána“ tlačítkem Vrátit, fotka galerie se vrátí na původní místo (úprava 47).
- Limity: nejvýš 30 galerií po 60 fotkách, popisek fotky do 500 znaků a text do 500 000 znaků (kvůli článkům ze starého webu: Oblet Ameriky má 17 galerií, článek 2017 popisky přes 300 znaků). Chyba v galerii říká, která galerie a fotka to je („Galerie 2, fotka 5: popisek je příliš dlouhý…“). Formulář posílá galerie i text najednou, proto má server action limit těla 4 MB (`next.config.ts`, Vercel pustí do funkce 4,5 MB).
- Editor: odkaz napsaný bez `https://` (třeba `flyamerica.cz`) dostane `https://` doplněné, adresa se zavináčem `mailto:`. Odkaz, video a popisek fotky v textu se zadávají ve vlastním malém okně (`PromptDialog.tsx`, klávesnice Enter a Esc, funguje i na telefonu) místo `window.prompt`: odkaz bez označeného textu se zeptá i na text odkazu, adresa videa jinde než na YouTube ukáže „Tohle není odkaz na YouTube.“ (úprava 46). Lišta editoru má na počítači u Odstavce, Mezititulku, Menšího mezititulku, Fotky a Videa ikonu s textem a v šířce formuláře se zalomí do dvou řádků, na telefonu je jeden řádek (Tučně, Mezititulek, Odkaz, Fotka) a zbytek pod Další. Při psaní se na telefonu schová spodní lišta s tlačítky, dotykové cíle mají 44 px (úprava 51). Vložení z Wordu: řádky tabulky se převedou na řádky textu oddělené čárkou, nadpis H1 na Mezititulek. Obrázek z jiného webu nebo z Wordu je v editoru viditelně označený (i pro čtečky), koncept s ním jde uložit, publikaci zablokuje hláška a fokus jde do textu, obrázek přes http čištění z konceptu odstraní (úprava 52). Video z YouTube se v editoru ukládá v poměru 16 : 9, na webu je z něj náhled s tlačítkem „Přehrát video“ a přehrávač až po kliknutí (viz Veřejný web, Z cest).
- Adresy fotek (titulní fotka, galerie i obrázky v textu) server při uložení ověří přes `isAllowedImageUrl()` (`src/lib/image-hosts.ts`): jen bucket `denik` našeho projektu Supabase (`SUPABASE_URL`), při `next dev` navíc `placehold.co` (ukázková data) a `http://127.0.0.1:8816` (fotky z migrace). Obrázek vložený s textem z jiného webu nebo cizí adresa ve skrytých polích formuláře skončí srozumitelnou hláškou, fotky jdou jen přes nahrání. Web by jinak fotku načítal z cizího serveru a ten by dostal IP návštěvníků.
- Fotky: titulní fotka (s povinným polem „Popisek fotky“, nápověda „Zobrazí se pod fotkou na webu a přečtou ho i nevidomí.“, slovo alt text v rozhraní není, úprava 45), fotky v textu a v galeriích jdou přes `/api/admin/upload` do veřejného bucketu `denik`. Tlačítka jsou „Nahrát fotku z počítače nebo telefonu“ (u galerie „Nahrát fotky…“) s nápovědou „Fotky ve formátu HEIC uložte jako JPEG.“ (úprava 50, převod HEIC v prohlížeči je v backlogu). Prohlížeč fotku před nahráním zmenší na 2560 px a překóduje do JPEG, tím zmizí i EXIF a XMP s GPS polohou. Beze změny (i s případnými metadaty) se nahraje jen malé PNG a GIF. Routa přijme nejvýš 4 MB (Vercel pustí do funkce 4,5 MB), typ pozná podle obsahu souboru a soubor pojmenuje náhodně. Bez `SUPABASE_URL` a `SUPABASE_SERVICE_ROLE_KEY` nahrávání nejde, formulář to oznámí a článek jde uložit bez fotek.
- Úklid úložiště: fotky, které z článku zmizely (vyměněná titulní fotka, odebraná fotka z galerie nebo z textu), a fotky smazaného článku se z bucketu smažou po úspěšném zápisu, pokud je nepoužívá jiný článek. Fotky nahrané do článku, který se nakonec neuložil, v úložišti zůstanou.
- Kategorie: výběr z existujících, novou jde přidat ve formuláři a založí se až s uložením článku.
- Ukázkový text v polích administrace má barvu Šedá 500 (5,67 : 1 na bílé, `admin.css`, úprava 56), nadpis potvrzovacího okna je h2. e2e testy administrace jsou ve `scripts/e2e/admin.mjs` (část 1, část 2 je uložení importovaných článků). Nahrávání fotek test zapne jen ve svém prohlížeči a odpověď `/api/admin/upload` podvrhne (lokálně úložiště není).

## Databáze

Schéma je v `src/lib/db/schema.ts`. Po změně schématu:

```bash
npm run db:generate         # vytvoří SQL migraci v drizzle/, k databázi se nepřipojuje
```

Migraci zkontrolovat a commitnout spolu se schématem. Lokální databáze ji aplikuje při dalším `npm run db:local`.

Migrace: `0000_init` (tabulky, enumy, RLS), `0001_login_limit_session_version` (tabulka `login_attempts` a sloupec `admin_users.session_version`), `0002_post_trip_year` (nepovinný sloupec `posts.trip_year`, Rok cesty, 14. 10. 2026). Kód od 14. 10. 2026 sloupec čte (`src/lib/public-posts.ts`), migraci proto pustit na Supabase dřív, než se nový kód nasadí (Nasazení, krok 2). Starý kód sloupec jen nezná, migrace mu nevadí.

Všechny tabulky mají zapnuté RLS bez politik (`.enableRLS()`): Supabase vystavuje schéma `public` přes API s veřejným klíčem a bez RLS by k datům mohl kdokoli. Aplikace jezdí jako vlastník tabulek a RLS ji neomezuje. Každá nová tabulka musí `.enableRLS()` mít taky.

## Bezpečnost administrace

- Layout administrace i každá její stránka volají `requireAdminPage()`, každá server action a API routa administrace `requireAdmin()`. Server actions jsou veřejné endpointy a layout je nechrání. Hlídá to ESLint pravidlo `local/require-admin`.
- Akce volané z formulářů (článek, stav a poznámka poptávky) a nahrávání fotek volají `requireAdmin().catch(signedOutAsNull)`. Při vypršelém přihlášení vrátí hlášku „Přihlášení vypršelo..." a rozepsaný text ve formuláři zůstane. Jiná chyba (třeba výpadek databáze) se jako vypršelé přihlášení nehlásí.
- Kontrola ověřuje i to, že účet v `admin_users` pořád existuje a že přihlášení nese aktuální `session_version`. Smazaný účet tak přestane fungovat hned a změna hesla přes `scripts/create-admin.mjs` odhlásí všechna zařízení přihlášená starým heslem.
- Přihlášení: po 10 neúspěšných pokusech z jedné IP (otisk jako u poptávek) se přihlášení z ní na 15 minut zablokuje, ještě před ověřením hesla. Úspěšné přihlášení pokusy té IP vynuluje. Limit se počítá podle IP, ne podle e-mailu, aby nikdo nemohl zablokovat Honzův účet. Špatné heslo jde do logu jako jeden řádek bez e-mailu.
- HTML článků se před uložením čistí přes `sanitizePostHtml()`.
- Na přihlášení i na chybové stránce administrace je „Zapomenuté heslo nebo problém? Napište Radkovi: radek.bitala@gmail.com“ s odkazem mailto (`AdminHelpContact.tsx`, rozhodnutí R11, osobní e-mail Radka).
- `/api/auth/*` (Auth.js) na `HEAD` odpoví 405 s `Allow: GET, POST` a Auth.js nevolá. Auth.js umí jen GET a POST a na HEAD (roboti, kontroly dostupnosti) by zapsal chybu `UnknownAction` do logu Vercelu.

## Založení admina

Skriptem (doporučeno), proti databázi, do které se má účet založit:

```bash
DATABASE_URL="postgres://..." node scripts/create-admin.mjs
```

Zeptá se na e-mail, jméno a heslo (aspoň 12 znaků, při psaní se nezobrazuje) a uloží bcrypt hash. Když účet s e-mailem existuje, změní mu jméno a heslo, takže slouží i pro změnu hesla.

Alternativa v SQL editoru Supabase (e-mail malými písmeny, přihlášení ho tak porovnává; heslo aspoň 12 znaků, SQL to nehlídá):

```sql
insert into admin_users (email, name, password_hash)
values ('jmeno@example.cz', 'Jméno', extensions.crypt('HESLO', extensions.gen_salt('bf', 12)));
```

Změna hesla v SQL musí zvýšit i `session_version`, jinak zůstanou přihlášená zařízení přihlášená:

```sql
update admin_users
set password_hash = extensions.crypt('NOVE-HESLO', extensions.gen_salt('bf', 12)),
    session_version = session_version + 1
where email = 'jmeno@example.cz';
```

`crypt()` z pgcrypto vytvoří hash `$2a$12$...`, který přihlášení (bcryptjs) přijme, ověřeno na Postgresu 17. V Supabase je pgcrypto ve schématu `extensions`. Heslo ale zůstane v historii SQL editoru, proto je skript lepší.

## Nasazení (Vercel + Supabase)

Web běží na Vercelu na `https://flyamerica.vercel.app`. Funkce jsou v regionu `dub1` (Dublin), blízko databáze Supabase v eu-west-1, nastavuje to `vercel.json` (`"regions": ["dub1"]`). Nové nasazení: ručně, nebo pushem do větve `main`.

1. Supabase: založit projekt a v Storage veřejný bucket `denik`.
2. Migrace na Supabase z lokálního počítače, s connection stringem pro přímé spojení nebo session pooler:
   ```bash
   DATABASE_URL="postgres://..." npx drizzle-kit migrate
   ```
   Drizzle si aplikované migrace pamatuje v tabulce `drizzle.__drizzle_migrations`. Migrace proto nespouštět ručně v SQL editoru, jinak by je `drizzle-kit migrate` zkusil spustit znovu. Nová migrace jde na Supabase vždy před nasazením kódu, který ji potřebuje: od 14. 10. 2026 `0002_post_trip_year` (bez ní by stránky s články skončily chybou). Potom v administraci u článku „Po vynucené pauze opět v USA“ vyplnit Rok cesty 2022 a uložit (import ostré databáze proběhl dřív, než rok cesty uměl, kroky v `../design/audit-2026-10-13/BACKLOG-po-spusteni.md`).
3. Založit admina (viz výše).
4. Vercel: připojit repozitář, nastavit proměnné prostředí z tabulky výše. `AUTH_SECRET` vygenerovat např. `openssl rand -base64 32`. `DATABASE_URL` aplikace musí být sdílený pooler Supabase (Supavisor) `aws-0-eu-west-1.pooler.supabase.com`, port `6543`, s uživatelem `postgres.<ref>` (`<ref>` je id projektu Supabase): `postgres://postgres.<ref>:<heslo>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`. Dedicated pooler na `db.<ref>.supabase.co` má jen IPv6 adresu a z Vercelu se na něj připojit nejde. Kód počítá s `prepare: false` (pooler v transakčním režimu). Adresu zadat s `?sslmode=require` na konci. Spojení se šifruje i bez toho (`src/lib/db/index.ts`: databáze mimo localhost jede přes TLS, `sslmode` v adrese má přednost), ale certifikát Supabase se tak neověřuje. V Supabase zapnout Database, SSL Configuration, Enforce SSL on incoming connections, aby databáze nešifrované spojení vůbec nepřijala. Ověření certifikátu (`sslmode=verify-full` s kořenovým certifikátem Supabase) zatím nastavené není.
5. Písma jsou v repozitáři (`src/fonts`), build ani prohlížeč nic z Google Fonts nestahují.
   Mezipaměť buildu: Next 16.3 ukládá výsledky Turbopacku do `.next/cache/turbopack` (při vývoji `.next/dev/cache/turbopack`) a Vercel `.next/cache` mezi nasazeními obnovuje. 14. 10. 2026 lokální build se starou mezipamětí vzal zastaralý `src/app/admin/admin.css` (bez změny barvy ukázkového textu), po smazání mezipaměti byl správně. Po nasazení změny stylů administrace ji proto zkontrolovat (barva ukázkového textu v hledání na `/admin/posts` je Šedá 500, `rgb(94, 104, 115)`), a když chybí, nasadit znovu bez build cache (Vercel, Redeploy, bez „Use existing Build Cache“). Lokálně `rm -rf .next/cache/turbopack .next/dev/cache`.
6. Deník ze starého webu: import podle části Import deníku, nejlépe před prvním nasazením.

### Spuštění webu

Do spuštění je indexace vypnutá (Veřejný web, Indexace). Při spuštění na hlavní doméně:

1. Ve Vercelu (Settings, Domains) připojit `www.flyamerica.cz` jako hlavní doménu a `flyamerica.cz` přesměrovat na ni (hlavní doména s www, rozhodnutí 12. 10. 2026). V Environment Variables (prostředí Production) nastavit `NEXT_PUBLIC_ALLOW_INDEXING` na `true`. `NEXT_PUBLIC_SITE_URL` je výchozí `https://www.flyamerica.cz`, v produkci ji nenastavovat, nebo nastavit přesně na tuto adresu.
2. Web znovu nasadit. Obě proměnné se vkládají při buildu, samotná změna ve Vercelu se bez nového nasazení neprojeví.
3. Zkontrolovat: `/robots.txt` má `Allow: /`, `Disallow: /admin`, `Disallow: /api/` a odkaz na mapu webu, stránky nemají `<meta name="robots">` a odpovědi nemají hlavičku `X-Robots-Tag`.

## Import deníku

`scripts/import-denik.mjs` převede deník starého webu z `../migrace` (`posts.json` a fotky ve `storage/`, popis v `../migrace/MIGRACE.md`) do tabulek `posts`, `post_categories` a `post_category_map` a fotky do bucketu `denik`. Výsledek: 12 článků (11 publikovaných, článek 2025 jako koncept), 46 galerií s 459 fotkami, 3 kategorie, 460 souborů JPEG (155 MB).

Co import dělá s daty:

- Fotky jen JPEG (WebP z migrace se nenahrává, formáty dělá `next/image`), v bucketu jako `<slug>/<soubor>.jpg`.
- Titulek bez přípony „ | 2016“. Když se rok z přípony liší od roku publikace (článek „Po vynucené pauze opět v USA | 2022“ vyšel 19. 11. 2023), uloží se do `trip_year` (Rok cesty, úprava 33), suchý běh to u článku vypíše. Perex a úvodní fotka podle klikacího modelu (karty v `prototyp/denik.html`, u článku 2017 Druhý přelet Atlantiku velká fotka z jeho stránky), popis úvodní fotky z modelu.
- Galerie NextGEN do sloupce `gallery`, blokové galerie WordPressu v článcích 2019, 2022 a 2023 také (značky `wp-2019-1` atd. na původním místě v textu).
- Popisky fotek opravené v modelu (`prototyp/_ZMENY_popisky_2026-10-10.md`) mají opravu i v galerii článku 2017.
- Fotky bez popisku mají ze starého webu alt jako název souboru (`MIGRACE.md`, otázka 11). Import ho upraví: „001_Venice“ na „Venice“ (35 fotek článku Z vrtulníkové Kalifornie), alt jen z pořadí („Den2_02“, 14 fotek Obletu Ameriky) vynechá, mřížka pak fotku pojmenuje „Fotka N“. Alt, který po úpravě pořád vypadá jako název souboru, import nepustí.
- Text projde `sanitizePostHtml()` jako při uložení v administraci.

Bez přepínače je to suchý běh: zkontroluje data, soubory a rozměry fotek, vypíše souhrn a nic nezapíše. Připojení k databázi ani k Supabase nepotřebuje.

```bash
node scripts/import-denik.mjs                 # suchý běh
node scripts/import-denik.mjs --local         # do lokální databáze (běžící npm run db:local)
node scripts/import-denik.mjs --ostre         # fotky do Supabase a články do ostré databáze
```

Další přepínače: `--aktualizovat` přepíše články se stejným slugem (i s úpravami z administrace, u článku 2025 vrátí koncept), `--jen=slug,slug` jen vybrané články, `--zdroj=<složka>` jiná složka než `../migrace`. Opakované spuštění je bezpečné: existující články přeskočí, fotky se stejnou velikostí v bucketu nenahrává znovu. Zápis do databáze je v jedné transakci.

Lokálně: `--local` bere `DATABASE_URL` z `.env.development.local` a zapíše jen do lokální databáze. Fotky pak vedou na `http://127.0.0.1:8816/<slug>/<soubor>.jpg`, pro `next dev` je servíruje `python3 -m http.server 8816 --bind 127.0.0.1 --directory ../migrace/storage`. Úpravy importovaných článků v administraci jdou lokálně zkoušet jen v `next dev`: lokální `next start` adresy z 127.0.0.1 nepovolí (jako produkce), uložení skončí hláškou o fotce a mapy v textu Obletu Ameriky se nezobrazí. Čistá databáze bez importu: `npm run db:local -- reset`.

Ostrý import (Radek):

1. Na Supabase musí být hotové kroky 1 a 2 z části Nasazení (veřejný bucket `denik`, migrace).
2. V kořeni repozitáře vytvořit `.env.import.local` podle `.env.import.local.example` (soubor se necommituje):
   - `SUPABASE_URL`: adresa projektu, `https://uwiqbznnnltgwjyvhzcg.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: servisní klíč projektu (nastavení projektu v Supabase, API Keys), stejná hodnota jako `SUPABASE_SERVICE_ROLE_KEY` ve Vercelu
   - `DATABASE_URL`: connection string ze Supabase (Connect) pro session pooler (port 5432) nebo direct connection, ne transaction pooler. Skript se připojuje přes TLS (bez ověření certifikátu, `sslmode` v adrese má přednost).
3. `node scripts/import-denik.mjs` (suchý běh) a zkontrolovat souhrn.
4. `node scripts/import-denik.mjs --ostre`. Vypíše projekt a host databáze (bez jména a hesla), nahraje fotky (6 souběžně), pak zapíše články a na konci vypíše počty.
5. Po importu `.env.import.local` smazat. Proměnné prostředí shellu skript nepoužívá, jen tento soubor, a hodnoty nikam nevypisuje.
6. Když už web běží, uložit v administraci libovolný článek (obnoví cache deníku přes `revalidatePublicPosts()`), nebo web znovu nasadit.
7. Článek 2017 Druhý přelet Atlantiku: 4 fotky s popisky ke dnům jako v modelu (Den 1-4) import do textu nevkládá, jsou jen v galerii na konci. Vloží je SQL skript `update.sql` v Supabase SQL editoru (připravený mimo repozitář, s návodem `POPIS.md`, vrácení `revert.sql`), potom uložit v administraci jiný článek než 2017 (obnoví cache). Nový import s `--aktualizovat` fotky z textu zase odstraní, pak `update.sql` pustit znovu.

Článek 2025 je v `posts.json` bez závěru a má v textu značku `[doplnit: závěr článku…]`, proto zůstává koncept a administrace ho se značkou nepublikuje. Závěr je doslova v Honzově podkladu `../podklady-od-Honzy/2026-10-13_clanek-USA-2025-v2.md` (postup v backlogu). Skript ověří i to, že každý článek projde validací formuláře článku (`postSchema`), a upozorní na článek, který by administrace neuložila. Se současnými limity (30 galerií, popisek do 500 znaků) projdou všechny. e2e test „administrace uloží importované články beze změny“ to ověřuje v prohlížeči.
