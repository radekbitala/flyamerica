# FLY America - web

Nový web flyamerica.cz: veřejné stránky (balíčky, tipy na výlety, deník, kontakt s poptávkovým formulářem) a administrace pro deník a poptávky. Honza Čermák létá jako mentor s českými piloty na Floridě.

Stav: administrace (přihlášení, přehled, deník, poptávky) a serverová část poptávek jsou hotové. Veřejný web má společný základ (styly a písma z klikacího modelu `../prototyp`, hlavička, patička, komponenty, fotky, metadata, data deníku, pevné mezery), stránky se na něj převádějí z modelu. Na úvodu je zatím dočasná stránka.

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
    (web)/                 veřejný web, vlastní kořenový layout a CSS
    admin/                 administrace, vlastní kořenový layout s Tailwindem
      (auth)/login/        přihlášení
      (dashboard)/         stránky za přihlášením (přehled, deník, poptávky)
    api/auth/[...nextauth] Auth.js
    api/admin/upload/      nahrávání fotek deníku do úložiště
    global-not-found.tsx   404 pro neznámé adresy (oba layouty)
    favicon.ico, icon.png, apple-icon.png
  components/
    admin/                 komponenty administrace
    web/                   komponenty webu (hlavička, patička, záhlaví, výzva, fotky), viz Veřejný web
  data/
    photos.ts              fotky stránek z modelu: název -> src, rozměry, alt
    redirects.json         přesměrování starých adres (načte next.config.ts)
  lib/
    db/schema.ts           databázové schéma (tabulky, enumy, RLS)
    db/index.ts            připojení k databázi (vytvoří se až při prvním dotazu)
    auth.ts                Auth.js
    admin-guard.ts         requireAdmin(), requireAdminPage(), signedOutAsNull()
    login-limit.ts         omezení pokusů o přihlášení podle otisku IP
    email.ts               e-maily přes Resend
    site.ts                název, adresa (SITE_URL) a kontakt webu
    metadata.ts            pageMetadata(): titulek, popis, canonical, og a twitter stránky
    public-posts.ts        deník pro veřejný web (jen publikované, cache s tagem)
    typography.ts          czechNbsp(): pevné mezery podle pravidla R4 z modelu
    dates.ts               data jako v modelu („21. 12. 2023“, pražský čas)
    inquiries/             poptávky: volby formuláře, zod schéma, ochrana proti spamu, dotazy administrace
    supabase/admin.ts      úložiště obrázků (servisní klíč, jen server)
    sanitize.ts            čištění HTML článků
    post-form.ts           deník: zod schéma formuláře článku, limity, adresa z názvu
    post-files.ts          deník: fotky článku v úložišti (kontrola adres, úklid)
    posts-cache.ts         obnovení veřejných stránek po změně článku
    fonts.ts               písma přes next/font/local (soubory z modelu)
  types/next-auth.d.ts     verze přihlášení v session (Auth.js)
  styles/                  fa-tokeny.css a web.css z klikacího modelu (neupravovat), fonts.css
  fonts/                   WOFF2 z modelu: Overpass, Overpass Mono, Source Serif 4 (OFL)
public/
  img/                     fotky stránek (největší varianta z modelu)
  logo/                    logo do hlavičky (pixelové SVG 32 a 24 px)
  og/                      náhledy odkazu 1200 x 630
drizzle/                   SQL migrace
scripts/
  local-db.mjs             lokální databáze pro vývoj a testy
  create-admin.mjs         založení účtu do administrace
  e2e.mjs                  e2e testy
  test-inquiry-action.mjs  test validace poptávky bez serveru a databáze
  test-typography.mjs      test pevných mezer (texty z modelu)
eslint-rules/              vlastní pravidlo local/require-admin
```

Web a administrace mají každý svůj kořenový layout, aby se jejich styly nikdy nemíchaly. Přechod mezi webem a administrací je proto vždy celé načtení stránky. Adresu, která neodpovídá žádné stránce, obsluhuje `global-not-found.tsx` (vzhled webu), `notFound()` uvnitř webu `(web)/not-found.tsx` a uvnitř administrace `admin/(dashboard)/not-found.tsx`.

## Proměnné prostředí

Hodnoty patří do Vercelu (produkce) nebo do `.env.development.local` (lokálně, zapisuje ho `npm run db:local`). Soubory `.env*` se necommitují.

| Proměnná | K čemu |
| --- | --- |
| `DATABASE_URL` | připojení k Postgresu (Supabase) |
| `AUTH_SECRET` | podepisování přihlašovacích cookies (Auth.js) |
| `SUPABASE_URL` | adresa projektu Supabase (úložiště obrázků). Musí být nastavená i při buildu, jen pro ni povolí `next/image` fotky z bucketu `denik` |
| `SUPABASE_SERVICE_ROLE_KEY` | servisní klíč Supabase, jen na serveru (nahrávání a mazání obrázků) |
| `RESEND_API_KEY` | klíč Resendu pro odesílání e-mailů |
| `RESEND_FROM` | ověřený odesílatel, např. `FLY America <poptavky@flyamerica.cz>` |
| `NOTIFY_TO` | kam chodí upozornění na nové poptávky |
| `IP_HASH_SALT` | sůl pro otisk IP u poptávek a přihlášení (omezení četnosti, samotná IP se neukládá). Bez ní poslouží `AUTH_SECRET` |
| `DB_POOL_MAX` | volitelně: počet spojení do databáze (výchozí 10 v produkci, 1 při vývoji) |
| `NEXT_PUBLIC_SITE_URL` | volitelně: adresa webu pro canonical, og:url a náhledy odkazu, výchozí `https://flyamerica.cz`. Hlavní doména (s www, nebo bez) ještě není rozhodnutá. Vkládá se při buildu |

Bez `RESEND_*` a `NOTIFY_TO` se e-maily jen zalogují, poptávka se uloží i tak. Build projde úplně bez proměnných, databáze ani úložiště se při importu nepřipojují. Stránky s články deníku se pak nevygenerují při buildu, ale až při návštěvě (viz Veřejný web, Deník).

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
node scripts/test-inquiry-action.mjs   # validace poptávky, bez serveru a databáze
node scripts/test-typography.mjs       # pevné mezery, bez serveru a databáze
```

Fotky deníku z migrace lokálně (dokud nejsou v Supabase), adresy `http://127.0.0.1:8816/<slug>/<soubor>` povolí `next/image` jen při `next dev`:

```bash
python3 -m http.server 8816 --bind 127.0.0.1 --directory ../migrace/storage
```

## Veřejný web

Vzor vzhledu a obsahu je klikací model `../prototyp` (HTML stránek, `css/web.css`, `_PRAVIDLA.md`, `DESIGN.md`). Stránky přebírají jeho HTML struktury, třídy a texty doslova, Honzovy texty včetně pevných mezer a značek `[doplnit: …]`. Adresy jsou bez `.html`: `/`, `/balicek-florida-week`, `/balicek-grand-tour`, `/tipy-na-vylety`, `/o-honzovi`, `/denik`, `/denik/[slug]`, `/kontakt`, `/zasady-zpracovani-osobnich-udaju`.

### Layout a komponenty

Layout `src/app/(web)/layout.tsx` vykreslí symbol šipky, odkaz „Přeskočit na obsah“, hlavičku, `<main id="obsah">` a patičku. Stránka vrací jen obsah `<main>` (záhlaví a sekce), hlavičku ani patičku nevkládá. Odkazy v rámci webu přes `next/link`.

| Komponenta | Props | Použití |
| --- | --- | --- |
| `SiteHeader` | žádné | v layoutu. Logo (SVG v křivkách, 32 px, pod 601 px 24 px přes `<picture>`), menu s `aria-current` podle cesty (`page` na stránce sekce, `true` na detailu), tichá výzva „Poptat termín“, mobilní menu |
| `MobileMenu` | `logo: ReactNode` | jediná klientská komponenta, jen uvnitř `SiteHeader`. Chování z `prototyp/js/web.js`: Escape zavře menu a vrátí fokus na tlačítko, odkaz v menu a šířka nad 960 px ho zavřou, tichá výzva se schová, když je pod hlavičkou vidět `main .fa-dir` nebo `main #poptavka`, na stránkách balíčků vede na `/kontakt?balicek=…#poptavka` |
| `SiteFooter` | žádné | v layoutu, texty doslova z modelu |
| `PageHead` | `title`, `label?`, `crumbs?`, `perex?`, `perexVoice?`, `children?` | záhlaví podstránky (`.page-head`). Stránka sekce `label`, detail `crumbs`. `perexVoice` = perex Honzova článku v serifu. `children` pod perex (`.dn-by`, `.kt-tel`) |
| `Crumbs` | `href`, `label`, `current` | drobečky s polohovou tabulí (`.crumbs` a `.fa-loc`), samostatně pro záhlaví balíčku `.pk-head` |
| `CtaSection` | `id?` | výzva „Napište, kdy chcete letět.“ na konci stránky, na úvodu `id="poptat"` |
| `Figure` | `photo`, `sizes`, `className?`, `style?`, `caption?`, `credit?`, `priority?`, `alt?`, `blurDataURL?` | fotka s popiskem. Popisek je výchozí alt s pevnými mezerami, `credit` přidá „Foto: archiv FLY America“, `priority` pro první fotku stránky (bez líného načítání, `fetchPriority="high"`) |
| `Photo` | `photo`, `sizes`, `priority?`, `alt?`, `className?`, `style?`, `blurDataURL?` | fotka bez popisku (dlaždice, karty, portrét) |
| `ArrowSymbol`, `Arrow` | žádné | symbol `#arr` (v layoutu) a šipka `<svg><use href="#arr"/></svg>` v odkazech a tabulích |

Pomocné moduly: `src/components/web/nav.ts` (`NAV_ITEMS`, `inquiryHref(balicek?)`, `packageFromPath()`), `src/lib/site.ts` (kontakt, `FA_PHONE_HREF`), `src/lib/dates.ts` (`formatDate`, `isoDate`, `yearOf`).

### Fotky

`public/img` má od každé fotky použité v modelu jen největší variantu (název bez velikosti, `img/cedar-key-letecky-800.jpg` v modelu = `/img/cedar-key-letecky.jpg`), menší velikosti a AVIF/WebP dělá `next/image`. `src/data/photos.ts` je převedený `prototyp/img/_seznam.tsv`: klíč je název bez přípony, hodnota `{ src, width, height, alt }`. `alt` je popisek z archivu doslova, viditelný popisek je stejný text s pevnými mezerami. `sizes` se přebírá z HTML modelu, pro velkou fotku podstránky je `PAGE_PHOTO_SIZES`. Šířky obrázků (`deviceSizes`, `imageSizes`) jsou v `next.config.ts` podle modelu. Úvodní fotka s jinými variantami pro mobil (`<picture>` v modelu) jde přes `getImageProps()`.

### Metadata

Každá stránka skládá metadata přes `pageMetadata({ title, description, path, absoluteTitle?, ogImage?, article? })` ze `src/lib/metadata.ts`: titulek „Název - FLY America“, stejný `og:title` a `og:description`, canonical a `og:url` s adresou stránky, náhled odkazu 1200 x 630 (`/og/og-image.jpg`, u článků `ogImage: "photo"` = `/og/og-image-foto.jpg`) a `twitter:card` `summary_large_image`. Next slučuje metadata jen do první úrovně, stránka s vlastním `openGraph` by jinak přišla o obrázek z layoutu. Adresy doplní `metadataBase` = `SITE_URL`.

### Písma

Všechna tři písma jsou soubory z modelu (`src/fonts`, WOFF2 jen se znaky latin a latin-ext) přes `next/font/local` (`src/lib/fonts.ts`), nic se nestahuje z Google Fonts. Overpass je jediné přednačtené písmo. Overpass Mono a Source Serif 4 mají latin a latin-ext v samostatných souborech, každá podmnožina je vlastní rodina s `unicode-range` a v CSS jdou za sebou. `src/styles/fonts.css` je dosadí do aliasů `--f-sans`, `--f-mono` a `--f-serif` z `web.css`.

Náhradní písma (`adjustFontFallback`) next/font negeneruje, používají se ruční z modelu (`web.css`, část 1): `Overpass Fallback` z Arialu zvlášť pro váhy 400, 600 a 700, `Source Serif Fallback` z Georgie (na mobilu `Source Serif Fallback 18`) a `Overpass Mono Fallback` z Courier New. Porovnání 11. 10. 2026 na 9 stránkách modelu v Chrome (výška stránky bez webových písem proti výšce s nimi): s ručními náhradními písmy rozdíl 0-66 px na 1440 px a 0-60 px na 375 px, s `adjustFontFallback` (Arial a Times New Roman, jedno náhradní písmo na rodinu) až 103 px na 1440 px a až 340 px na 375 px. Android Arial, Georgii ani Courier New nemá, tam text po načtení písma poskočit může (ověřit na telefonu, `_PRAVIDLA.md`, část 4).

### Pevné mezery

`czechNbsp(html)` a `czechNbspText(text)` ze `src/lib/typography.ts` doplní pevné mezery podle pravidla R4 z `prototyp/_PRAVIDLA.md`: za jednopísmennými předložkami a spojkami, mezi číslem a jednotkou nebo počítaným slovem, v tisících a telefonu, u dat a v celcích (Key West, St. Augustine, Cessna 182), s výjimkou pro označení za slovem (bodu A, Saturn V). Mění jen druh mezery a jen v textu, nikdy v atributech a značkách. Text článků z databáze se prožene `czechNbsp()` při vykreslení. Statické texty stránek mají pevné mezery rovnou z modelu (`&nbsp;` v JSX). Test: `node scripts/test-typography.mjs`.

### Deník

`src/lib/public-posts.ts` (jen na serveru): `getPublishedPosts()`, `getLatestPublishedPosts(n)`, `getPublishedPostBySlug(slug)`, `getAdjacentPosts(slug)` (`{ newer, older }`) a `getPublishedSlugs()` pro `generateStaticParams`. Jen články se stavem `published`, nejnovější první. Výsledky jsou v cache Next.js (`unstable_cache`) s tagem `PUBLIC_POSTS_TAG`. Po každé změně článku ho administrace zneplatní přes `revalidatePublicPosts()` (`src/lib/posts-cache.ts`, `revalidateTag` s `expire: 0` a obnova cest `/`, `/denik`, `/denik/[slug]`), takže Honza po uložení hned vidí novou verzi. Bez `DATABASE_URL` se stránka s články při buildu nevygeneruje (`connection()`) a `getPublishedSlugs()` vrátí prázdné pole. `content` je HTML vyčištěné při uložení, galerie zastupuje značka `<p data-gallery="ID"></p>`, fotka galerie má volitelné `alt` (`GalleryItem` v `src/lib/db/schema.ts`), chybí-li, platí `caption`.

### Přesměrování

`next.config.ts` načte `src/data/redirects.json` (pole ve tvaru `redirects` z next.config, např. `{ "source": "/", "has": [...], "destination": "/denik/…", "statusCode": 301 }`) při buildu. Zatím je prázdné, naplní ho převod deníku (`../migrace/redirects.vercel.json`).

## Poptávky

Stránka Kontakt má dva formuláře: poptávku „Poptat termín" na tři kroky a krátké „Nechte číslo, Honza zavolá". Oba ukládají do tabulky `inquiries` (sloupec `kind`) přes server actions `submitInquiry` a `submitCallback` v `src/app/(web)/kontakt/actions.ts`. Jsou veřejné, proto bez `requireAdmin()`.

- Pole, volby a chybové hlášky jsou z klikacího modelu (`src/lib/inquiries/schema.ts` a `options.ts`). Pole mají anglické názvy podle sloupců tabulky, formulář v prototypu má české (při převodu přejmenovat). Licence: PPL, CPL/ATPL, Ultralight, Jiná, Nemám.
- Souhlas se zpracováním údajů se nezaškrtává (rozhodnutí 10. 10. 2026 v klikacím modelu): formulář má jen informační větu s odkazem na zásady a validace souhlas nevyžaduje. Sloupce `consent` a `consent_at` zůstávají nevyužité pro případ, že by se zaškrtávátko vrátilo.
- Stav pro `useActionState`: `{ ok, errors, values, formError, token }`. `values` vrací vyplněné hodnoty (při chybě do polí, po odeslání do shrnutí).
- Ochrana proti robotům (`src/lib/inquiries/spam.ts`): skryté pole `website` (vyplněné = tvářit se jako úspěch a nic neuložit), podepsaný čas vykreslení v poli `formToken` (odeslání do 3 s se odmítne, token platí 24 hodin; po vypršení dostane formulář nový token, který platí hned, chybějící nebo podvržený token nový s aktuálním časem) a nejvýš 5 poptávek za hodinu z jedné IP (otisk `sha256(IP + IP_HASH_SALT)`, samotná IP se neukládá).
- Stránka s formulářem musí vytvářet token při každém požadavku (`await connection()` a `createFormToken()`), jinak by v něm zůstal čas buildu. Po chybě formulář použije `state.token`, po vypršení je v něm nový.
- E-maily odcházejí až po odpovědi (`after()`): upozornění na `NOTIFY_TO` s odpovědí rovnou zájemci a potvrzení zájemci. Bez nastaveného Resendu se poptávka uloží a e-mail se jen zaloguje. Do logu jde jen id poptávky.
- Potvrzení zájemci nenese nic, co návštěvník napsal: oslovení je bez jména a kopie údajů má jen volby z nabídky (licence, balíček, počet pilotů, doprovod, odkud o nás ví). Formulář může vyplnit kdokoli s cizí adresou a web by jinak šel zneužít k rozesílání vlastního textu z naší domény.
- Administrace `/admin/poptavky`: filtr podle stavu s počty, detail se všemi poli, změna stavu (archivace je stav), interní poznámka, trvalé smazání po potvrzení.

## Deník

Administrace `/admin/posts`: seznam s hledáním a filtrem podle stavu (`?stav=draft` a `?stav=published`, na ně vedou karty na přehledu), nový článek, úprava, publikace a smazání po potvrzení.

- Tlačítka: koncept má Uložit koncept a Publikovat, publikovaný článek Uložit změny a Vrátit do konceptů. Po uložení konceptu zůstává editor otevřený, po publikaci jde administrace na seznam. Datum publikace se nastaví při první publikaci a po vrácení do konceptů zůstane.
- Server actions v `src/app/admin/(dashboard)/posts/actions.ts` ověří formulář přes zod (`src/lib/post-form.ts`) včetně volné adresy (jen a-z, 0-9 a spojovník), vyčistí text přes `sanitizePostHtml()` a obnoví veřejné stránky přes `revalidatePublicPosts()` pro novou i starou adresu. Publikovat jde jen článek s textem.
- Galerie: článek má libovolný počet galerií (sloupec `gallery`). V textu je zastupuje značka `<p data-gallery="ID"></p>`, v editoru blok „Galerie 2: 5 fotek" (`src/components/admin/GalleryMarker.tsx`). Backspace ani Delete ho nesmažou, odebírá se křížkem v bloku nebo spolu s galerií. Při uložení server zahodí značky galerií, které v článku nejsou, a zdvojené značky. Galerie se číslují podle pořadí v textu.
- Limity: nejvýš 10 galerií po 60 fotkách a text do 500 000 znaků. Formulář posílá galerie i text najednou, proto má server action limit těla 4 MB (`next.config.ts`, Vercel pustí do funkce 4,5 MB).
- Editor: odkaz napsaný bez `https://` (třeba `flyamerica.cz`) dostane `https://` doplněné, adresa se zavináčem `mailto:`. Video z YouTube se ukládá v poměru 16 : 9. Obrázek vložený s textem z jiného webu server odmítne s hláškou, fotky do textu jdou jen přes nahrání (lokálně bez úložiště se adresy nekontrolují).
- Fotky: titulní fotka (s povinným popisem pro nevidomé), fotky v textu a v galeriích jdou přes `/api/admin/upload` do veřejného bucketu `denik`. Prohlížeč fotku před nahráním zmenší na 2560 px a překóduje do JPEG, tím zmizí i EXIF a XMP s GPS polohou. Beze změny (i s případnými metadaty) se nahraje jen malé PNG a GIF. Routa přijme nejvýš 4 MB (Vercel pustí do funkce 4,5 MB), typ pozná podle obsahu souboru a soubor pojmenuje náhodně. Bez `SUPABASE_URL` a `SUPABASE_SERVICE_ROLE_KEY` nahrávání nejde, formulář to oznámí a článek jde uložit bez fotek.
- Úklid úložiště: fotky, které z článku zmizely (vyměněná titulní fotka, odebraná fotka z galerie nebo z textu), a fotky smazaného článku se z bucketu smažou po úspěšném zápisu, pokud je nepoužívá jiný článek. Fotky nahrané do článku, který se nakonec neuložil, v úložišti zůstanou.
- Kategorie: výběr z existujících, novou jde přidat ve formuláři a založí se až s uložením článku.

## Databáze

Schéma je v `src/lib/db/schema.ts`. Po změně schématu:

```bash
npm run db:generate         # vytvoří SQL migraci v drizzle/, k databázi se nepřipojuje
```

Migraci zkontrolovat a commitnout spolu se schématem. Lokální databáze ji aplikuje při dalším `npm run db:local`.

Migrace: `0000_init` (tabulky, enumy, RLS), `0001_login_limit_session_version` (tabulka `login_attempts` a sloupec `admin_users.session_version`).

Všechny tabulky mají zapnuté RLS bez politik (`.enableRLS()`): Supabase vystavuje schéma `public` přes API s veřejným klíčem a bez RLS by k datům mohl kdokoli. Aplikace jezdí jako vlastník tabulek a RLS ji neomezuje. Každá nová tabulka musí `.enableRLS()` mít taky.

## Bezpečnost administrace

- Layout administrace i každá její stránka volají `requireAdminPage()`, každá server action a API routa administrace `requireAdmin()`. Server actions jsou veřejné endpointy a layout je nechrání. Hlídá to ESLint pravidlo `local/require-admin`.
- Akce volané z formulářů (článek, stav a poznámka poptávky) a nahrávání fotek volají `requireAdmin().catch(signedOutAsNull)`. Při vypršelém přihlášení vrátí hlášku „Přihlášení vypršelo..." a rozepsaný text ve formuláři zůstane. Jiná chyba (třeba výpadek databáze) se jako vypršelé přihlášení nehlásí.
- Kontrola ověřuje i to, že účet v `admin_users` pořád existuje a že přihlášení nese aktuální `session_version`. Smazaný účet tak přestane fungovat hned a změna hesla přes `scripts/create-admin.mjs` odhlásí všechna zařízení přihlášená starým heslem.
- Přihlášení: po 10 neúspěšných pokusech z jedné IP (otisk jako u poptávek) se přihlášení z ní na 15 minut zablokuje, ještě před ověřením hesla. Úspěšné přihlášení pokusy té IP vynuluje. Limit se počítá podle IP, ne podle e-mailu, aby nikdo nemohl zablokovat Honzův účet. Špatné heslo jde do logu jako jeden řádek bez e-mailu.
- HTML článků se před uložením čistí přes `sanitizePostHtml()`.

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

1. Supabase: založit projekt a v Storage veřejný bucket `denik`.
2. Migrace na Supabase z lokálního počítače, s connection stringem pro přímé spojení nebo session pooler:
   ```bash
   DATABASE_URL="postgres://..." npx drizzle-kit migrate
   ```
   Drizzle si aplikované migrace pamatuje v tabulce `drizzle.__drizzle_migrations`. Migrace proto nespouštět ručně v SQL editoru, jinak by je `drizzle-kit migrate` zkusil spustit znovu.
3. Založit admina (viz výše).
4. Vercel: připojit repozitář, nastavit proměnné prostředí z tabulky výše. `AUTH_SECRET` vygenerovat např. `openssl rand -base64 32`. Pro `DATABASE_URL` aplikace použít pooler Supabase, kód počítá s `prepare: false`.
5. Písma jsou v repozitáři (`src/fonts`), build ani prohlížeč nic z Google Fonts nestahují.
