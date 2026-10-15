/**
 * e2e testy oblasti Z cest: seznam, článek s galerií a zvětšení fotky,
 * články ze starého webu (import), galerie v náhledech, obsah článku na
 * tabletu, článek bez titulní fotky, rok cesty a dlouhá adresa v textu
 * (úpravy 6, 12, 33, 34, 37 z auditu 13. 10. 2026). Fakta „V kostce“ na Váš
 * mentor (15. 10. 2026, stejné čtecí rozložení jako články).
 */
import { BASE_URL, assert, database, fetchManual, login, plainText, resizeAndSettle, test } from "./_lib.mjs";

/** Fotka v otevřeném zvětšení: bod mimo vykreslenou fotku (object-fit: contain) a její střed. */
function lightboxPoints(page) {
  return page.evaluate(() => {
    const img = document.querySelector("dialog[open] img");
    if (!img || !img.naturalWidth) return null;
    const box = img.getBoundingClientRect();
    const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const left = box.left + (box.width - w) / 2;
    const top = box.top + (box.height - h) / 2;
    const outside =
      left - box.left > 20
        ? { x: box.left + 10, y: box.top + box.height / 2 }
        : top - box.top > 20
          ? { x: box.left + box.width / 2, y: box.top + 10 }
          : null;
    return { outside, center: { x: left + w / 2, y: top + h / 2 } };
  });
}

test(
  "Z cest: seznam, článek s galerií a zvětšení fotky",
  async (page, credentials) => {
    const sql = database(credentials);
    let posts;
    try {
      posts = await sql`
        select slug, status, jsonb_array_length(gallery) as galleries from posts
        order by published_at desc nulls last`;
    } finally {
      await sql.end();
    }
    const published = posts.filter((post) => post.status === "published");
    const draft = posts.find((post) => post.status === "draft");

    // Seznam: všechny publikované články, koncepty ne.
    await page.goto(`${BASE_URL}/z-cest`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    for (const post of published) {
      assert((await page.locator(`main a[href="/z-cest/${post.slug}"]`).count()) > 0, `V Z cest chybí ${post.slug}.`);
    }
    if (draft) {
      assert((await page.locator(`a[href="/z-cest/${draft.slug}"]`).count()) === 0, "Z cest ukazuje koncept.");
      const res = await fetchManual(`/z-cest/${draft.slug}`);
      assert(res.status === 404, `Koncept vrátil ${res.status}.`);
    }

    // Článek s galerií: přednostně importovaný článek 2017 (fotky z 127.0.0.1:8816).
    const withGallery =
      published.find((post) => post.slug === "druhy-prelet-atlantiku-2017") ??
      published.find((post) => post.galleries > 0);
    assert(withGallery, "V databázi není publikovaný článek s galerií.");
    await page.goto(`${BASE_URL}/z-cest/${withGallery.slug}`);
    const thumbs = page.locator(".gallery a[data-photo]");
    const count = await thumbs.count();
    assert(count > 0, "Článek nemá fotky v galerii.");

    // Zvětšení: šipka listuje, Escape zavře a vrátí fokus na poslední fotku.
    await thumbs.first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert((await dialog.getAttribute("aria-label")) === `Fotka 1 z ${count}`, "Zvětšení neukazuje první fotku.");
    if (count > 1) {
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(
        (label) => document.querySelector("dialog[open]")?.getAttribute("aria-label") === label,
        `Fotka 2 z ${count}`,
      );
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    // Fokus vrací komponenta až v události close, ta přijde chvíli po zavření.
    const expected = count > 1 ? "1" : "0";
    await page
      .waitForFunction((photo) => document.activeElement?.getAttribute("data-photo") === photo, expected, { timeout: 3_000 })
      .catch(() => {});
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-photo"));
    assert(focused === expected, `Fokus po zavření: fotka ${focused}.`);

    // Klik na fotku zvětšení nezavře, klik na tmavý okraj vedle ní ano.
    await thumbs.first().click();
    await dialog.waitFor();
    await page.waitForFunction(() => document.querySelector("dialog[open] img")?.complete);
    const points = await lightboxPoints(page);
    assert(points, "Zvětšená fotka se nenačetla.");
    await page.mouse.click(points.center.x, points.center.y);
    assert(await dialog.isVisible(), "Klik na fotku zvětšení zavřel.");
    if (points.outside) {
      await page.mouse.click(points.outside.x, points.outside.y);
      await dialog.waitFor({ state: "hidden" });
    } else {
      await page.keyboard.press("Escape");
    }
  },
  { viewport: { width: 1440, height: 900 } },
);

test(
  "Z cest: články ze starého webu (import)",
  async (page) => {
    const exists = (await fetchManual("/z-cest/druhy-prelet-atlantiku-2017")).status === 200;
    if (!exists) {
      console.log("         (přeskočeno: lokální databáze je bez importu deníku)");
      return;
    }

    // Článek 2017: podtitul v záhlaví, celý první odstavec, kapitoly h2,
    // video jako náhled přes náš server (bez kliknutí žádný požadavek na
    // YouTube a Google), přehrávač youtube-nocookie až po kliknutí.
    const thirdParty = [];
    page.on("request", (request) => {
      const host = new URL(request.url()).hostname;
      if (/youtube|ytimg|google|gstatic|doubleclick/.test(host)) thirdParty.push(host);
    });
    await page.goto(`${BASE_URL}/z-cest/druhy-prelet-atlantiku-2017`);
    await page.waitForLoadState("networkidle");
    const perex = await page.locator(".page-head .perex").innerText();
    assert(perex.startsWith("Přelet nového letadla Cirrus SR-22"), `Perex v záhlaví: "${perex}"`);
    const first = await page.locator(".prose > p").first().innerText();
    assert(first.startsWith("Koncem října 2017"), `Text začíná: "${first.slice(0, 60)}"`);
    const chapters = await page.locator(".prose > h2").allInnerTexts();
    assert(chapters.length === 5 && chapters[0].startsWith("Den"), `Kapitoly h2: ${JSON.stringify(chapters)}`);
    assert((await page.locator(".prose h3").count()) === 0, "Článek 2017 má pořád nadpisy h3.");
    const video = await page.getByRole("link", { name: "Video na YouTube" }).getAttribute("href");
    assert(video === "https://youtu.be/_m30zuQyxMI", `Odkaz na video: ${video}`);
    assert((await page.locator("iframe").count()) === 0, "Stránka vkládá iframe.");
    assert(thirdParty.length === 0, `Požadavky na cizí servery: ${[...new Set(thirdParty)].join(", ")}`);
    // Náhled v největší velikosti, kterou video má (1280 x 720), přes /_next/image.
    const play = page.getByRole("button", { name: "Přehrát video" });
    const thumb = (await play.locator("img").getAttribute("src")) ?? "";
    assert(
      thumb.includes("/_next/image?url=") && thumb.includes("maxresdefault"),
      `Náhled videa: ${thumb}`,
    );
    await play.click();
    const player = page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/_m30zuQyxMI"]');
    await player.waitFor({ state: "attached" });
    assert(
      await player.evaluate((frame) => document.activeElement === frame),
      "Po kliknutí na Přehrát video není fokus v přehrávači.",
    );
    // Obsah s 5 položkami se vejde, posuvník nemá.
    const toc2017 = await page.locator(".dn-toc").evaluate((el) => el.scrollHeight - el.clientHeight);
    assert(toc2017 <= 0, `Obsah článku 2017 se posouvá (${toc2017} px).`);

    // Oblet Ameriky: obsah se 17 dny je vyšší než obrazovka, posouvá se sám
    // a poslední den jde otevřít hned na začátku čtení.
    await page.goto(`${BASE_URL}/z-cest/oblet-ameriky-2016`);
    const toc = page.locator(".dn-toc");
    await toc.locator("li").last().waitFor();
    await page.locator(".prose > h2").first().scrollIntoViewIfNeeded();
    await toc.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const last = await toc.locator("li a").last().boundingBox();
    assert(last && last.y + last.height <= 900, `Poslední den obsahu je mimo obrazovku (y ${last?.y}).`);
    await toc.locator("li a").last().click();
    await page.waitForURL(/#den-17/);
  },
  { viewport: { width: 1440, height: 900 } },
);

/** Počet sloupců mřížky (grid-template-columns ve px). */
const gridColumns = (locator) =>
  locator.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length);

test(
  "Z cest: galerie článku jako náhledy bez popisků, popisek ve zvětšení",
  async (page, credentials) => {
    const slug = "druhy-prelet-atlantiku-2017";
    if ((await fetchManual(`/z-cest/${slug}`)).status !== 200) {
      console.log("         (přeskočeno: lokální databáze je bez importu deníku)");
      return;
    }
    const sql = database(credentials);
    let firstItem;
    try {
      [firstItem] = await sql`
        select g -> 'items' -> 0 ->> 'caption' as caption, g -> 'items' -> 0 ->> 'alt' as alt
        from posts, jsonb_array_elements(gallery) with ordinality as t(g, n)
        where slug = ${slug} order by n limit 1`;
    } finally {
      await sql.end();
    }

    await page.goto(`${BASE_URL}/z-cest/${slug}`);
    const grid = page.locator("#fotky .gallery").first();
    await grid.waitFor();
    assert((await page.locator(".gallery figcaption").count()) === 0, "Galerie článku má popisky pod fotkami.");
    assert(await grid.evaluate((el) => el.classList.contains("gallery--nahledy")), "Galerie článku je bez třídy gallery--nahledy.");

    // Telefon 2 sloupce náhledů 4 : 3, tablet 3, počítač 4.
    for (const [width, height, columns] of [[375, 812, 2], [768, 1024, 3], [1440, 900, 4]]) {
      await page.setViewportSize({ width, height });
      const got = await gridColumns(grid);
      assert(got === columns, `Galerie na ${width} px má ${got} sloupců, čeká se ${columns}.`);
      const box = await grid.locator("img").first().boundingBox();
      assert(box && Math.abs(box.width / box.height - 4 / 3) < 0.02, `Náhled na ${width} px není 4 : 3 (${box?.width} x ${box?.height}).`);
    }

    // Popisek zůstává ve zvětšení fotky a v alt (fotky 2017 mají jen popisek).
    const caption = (firstItem?.caption ?? "").trim();
    assert(caption, "První fotka galerie 2017 nemá v databázi popisek.");
    const thumb = grid.locator("a[data-photo]").first();
    const alt = await thumb.locator("img").getAttribute("alt");
    assert(alt === ((firstItem.alt ?? "").trim() || caption), `alt první fotky: "${alt}"`);
    await page.setViewportSize({ width: 375, height: 812 });
    await thumb.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    // Ve zvětšení je popisek s českou typografií (uvozovky, pevné mezery, czechNbspText): porovnává se začátek bez ní.
    const plain = (text) => text.replace(/\u2060/g, "").replace(/[„“”"]/g, '"').replace(/\s+/g, " ").trim().slice(0, 40);
    const shown = (await plainText(dialog.locator("p[aria-live]"))).replace(/^Fotka 1 z \d+\.\s*/, "");
    assert(plain(shown) === plain(caption), `Popisek ve zvětšení: "${shown.slice(0, 80)}"`);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });

    // Galerie na Váš mentor zůstává beze změny (s popisky, bez náhledů).
    await page.goto(`${BASE_URL}/vas-mentor`);
    await page.locator(".gallery").first().waitFor();
    assert((await page.locator(".gallery--nahledy").count()) === 0, "Galerie na Váš mentor má náhledy článku.");
  },
  { viewport: { width: 375, height: 812 } },
);

test(
  "Z cest: obsah článku na tabletu zavřený už v HTML, bez posunu",
  async (page) => {
    const slug = "druhy-prelet-atlantiku-2017";
    if ((await fetchManual(`/z-cest/${slug}`)).status !== 200) {
      console.log("         (přeskočeno: lokální databáze je bez importu deníku)");
      return;
    }
    // HTML ze serveru: <details> bez open, sbalení skriptem tak nic neposune.
    const html = await (await fetch(`${BASE_URL}/z-cest/${slug}`)).text();
    const details = /<nav class="dn-toc[^>]*>\s*<details([^>]*)>/.exec(html);
    assert(details, "Obsah článku chybí v HTML.");
    assert(!/\bopen\b/.test(details[1]), `Obsah článku je v HTML otevřený (<details${details[1]}>).`);

    // 768 x 1024: obsah zavřený, žádný posun obsahu (layout-shift) po načtení.
    await page.addInitScript(() => {
      window.__shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(`${BASE_URL}/z-cest/${slug}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const toc = page.locator(".dn-toc details");
    assert(!(await toc.evaluate((el) => el.open)), "Obsah článku je na 768 px otevřený.");
    const shift = await page.evaluate(() => window.__shift);
    assert(shift < 0.01, `Stránka článku na 768 px poskočila (CLS ${shift.toFixed(3)}).`);
    // Na tabletu se obsah rozbalí klikem na souhrn.
    await page.locator(".dn-toc summary").click();
    assert(await toc.evaluate((el) => el.open), "Obsah článku se na 768 px klikem nerozbalil.");

    // Od 1200 px v okraji otevřený, souhrn mimo Tab a skrytý čtečce (nález 19).
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await page.waitForFunction(() => document.querySelector(".dn-toc details")?.open === true);
    const summary = await page.locator(".dn-toc summary").evaluate((el) => ({
      tab: el.tabIndex,
      hidden: el.getAttribute("aria-hidden"),
    }));
    assert(summary.tab === -1 && summary.hidden === "true", `Souhrn obsahu v okraji: ${JSON.stringify(summary)}`);
  },
  { viewport: { width: 768, height: 1024 } },
);

/** Rok cesty jako postYear() ze src/lib/post-year.ts: rok cesty, rok ze štítku titulku, rok publikace. */
function expectedYear(post) {
  if (post.trip_year) return String(post.trip_year);
  const label = /\s+\|\s+[^|]*?(\d{4})\s*$/u.exec(post.title);
  return label ? label[1] : post.pub_year;
}

/** Datum k článku jako postDateLabel(): „vydáno“, když se rok cesty liší od roku publikace. */
const expectedDateLabel = (post) => `${expectedYear(post) === post.pub_year ? "" : "vydáno "}${post.pub_date}`;

/** Publikované články v pořadí webu (src/lib/public-posts.ts) s rokem a datem publikace v pražském čase. */
const publishedPosts = (sql) => sql`
  select slug, title, trip_year, image_url,
    to_char(coalesce(published_at, created_at) at time zone 'Europe/Prague', 'YYYY') as pub_year,
    to_char(coalesce(published_at, created_at) at time zone 'Europe/Prague', 'FMDD. FMMM. YYYY') as pub_date
  from posts where status = 'published'
  order by coalesce(published_at, created_at) desc, created_at desc`;

/** Dlouhá adresa bez místa k zalomení (doména example.com je vyhrazená pro příklady). */
const LONG_URL =
  "https://www.example.com/licenses_certificates/airmen_certification/foreign_license_verification/verification-of-authenticity-of-foreign-license-rating-and-medical-certification";

test(
  "Z cest: článek bez fotky, rok cesty a dlouhá adresa v textu",
  async (page, credentials) => {
    const sql = database(credentials);
    const stamp = Date.now().toString(36);
    const slug = `e2e-dlouha-adresa-${stamp}`;
    const trip2022 = "po-vynucene-pauze-opet-v-usa-2022";
    let original2022;
    let postId;
    try {
      // Článek 2022 vyšel 19. 11. 2023, rok cesty se nastavuje v administraci.
      // Test ho nastaví v databázi a na konci vrátí původní hodnotu.
      [original2022] = await sql`select trip_year from posts where slug = ${trip2022} and status = 'published'`;
      if (original2022) await sql`update posts set trip_year = 2022 where slug = ${trip2022}`;

      // Testovací článek bez titulní fotky s dlouhou adresou v textu. Do
      // databáze jako koncept, publikuje ho administrace: ta zneplatní
      // cache veřejného webu (revalidatePublicPosts), i pro rok cesty 2022.
      [{ id: postId }] = await sql`
        insert into posts (slug, title, perex, content, status)
        values (${slug}, ${`E2E dlouhá adresa ${stamp}`}, ${"Testovací článek bez titulní fotky."},
          ${`<p>Ověření licence: <a href="${LONG_URL}">${LONG_URL}</a></p><p>Druhý odstavec testovacího článku.</p>`},
          'draft')
        returning id`;
      await login(page, credentials);
      await page.goto(`${BASE_URL}/admin/posts/${postId}/edit`);
      // Editor se vykreslí až po hydrataci, do té doby by formulář poslal prázdný text.
      await page.getByRole("textbox", { name: "Text článku" }).locator("a").waitFor();
      await page.getByRole("button", { name: "Publikovat" }).click();
      await page.waitForURL((url) => !url.pathname.endsWith("/edit"), { timeout: 30_000 });
      const [state] = await sql`select status from posts where id = ${postId}`;
      assert(state?.status === "published", `Testovací článek se nepublikoval (${state?.status}).`);

      const posts = await publishedPosts(sql);
      assert(posts[0]?.slug === slug, `Nejnovější článek je ${posts[0]?.slug}, ne testovací.`);

      // /z-cest: nejnovější článek bez fotky v jednom sloupci, ne vedle prázdného místa.
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE_URL}/z-cest`);
      const lead = page.locator(".dn-lead").first();
      await lead.waitFor();
      assert((await lead.locator(`a[href="/z-cest/${slug}"]`).count()) === 1, "Nejnovější článek na /z-cest není testovací.");
      assert((await lead.locator("figure").count()) === 0, "Článek bez fotky má na /z-cest fotku.");
      assert((await gridColumns(lead)) === 1, "Článek bez fotky je na /z-cest ve sloupci vedle prázdného místa.");
      // Karty: datum publikace, u jiného roku cesty „vydáno“ (článek 2022: „vydáno 19. 11. 2023“).
      for (const post of posts.slice(1)) {
        const date = page.locator(`.dn-post:has(a[href="/z-cest/${post.slug}"]) .dn-post-meta time`);
        if ((await date.count()) === 0) continue;
        const text = await plainText(date);
        assert(text === expectedDateLabel(post), `Datum karty ${post.slug}: "${text}", čeká se "${expectedDateLabel(post)}".`);
      }
      if (original2022) {
        const card = await plainText(page.locator(`.dn-post:has(a[href="/z-cest/${trip2022}"]) time`));
        assert(card === "vydáno 19. 11. 2023", `Karta článku 2022: "${card}"`);
      }

      // Testovací článek: záhlaví bez fotky a s rozumnou mezerou k textu.
      await page.goto(`${BASE_URL}/z-cest/${slug}`);
      await page.locator(".prose a").first().waitFor();
      assert((await page.locator(".page-photo").count()) === 0, "Článek bez fotky má .page-photo.");
      const gap = await page.evaluate(() => {
        const by = document.querySelector(".dn-by").getBoundingClientRect();
        const text = document.querySelector(".prose").getBoundingClientRect();
        return Math.round(text.top - by.bottom);
      });
      assert(gap >= 32 && gap <= 96, `Mezera mezi záhlavím a textem článku bez fotky: ${gap} px.`);
      // Pod článkem starší článek: bez fotky (článek 2025) jako jeden sloupec textu.
      const older = posts[1];
      if (older && !older.image_url) {
        const teaser = page.locator(".dn-lead");
        assert((await teaser.locator(`a[href="/z-cest/${older.slug}"]`).count()) > 0, `Pod článkem chybí ${older.slug}.`);
        assert((await gridColumns(teaser)) === 1, "Starší článek bez fotky je pod článkem ve sloupci vedle prázdného místa.");
        const year = await plainText(teaser.locator(".meta time"));
        assert(year === expectedYear(older), `Rok staršího článku pod článkem: "${year}"`);
      }

      // Dlouhá adresa se na 320 px zalomí, stránka nepřeteče do strany.
      await page.setViewportSize({ width: 320, height: 640 });
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        link: Math.round(document.querySelector(".prose a").getBoundingClientRect().right - document.documentElement.clientWidth),
      }));
      assert(overflow.page <= 0 && overflow.link <= 0, `Dlouhá adresa na 320 px přetéká: ${JSON.stringify(overflow)}`);
      await page.setViewportSize({ width: 1440, height: 900 });

      if (original2022) {
        // Záhlaví článku 2022: datum publikace s „vydáno“, <time> dál s datem publikace.
        await page.goto(`${BASE_URL}/z-cest/${trip2022}`);
        const head = page.locator(".dn-by time");
        assert((await plainText(head)) === "vydáno 19. 11. 2023", `Záhlaví článku 2022: "${await plainText(head)}"`);
        assert((await head.getAttribute("datetime")) === "2023-11-19", "Záhlaví článku 2022 má jiné datetime.");

        // Kde je jen rok, je rok cesty: blok pod novějším článkem a odkaz Novější článek pod starším.
        const index = posts.findIndex((post) => post.slug === trip2022);
        const newer = posts[index - 1];
        const olderPost = posts[index + 1];
        if (newer) {
          await page.goto(`${BASE_URL}/z-cest/${newer.slug}`);
          const teaser = page.locator(`.dn-lead:has(a[href="/z-cest/${trip2022}"])`);
          const year = await plainText(teaser.locator(".meta time"));
          assert(year === "2022", `Rok článku 2022 pod článkem ${newer.slug}: "${year}"`);
        }
        if (olderPost && posts[index + 2]) {
          await page.goto(`${BASE_URL}/z-cest/${olderPost.slug}`);
          const link = await plainText(page.locator(`.diary-older a[href="/z-cest/${trip2022}"]`));
          assert(link.endsWith(", 2022"), `Odkaz Novější článek pod ${olderPost.slug}: "${link}"`);
        }

        // Úvod ukazuje jen nejnovější články. Když je mezi nimi článek 2022, má rok cesty.
        await page.goto(`${BASE_URL}/`);
        const home = page.locator(`#z-cest a[href="/z-cest/${trip2022}"]`);
        if ((await home.count()) > 0) {
          const text = await plainText(page.locator("#z-cest"));
          assert(/2022/.test(text), "Článek 2022 je na úvodu bez roku 2022.");
        } else {
          console.log("         (úvod: článek 2022 mezi nejnovějšími není, rok cesty ověřen na /z-cest a pod články)");
        }
      }

      // Váš mentor: přelety s rokem cesty, vedlejší nadpisy ve velikosti headline-md, O mně větší.
      await page.goto(`${BASE_URL}/vas-mentor`);
      for (const post of posts.filter((p) => ["dalsi-prelet-oceanu-2025", "druhy-prelet-atlantiku-2017"].includes(p.slug))) {
        const year = await plainText(page.locator(`.honza-clanky li:has(a[href="/z-cest/${post.slug}"]) time`));
        assert(year === expectedYear(post), `Rok přeletu ${post.slug} na Váš mentor: "${year}"`);
      }
      const sizes = await page.evaluate(() =>
        ["#foto-nadpis", "#denik-nadpis", "#omne-nadpis"].map((id) => getComputedStyle(document.querySelector(id)).fontSize),
      );
      assert(sizes[0] === "34px" && sizes[1] === "34px", `Vedlejší nadpisy na Váš mentor: ${sizes.join(", ")}`);
      // Hlavní text „O mně“ má větší nadpis než vedlejší sekce (úprava 40, DESIGN.md Hierarchy).
      assert(sizes[2] === "44px", `Nadpis O mně na Váš mentor: ${sizes[2]}, čekáno 44px (Headline).`);
    } finally {
      try {
        if (original2022) await sql`update posts set trip_year = ${original2022.trip_year} where slug = ${trip2022}`;
        // Smazání v administraci zneplatní cache webu i pro vrácený rok cesty.
        if (postId) {
          const deleted = await page
            .goto(`${BASE_URL}/admin/posts/${postId}/edit`)
            .then(async () => {
              await page.getByRole("button", { name: "Smazat článek" }).click({ timeout: 10_000 });
              await page.getByRole("dialog").getByRole("button", { name: "Smazat", exact: true }).click({ timeout: 10_000 });
              await page.waitForURL((url) => !url.pathname.endsWith("/edit"), { timeout: 30_000 });
              return true;
            })
            .catch(() => false);
          const [left] = await sql`delete from posts where id = ${postId} returning id`;
          if (!deleted || left) console.log("         (testovací článek smazán jen v databázi, cache webu může být do další změny článku stará)");
        }
      } finally {
        await sql.end();
      }
    }
  },
  { viewport: { width: 1440, height: 900 } },
);


/**
 * Váš mentor: fakta „V kostce“ u Honzova textu O mně (podnět Radka 15. 10. 2026,
 * MENTOR_FACTS ve vas-mentor/page.tsx, article.css). Seznam dt/dd v pořadí
 * údajů, žádné „instruktor“ ani „výcvik“, kvalifikace zvýrazněná (Overpass 600
 * 18 px). Od 1200 px v pravém okraji v řádku s nadpisem O mně, na vysokém okně
 * přilepený celý pod hlavičkou, na nízkém stojí. Pod 1200 px panel nad textem,
 * na telefonu roky vedle sebe s linkou nad nimi přes celou šířku panelu.
 * Velikost okna mění resizeAndSettle (_lib.mjs): hned po page.setViewportSize
 * má hlavička chvíli rozměry staršího loga a stránka by na 375 px přetékala.
 */
test(
  "Váš mentor: fakta V kostce u textu O mně",
  async (page) => {
    await page.goto(`${BASE_URL}/vas-mentor`);
    const facts = page.getByRole("complementary", { name: "V kostce" });
    await facts.waitFor();
    const labels = (await facts.locator("dt").allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim().toLowerCase());
    const expected = ["celkový nálet", "létá od", "profesně od", "kvalifikace", "doložky eu i usa", "zkušenosti", "přelety a dodávky"];
    assert(JSON.stringify(labels) === JSON.stringify(expected), `Údaje V kostce: ${labels.join(", ")}`);
    const text = await plainText(facts);
    assert(text.includes("přes 6 000 hodin"), `Nálet ve V kostce: "${text.slice(0, 120)}"`);
    assert(!/instrukt|výcvik/i.test(text), "Ve V kostce je „instruktor“ nebo „výcvik“, Honza je v našich textech mentor.");
    // Kvalifikace zvýrazněná: Overpass 600 18 px, ostatní textové údaje běžným písmem.
    const qualification = await facts.locator(".mentor-facts-strong").evaluateAll((els) =>
      els.map((el) => ({ text: el.textContent.replace(/\s+/g, " ").trim(), weight: getComputedStyle(el).fontWeight, size: getComputedStyle(el).fontSize })),
    );
    assert(
      qualification.length === 1 && qualification[0].text === "Obchodní pilot" && qualification[0].weight === "600" && qualification[0].size === "18px",
      `Kvalifikace ve V kostce není zvýrazněná: ${JSON.stringify(qualification)}`,
    );

    const layout = () =>
      page.evaluate(() => {
        const box = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
        const pairs = [...document.querySelectorAll(".mentor-facts-pair")].map((el) => ({
          ...el.getBoundingClientRect().toJSON(),
          border: parseFloat(getComputedStyle(el).borderTopWidth),
        }));
        const years = [...document.querySelectorAll(".mentor-facts-pair .mentor-facts-num")].map((el) => el.getBoundingClientRect().toJSON());
        return {
          facts: box(".mentor-facts"),
          list: box(".mentor-facts .dest-data"),
          years,
          prose: box(".read-body--facts > .prose"),
          heading: box("#omne-nadpis"),
          pairs,
          position: getComputedStyle(document.querySelector(".mentor-facts")).position,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

    // 1440 x 900: pravý okraj, horní hrana s nadpisem O mně, přilepený blok celý pod hlavičkou.
    let box = await layout();
    assert(box.facts.left >= box.prose.right + 39, `V kostce na 1440 px není vpravo vedle textu: ${JSON.stringify(box.facts)}`);
    assert(Math.abs(box.facts.top - box.heading.top) <= 2, `V kostce na 1440 px nezačíná u nadpisu O mně (${box.facts.top} / ${box.heading.top}).`);
    assert(box.position === "sticky", `V kostce na 1440 x 900: position ${box.position}`);
    // Nadpis O mně k hornímu okraji okna: blok je přilepený pod hlavičkou.
    await page.evaluate(() => {
      const heading = document.querySelector("#omne-nadpis");
      window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
    });
    await page.waitForTimeout(200);
    box = await layout();
    const viewport = page.viewportSize();
    assert(box.facts.top >= 100 && box.facts.top <= 108, `Blok V kostce na 1440 x 900 není přilepený pod hlavičkou (${box.facts.top}).`);
    assert(box.facts.bottom <= viewport.height, `Přilepený blok V kostce na 1440 x 900 končí pod oknem (${box.facts.bottom}).`);

    // 1440 x 800: blok stojí (celý by se pod hlavičku nevešel).
    await resizeAndSettle(page, { width: 1440, height: 800 });
    box = await layout();
    assert(box.position === "static", `V kostce na 1440 x 800: position ${box.position}`);

    // 1024: bílý panel ve sloupci textu nad nadpisem O mně.
    await resizeAndSettle(page, { width: 1024, height: 768 });
    box = await layout();
    assert(box.facts.bottom <= box.heading.top && Math.round(box.facts.width) === Math.round(box.prose.width), `V kostce na 1024 px: ${JSON.stringify(box.facts)}`);

    // 375 a 320: panel nad textem, roky vedle sebe, linka nad nimi vcelku přes šířku panelu, nic nepřetéká.
    for (const width of [375, 320]) {
      await resizeAndSettle(page, { width, height: 812 });
      box = await layout();
      assert(box.facts.bottom <= box.heading.top, `V kostce na ${width} px není nad textem.`);
      const [first, second] = box.pairs;
      assert(
        box.pairs.length === 2 && Math.abs(first.top - second.top) < 1 && box.years[1].left >= box.years[0].right + 16,
        `Roky na ${width} px nejsou vedle sebe.`,
      );
      // Buňky roků na sebe navazují a vyplní celou šířku seznamu, jejich horní linky jsou tak jedna linka.
      assert(
        first.border > 0 && second.border > 0 && Math.abs(first.left - box.list.left) < 1 &&
          Math.abs(second.left - first.right) < 1 && Math.abs(second.right - box.list.right) < 1,
        `Linka nad roky na ${width} px nevede přes celou šířku panelu: ${JSON.stringify({ list: box.list, pairs: box.pairs })}`,
      );
      assert(box.overflow <= 0, `Váš mentor na ${width} px přetéká o ${box.overflow} px.`);
    }
  },
  { viewport: { width: 1440, height: 900 } },
);
