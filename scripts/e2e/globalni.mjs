/**
 * e2e testy globálních prvků webu: bezpečnostní hlavičky, menu
 * a aria-current, patička se sídlem a spisovou značkou, přetékání stránek
 * na telefonu (do 14. 10. 2026 část testu „veřejný web: úvod, výlet
 * a stránky na telefonu“, druhá část je v uvod-vylety.mjs), mobilní menu
 * na nízkém okně, barva výběru textu, zásady, web bez značek [doplnit],
 * indexace, hlavičky cache, 404 a přesměrování starých adres.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { BASE_URL, PUBLIC_PAGES, ROOT, assert, database, fetchManual, overflowX, part, plainText, test } from "./_lib.mjs";

/** Destinace z src/data/destinations.ts (testy mají vlastní kopii, stejně jako PUBLIC_PAGES). */
const DESTINATION_SLUGS = [
  "fa83",
  "cedar-key",
  "albert-whitted",
  "vero-beach",
  "palatka",
  "kissimmee",
  "merritt-island",
  "key-west-everglades",
];

/** Barvy z fa-tokeny.css, jak je vrací getComputedStyle. */
const GRAFIT = "rgb(29, 37, 45)";
const PAPIR = "rgb(245, 242, 236)";
const ZLUTA = "rgb(241, 190, 72)";
const PRIVACY = "/zasady-zpracovani-osobnich-udaju";

test("globální prvky: hlavičky, menu, patička a stránky na telefonu", async (page) => {
  const response = await page.goto(`${BASE_URL}/`);
  assert(response?.status() === 200, `Úvod vrátil ${response?.status()}.`);
  // Bezpečnostní hlavičky z next.config.ts, bez X-Powered-By.
  const headers = response.headers();
  assert(headers["x-frame-options"] === "DENY", `X-Frame-Options: ${headers["x-frame-options"]}`);
  assert(headers["x-content-type-options"] === "nosniff", "Chybí X-Content-Type-Options.");
  assert(!("x-powered-by" in headers), "Odpověď prozrazuje X-Powered-By.");

  // Menu: Letecké výlety, Kam letět, Z cest, Váš mentor, Kontakt. Na detailu
  // výletu je položka sekce aktivní (aria-current="true"), na stránce sekce "page".
  const menu = page.getByRole("navigation", { name: "Hlavní menu" });
  const labels = (await menu.getByRole("link").allInnerTexts()).map((label) => label.trim());
  assert(
    JSON.stringify(labels) === JSON.stringify(["Letecké výlety", "Kam letět", "Z cest", "Váš mentor", "Kontakt"]),
    `Menu: ${JSON.stringify(labels)}`,
  );

  // Sídlo provozovatele v patičce (13. 10. 2026) a pod ním spisová značka (úprava 7, 14. 10. 2026).
  const footer = await plainText(page.locator("footer.ftr"));
  assert(footer.includes("IČO 03725235 Mezibranská 375, Kutná Hora 284 01"), "Patička nemá sídlo provozovatele.");
  assert(
    footer.includes("Kutná Hora 284 01 Spisová značka C 236725, Městský soud v Praze"),
    "Patička nemá pod sídlem spisovou značku.",
  );

  await page.goto(`${BASE_URL}/z-cest`);
  assert((await menu.getByRole("link", { name: "Z cest" }).getAttribute("aria-current")) === "page", "Z cest v menu není aktivní.");

  await page.goto(`${BASE_URL}/letecke-vylety/florida-week`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert(
    (await menu.getByRole("link", { name: "Letecké výlety" }).getAttribute("aria-current")) === "true",
    "Letecké výlety v menu nejsou na detailu výletu aktivní.",
  );

  // Žádná stránka nepřetéká do strany na šířce telefonu.
  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of PUBLIC_PAGES) {
    const res = await page.goto(`${BASE_URL}${url}`);
    assert(res?.status() === 200, `${url} vrátila ${res?.status()}.`);
    const px = await overflowX(page);
    assert(px <= 0, `${url} na 375 px přetéká o ${px} px.`);
  }
});

/**
 * Mobilní menu na telefonu otočeném na šířku (úprava 26): menu se vejde do
 * okna pod lištou a posouvá se samo, Tab dojede na Poptat termín a posune
 * ho do okna, stránka pod menu stojí. Zvětšení 400 % (320 x 256) zkouší
 * stejné pravidlo, ověřené ručně spolu s 812 x 375.
 */
test(
  "mobilní menu na nízkém okně: Poptat termín jde dojet",
  async (page) => {
    await page.goto(`${BASE_URL}/letecke-vylety`);
    const button = page.getByRole("button", { name: "Menu" });
    await button.click();
    const menu = page.locator("#mobilni-menu");
    await menu.waitFor();
    const box = await menu.evaluate((el) => ({
      bottom: el.getBoundingClientRect().bottom,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    assert(box.bottom <= 340 + 0.5, `Menu končí na ${box.bottom} px, pod oknem 340 px.`);
    assert(box.scrollHeight > box.clientHeight, "Menu je na 844 x 340 celé vidět, test nic neověří.");

    // Tab z tlačítka Menu přes položky až na Poptat termín v menu.
    const cta = menu.getByRole("link", { name: "Poptat termín" });
    let reached = false;
    for (let i = 0; i < 10 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await cta.evaluate((el) => el === document.activeElement);
    }
    assert(reached, "Tab v otevřeném menu nedojel na Poptat termín.");
    const ctaBox = await cta.evaluate((el) => el.getBoundingClientRect().toJSON());
    assert(ctaBox.top >= 80 && ctaBox.bottom <= 340, `Poptat termín s fokusem je mimo okno: ${JSON.stringify(ctaBox)}`);
    assert((await page.evaluate(() => window.scrollY)) === 0, "Tab v menu posunul stránku pod ním.");

    // Kolečko nad menu posouvá jen menu, ani na jeho konci stránku pod ním.
    await menu.evaluate((el) => el.scrollTo(0, 0));
    await page.mouse.move(400, 200);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(100);
    }
    const scrolled = await menu.evaluate((el) => el.scrollTop);
    assert(scrolled > 0, "Menu se kolečkem neposouvá.");
    assert((await page.evaluate(() => window.scrollY)) === 0, "Posouvání menu posunulo stránku pod ním.");
  },
  { viewport: { width: 844, height: 340 } },
);

/** Barva výběru textu a kurzoru (úprava 42): jen barvy z tokenů, žlutá jen na tmavém. */
test("výběr textu a kurzor v barvách webu", async (page) => {
  await page.goto(`${BASE_URL}${PRIVACY}`);
  const selection = (locator) =>
    locator.first().evaluate((el) => {
      const style = getComputedStyle(el, "::selection");
      return `${style.backgroundColor} ${style.color}`;
    });
  assert((await selection(page.locator("main .prose p"))) === `${GRAFIT} ${PAPIR}`, "Výběr na světlém není grafit s papírem.");
  assert((await selection(page.locator("footer.ftr li"))) === `${ZLUTA} ${GRAFIT}`, "Výběr v patičce není žlutý s grafitem.");
  await page.goto(`${BASE_URL}/`);
  assert((await selection(page.locator(".hero h1"))) === `${ZLUTA} ${GRAFIT}`, "Výběr na úvodní fotce není žlutý.");
  assert((await selection(page.locator(".sec--dark p"))) === `${ZLUTA} ${GRAFIT}`, "Výběr v tmavé sekci není žlutý.");
  await page.goto(`${BASE_URL}/kontakt`);
  const caret = await page.locator("main input[type=email]").first().evaluate((el) => getComputedStyle(el).caretColor);
  assert(caret === GRAFIT, `Kurzor v poli formuláře: ${caret}`);
});

/** Zásady (úprava 7): bez značek, se spisovou značkou a jmény poskytovatelů. */
test("zásady: správce se spisovou značkou, poskytovatelé, bez značek", async (page) => {
  const res = await page.goto(`${BASE_URL}${PRIVACY}`);
  assert(res?.status() === 200, `Zásady vrátily ${res?.status()}.`);
  const text = await plainText(page.locator("main"));
  for (const expected of [
    "zapsaná v obchodním rejstříku vedeném Městským soudem v Praze pod spisovou značkou C 236725",
    "Údaje z poptávek uchováváme po dobu nezbytnou k vyřízení poptávky.",
    "Vercel (hosting webu, funkce webu běží v EU, v regionu Dublin)",
    "Supabase (databáze a fotky, EU, Irsko)",
    "Resend (odesílání e-mailů o poptávce, USA;",
    "Platné od spuštění nového webu.",
  ]) {
    assert(text.includes(expected), `Zásady nemají: ${expected}`);
  }
  assert((await page.locator("main .todo, main .todo-box").count()) === 0, "Zásady mají značku .todo.");
});

/**
 * Seznam kontaktů (výzva na konci stránek, panel Poptávka u výletu, úprava 21):
 * štítek WHATSAPP není nalepený na odkaz (nález z kontroly 14. 10. 2026),
 * odkazy jsou pod sebou a na 320 px se žádný nezalomí pod štítek.
 */
test("seznam kontaktů: štítky odsazené od odkazů, odkazy pod sebou", async (page) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of ["/", "/letecke-vylety/florida-week"]) {
      await page.goto(`${BASE_URL}${url}`);
      const lists = await page.evaluate(() =>
        [...document.querySelectorAll(".contact-list")].map((list) =>
          [...list.querySelectorAll("li")].map((li) => {
            const label = li.querySelector(".k");
            // Rozměry textu, ne rámečku: odkaz má na telefonu svislý padding (dotykový cíl).
            const box = (el) => {
              const range = document.createRange();
              range.selectNodeContents(el);
              return range.getClientRects()[0];
            };
            const text = box(label);
            const link = box(li.querySelector("a"));
            const middle = (r) => r.top + r.height / 2;
            return {
              label: label.textContent,
              gap: link.left - text.right,
              sameRow: Math.abs(middle(link) - middle(text)) < 12,
              left: link.left,
            };
          }),
        ),
      );
      assert(lists.length > 0, `${url} na ${width} px: seznam kontaktů chybí.`);
      for (const rows of lists) {
        for (const row of rows) {
          assert(row.sameRow, `${url} na ${width} px: odkaz u ${row.label} je pod štítkem.`);
          assert(row.gap >= 8, `${url} na ${width} px: odkaz u ${row.label} je ${row.gap.toFixed(1)} px od štítku.`);
        }
        assert(new Set(rows.map((row) => Math.round(row.left))).size === 1, `${url} na ${width} px: odkazy nejsou pod sebou.`);
      }
    }
  }
});

// Při plném běhu po testech Kontaktu (pořadí z doby před rozdělením 14. 10. 2026).
part(2);

/**
 * Do spuštění webu nesmí nic do vyhledávačů. Počítá s výchozím nastavením
 * serveru (bez NEXT_PUBLIC_ALLOW_INDEXING=true): robots.txt zakáže celý
 * web, stránky i 404 mají meta robots noindex, nofollow a odpovědi
 * hlavičku X-Robots-Tag: noindex.
 */
test("indexace: výchozí nastavení je noindex", async (page) => {
  const robots = await (await fetch(`${BASE_URL}/robots.txt`)).text();
  assert(/^Disallow: \/$/m.test(robots), `robots.txt nezakazuje celý web:\n${robots}`);
  assert(!/^Allow:/m.test(robots), `robots.txt něco povoluje:\n${robots}`);

  for (const [url, status] of [
    ["/", 200],
    ["/kontakt", 200],
    ["/z-cest", 200],
    ["/neexistujici-adresa-e2e", 404],
  ]) {
    const res = await page.goto(`${BASE_URL}${url}`);
    assert(res?.status() === status, `${url} vrátila ${res?.status()}.`);
    assert(res.headers()["x-robots-tag"] === "noindex", `${url}: X-Robots-Tag ${res.headers()["x-robots-tag"]}`);
    const metas = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((el) => el.content));
    assert(metas.includes("noindex, nofollow"), `${url}: meta robots ${JSON.stringify(metas)}`);
  }
});

/** Statické soubory bez otisku v názvu mají cache na den, HEAD na přihlášení Auth.js nevolá. */
test("hlavičky: cache statických souborů a HEAD na /api/auth", async () => {
  for (const url of ["/img/honza-portret.jpg", "/logo/logo-px-32-tmave.svg", "/og/og-image.jpg"]) {
    const res = await fetch(`${BASE_URL}${url}`, { method: "HEAD" });
    const cache = res.headers.get("cache-control");
    assert(
      res.status === 200 && cache === "public, max-age=86400, stale-while-revalidate=604800",
      `${url}: ${res.status}, Cache-Control ${cache}`,
    );
  }
  for (const url of ["/api/auth/session", "/api/auth/providers", "/api/auth/csrf"]) {
    const res = await fetch(`${BASE_URL}${url}`, { method: "HEAD" });
    assert(res.status === 405 && res.headers.get("allow") === "GET, POST", `HEAD ${url}: ${res.status}`);
  }
  // GET na přihlášení dál funguje.
  const session = await fetch(`${BASE_URL}/api/auth/session`);
  assert(session.status === 200, `GET /api/auth/session: ${session.status}`);
});

// Při plném běhu po testech Z cest.
part(3);

test(
  "404 a přesměrování starých adres",
  async (page) => {
    const res = await page.goto(`${BASE_URL}/neexistujici-adresa-e2e`);
    assert(res?.status() === 404, `Neznámá adresa vrátila ${res?.status()}.`);
    await page.getByRole("heading", { level: 1, name: "Stránka nenalezena" }).waitFor();
    // Patička začíná až pod záhybem, pod ní nezůstane světlý pruh.
    const footerTop = await page.locator("footer").last().evaluate((el) => el.getBoundingClientRect().top);
    assert(footerTop >= 900 - 1, `Patička stránky 404 začíná na ${footerTop} px.`);

    // Obě varianty 404 (neznámá adresa: global-not-found, notFound() ve stránce
    // webu: (web)/not-found) mají cestu k výletům, kontakt a Honzův telefon
    // (úprava 43), bez žluté výzvy.
    for (const url of ["/neexistujici-adresa-e2e", "/z-cest/neexistujici-clanek-e2e"]) {
      const notFound = await page.goto(`${BASE_URL}${url}`);
      assert(notFound?.status() === 404, `${url} vrátila ${notFound?.status()}.`);
      const main = page.locator("main");
      await main.getByRole("heading", { level: 1, name: "Stránka nenalezena" }).waitFor();
      for (const [name, href] of [
        ["Na úvodní stránku", "/"],
        ["Letecké výlety", "/letecke-vylety"],
        ["Kontakt", "/kontakt"],
      ]) {
        const link = main.getByRole("link", { name, exact: true });
        assert((await link.getAttribute("href")) === href, `${url}: odkaz ${name} vede na ${await link.getAttribute("href")}.`);
      }
      assert(
        (await plainText(main)).includes("Spěcháte? Zavolejte Honzovi: +420 602 214 719"),
        `${url}: chybí řádek s telefonem.`,
      );
      assert(
        (await main.getByRole("link", { name: "+420 602 214 719" }).getAttribute("href")) === "tel:+420602214719",
        `${url}: telefon nevede na tel:.`,
      );
      assert((await main.locator(".fa-dir").count()) === 0, `${url}: 404 má směrovou tabuli.`);
      assert((await main.locator("[style]").count()) === 0, `${url}: 404 má vložený styl.`);
    }

    // Staré adresy WordPressu a dočasné adresy nového webu jedním
    // přesměrováním (celý seznam: scripts/test-redirects.mjs).
    for (const [from, to] of [
      ["/validace/", "/#postup"],
      ["/validace", "/#postup"],
      ["/instruktor/", "/vas-mentor"],
      ["/naklady/", "/letecke-vylety"],
      ["/kontakt/", "/kontakt"],
      ["/balicek-florida-week", "/letecke-vylety/florida-week"],
      ["/tipy-na-vylety", "/kam-letet"],
      ["/denik", "/z-cest"],
      ["/denik/oblet-ameriky-2016/", "/z-cest/oblet-ameriky-2016"],
      ["/o-honzovi", "/vas-mentor"],
    ]) {
      const redirect = await fetchManual(from);
      const location = redirect.headers.get("location")?.replace(BASE_URL, "");
      assert(redirect.status === 308 && location === to, `${from}: ${redirect.status} na ${location}, čekáno 308 na ${to}`);
    }
    await page.goto(`${BASE_URL}/validace/`);
    await page.waitForURL(`${BASE_URL}/#postup`);
  },
  { viewport: { width: 1440, height: 900 } },
);

/**
 * Ostrý web bez značek [doplnit] (úprava 7, rozhodnutí 14. 10. 2026):
 * chybějící obsah se skryje. Projde HTML všech stránek webu (i data
 * stránky pro React), všech destinací, zásad, obou 404, všech publikovaných
 * článků v lokální databázi a zdroje v src. Koncepty se nekontrolují
 * (článek 2025 má značku, dokud se nedoplní závěr, publikaci se značkou
 * administrace zablokuje). Ostrou databázi hlídá krok v backlogu.
 */
test("web bez značek [doplnit]", async (page, credentials) => {
  const sql = database(credentials);
  let published;
  try {
    published = await sql`select slug from posts where status = 'published' order by slug`;
  } finally {
    await sql.end();
  }
  const pages = [
    ...PUBLIC_PAGES,
    ...DESTINATION_SLUGS.map((slug) => `/kam-letet/${slug}`),
    PRIVACY,
    "/neexistujici-adresa-e2e",
    "/z-cest/neexistujici-clanek-e2e",
    ...published.map(({ slug }) => `/z-cest/${slug}`),
  ];
  const problems = [];
  for (const url of [...new Set(pages)]) {
    const res = await page.goto(`${BASE_URL}${url}`);
    assert(res?.status() === 200 || res?.status() === 404, `${url} vrátila ${res?.status()}.`);
    const html = await page.content();
    const marks = html.match(/\[doplnit[^\]<]{0,60}/g) ?? [];
    const todo = await page.locator(".todo, .todo-box").count();
    if (marks.length || todo) problems.push(`${url}: ${todo}x .todo, ${[...new Set(marks)].join(" | ")}`);
  }

  // Zdroje: značka smí být jen v komentářích, v ArticleContent.tsx (značka
  // v textu konceptu z databáze) a v post-form.ts (hlášky administrace, které
  // publikaci se značkou zablokují).
  const allowed = new Set(["ArticleContent.tsx", "post-form.ts"]);
  const sources = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:tsx?|css|json)$/.test(entry.name) && !allowed.has(entry.name)) sources.push(file);
    }
  };
  walk(path.join(ROOT, "src"));
  for (const file of sources) {
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
      .replace(/(^|[\s;{}(),])\/\/.*$/gm, "$1");
    code.split("\n").forEach((line, index) => {
      if (line.includes("[doplnit")) problems.push(`${path.relative(ROOT, file)}:${index + 1}`);
    });
  }
  assert(problems.length === 0, `Značky [doplnit] na webu:\n         ${problems.join("\n         ")}`);
});
