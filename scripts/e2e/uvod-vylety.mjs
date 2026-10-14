/**
 * e2e testy úvodu a leteckých výletů: kotva #postup, Z cest na úvodu,
 * požadavky na piloty, slovo balíček, výzva výletu a neznámý výlet.
 * Do 14. 10. 2026 část testu „veřejný web: úvod, výlet a stránky na telefonu“
 * (druhá část je v globalni.mjs).
 *
 * Úpravy z auditu podle rozhodnutí 14. 10. 2026 (../design/audit-2026-10-13):
 * tvar cen a tabulek (20), Náplň programu (13), odkazy pod cenou (14), perex
 * Letecké výlety (23), karta výletu s odkazem v nadpisu a na fotce (28),
 * první obrazovka úvodu s „za osobu“ (15), Kam letět na telefonu jako seznam
 * (12, R12), popisek v tabulce na telefonu (24), fotky letišť místo pláže (9)
 * a popisky jen u celých fotek v řadě (41).
 */
import { BASE_URL, assert, fetchManual, plainText, test } from "./_lib.mjs";

test("úvod a výlet: kotva, Z cest, požadavky na piloty a poptávka výletu", async (page) => {
  await page.goto(`${BASE_URL}/`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  // Kotva, na kterou vede přesměrování ze starého webu (/validace/).
  assert((await page.locator("#postup").count()) === 1, "Úvod nemá kotvu #postup.");
  // Z cest na úvodu z databáze: nejnovější článek a odkaz na všechny články, bez podpisu.
  const diary = page.locator("#z-cest");
  const latest = await diary.getByRole("link", { name: /Číst celý článek/ }).getAttribute("href");
  assert(/^\/z-cest\/[a-z0-9-]+$/.test(latest ?? ""), `Odkaz na nejnovější článek: ${latest}`);
  await diary.getByRole("link", { name: "Všechny články" }).waitFor();
  assert((await diary.locator(".sig").count()) === 0, "Úvod podepisuje článek, autor v databázi není.");
  // Rok cesty (úprava 33): rok u článku je i hodnota <time>, ne datum publikace.
  const year = diary.locator("time.date");
  const yearText = (await year.innerText()).trim();
  assert(/^\d{4}$/.test(yearText) && (await year.getAttribute("datetime")) === yearText, `Rok článku na úvodu: ${yearText}`);

  // Honzovy požadavky na piloty (13. 10. 2026) místo značky [doplnit].
  const requirements = page.locator("#postup .req");
  assert(
    (await plainText(requirements)).includes("je nutná úroveň anglického jazyka ICAO 4 a vyšší."),
    "Úvod nemá Honzovy požadavky na piloty.",
  );
  assert((await requirements.locator(".todo").count()) === 0, "Požadavky na piloty na úvodu mají značku [doplnit].");

  // Výlet: výzva vede na poptávku s předvyplněným výletem.
  await page.goto(`${BASE_URL}/letecke-vylety/florida-week`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert((await page.getByText(/balíč/i).count()) === 0, "Stránka výletu obsahuje slovo balíček.");
  const tripRequirements = page.locator(".pk-req");
  assert(
    (await tripRequirements.locator("p").count()) === 3 && (await tripRequirements.locator(".todo").count()) === 0,
    "Výlet nemá tři odstavce Honzových požadavků na piloty.",
  );
  await page.locator('main a[href^="/kontakt?vylet=florida-week"]').first().click();
  await page.waitForURL(/\/kontakt\?vylet=florida-week/);
  const preset = page.locator('input[name="packageSlug"][value="florida-week"]');
  await preset.waitFor({ state: "attached" });
  assert(await preset.isChecked(), "Výlet z odkazu není ve formuláři předvyplněný.");
  await page.getByText("Poptáváte:").waitFor();

  // Neznámý výlet je 404 (neznámá destinace v kam-letet.mjs).
  const url = "/letecke-vylety/neexistuje";
  const res = await fetchManual(url);
  assert(res.status === 404, `${url} vrátila ${res.status}.`);
});

/** Stránky s cenami výletů a prvky, ve kterých cena je. */
const PRICE_PAGES = ["/", "/letecke-vylety", "/letecke-vylety/florida-week", "/letecke-vylety/grand-tour"];
const PRICE_ELEMENTS = ".hero a.fa-link, .pkg-price, .vy-compare, .pk-sum, .pk-table";
/** Záhlaví tabulky Co zahrnuje cena / Co je v ceně u obou výletů (úprava 20). */
const INCLUDED_COLUMNS = ["Položka nebo služba", "V ceně?", "Co je zahrnuto"];
const TRIPS_PEREX =
  "V ceně je letadlo, palivo, pilot-mentor, letištní poplatky, pojištění a pronájem auta. " +
  "Cena nezahrnuje letenky, ubytování, stravu ani správní poplatek FAA za validaci průkazu.";

test(
  "výlety: tvar cen, Náplň programu, odkazy u ceny, perex a karty",
  async (page) => {
    // Ceny všude ve tvaru „7 400 USD“, nikde se znakem $ (úprava 20).
    for (const url of PRICE_PAGES) {
      await page.goto(`${BASE_URL}${url}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      const texts = await Promise.all((await page.locator(PRICE_ELEMENTS).all()).map((el) => plainText(el)));
      const text = texts.join(" | ");
      assert(text.includes("USD"), `${url}: žádná cena v ${PRICE_ELEMENTS}.`);
      assert(!text.includes("$"), `${url}: cena se znakem $: ${text}`);
      for (const [price] of text.matchAll(/[\d$][\d $]*USD/g)) {
        assert(/^\d{1,3}(?: \d{3})+ USD$/.test(price), `${url}: cena „${price}“ není ve tvaru „7 400 USD“.`);
      }
    }

    // Karty výletů na úvodu a na přehledu (úprava 28): nadpis je odkaz na detail, fotka je odkaz mimo pořadí Tab
    // a skrytý čtečkám, „Detail výletu“ zůstává.
    for (const url of ["/", "/letecke-vylety"]) {
      await page.goto(`${BASE_URL}${url}`);
      const cards = page.locator(".pkgs > .pkg");
      assert((await cards.count()) === 2, `${url}: karet výletů je ${await cards.count()}.`);
      for (const card of await cards.all()) {
        const title = card.locator(":is(h2, h3) > a");
        const href = await title.getAttribute("href");
        assert(/^\/letecke-vylety\/[a-z-]+$/.test(href ?? ""), `${url}: nadpis karty není odkaz na výlet (${href}).`);
        const photo = card.locator(".pkg-img");
        const attrs = await photo.evaluate((el) => ({
          tag: el.tagName,
          href: el.getAttribute("href"),
          tabIndex: el.getAttribute("tabindex"),
          hidden: el.getAttribute("aria-hidden"),
        }));
        assert(
          attrs.tag === "A" && attrs.href === href && attrs.tabIndex === "-1" && attrs.hidden === "true",
          `${url}: fotka karty není odkaz mimo pořadí Tab: ${JSON.stringify(attrs)}`,
        );
        assert((await card.getByRole("link", { name: /Detail výletu/ }).getAttribute("href")) === href, `${url}: Detail výletu.`);
      }
    }

    // Perex přehledu ze dvou Honzových vět a bez poznámky pod Srovnáním výletů (úprava 23).
    const perex = await plainText(page.locator(".page-head .perex"));
    assert(perex === TRIPS_PEREX, `Perex Letecké výlety: ${perex}`);
    assert((await page.locator("#srovnani ~ .pk-note").count()) === 0, "Pod Srovnáním výletů zůstala poznámka.");

    for (const slug of ["florida-week", "grand-tour"]) {
      await page.goto(`${BASE_URL}/letecke-vylety/${slug}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      // Pod cenou dva odkazy se stejným textem u obou výletů (úprava 14).
      const summary = page.locator(".pk-sum");
      const links = {
        "Ceny pro 1 a 2 piloty": "#cena",
        "Co zahrnuje cena": "#v-cene",
      };
      for (const [name, target] of Object.entries(links)) {
        const href = await summary.getByRole("link", { name }).getAttribute("href");
        assert(href === target, `${slug}: odkaz „${name}“ vede na ${href}.`);
        assert((await page.locator(target).count()) === 1, `${slug}: cíl ${target} na stránce chybí.`);
      }
      // Tabulka Co zahrnuje cena: stejné záhlaví a Ano/Ne u obou výletů (úprava 20).
      const included = page.locator('table[aria-labelledby="v-cene"]');
      // textContent: innerText vrací záhlaví verzálkami (text-transform).
      const columns = (await included.locator("thead th").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());
      assert(JSON.stringify(columns) === JSON.stringify(INCLUDED_COLUMNS), `${slug}: záhlaví tabulky ${JSON.stringify(columns)}`);
      const values = (await included.locator("tbody td:nth-child(2)").allInnerTexts()).map((t) => t.trim());
      assert(values.every((v) => v === "Ano" || v === "Ne"), `${slug}: hodnoty V ceně? ${JSON.stringify(values)}`);
      const variant = await plainText(page.locator('table[aria-labelledby="cena-nadpis"] tbody tr td').first());
      assert(variant === "2 piloti (doporučeno)", `${slug}: varianta pro 2 piloty „${variant}“.`);
      // Popisky jen u fotek celých v záběru (úprava 41): na počítači vykukuje druhá fotka bez popisku.
      const opacity = (i) =>
        page.locator(".vy-row-slide figcaption").nth(i).evaluate((el) => getComputedStyle(el).opacity);
      await page.locator(".vy-row-slide.is-cut").first().waitFor({ state: "attached" });
      assert((await opacity(0)) === "1" && (await opacity(1)) === "0", `${slug}: popisek uříznuté fotky v řadě je vidět.`);
    }

    // Grand Tour: Náplň programu místo „Výcvik“ (úprava 13), text řádku doslova.
    const terms = (await page.locator(".pk-data dt").allTextContents()).map((t) => t.trim());
    assert(terms.includes("Náplň programu") && !terms.some((t) => /výcvik/i.test(t)), `Grand Tour: ${JSON.stringify(terms)}`);
    const program = await plainText(page.locator(".pk-data div", { hasText: "Náplň programu" }).locator("dd"));
    assert(program.includes("příprava na BFR"), `Grand Tour, Náplň programu: ${program}`);
    // 2. fotka řady je Cirrus na letišti Key West, ne pláž (úprava 9).
    const second = await page.locator(".vy-row-slide img").nth(1).getAttribute("src");
    assert(second?.includes("destinace-key-west-15") && !second.includes("key-west-plaz"), `2. fotka Grand Tour: ${second}`);
  },
  { viewport: { width: 1440, height: 900 } },
);

test(
  "úvod a výlet na telefonu: první obrazovka, Kam letět jako seznam, tabulky",
  async (page) => {
    await page.goto(`${BASE_URL}/`);
    const h1 = page.getByRole("heading", { level: 1 });
    await h1.waitFor();
    await page.evaluate(() => document.fonts.ready);
    // První obrazovka 375 x 667: nadpis, žlutá výzva a cena „za osobu“ z nejlevnějšího výletu (úprava 15).
    const hero = page.locator(".hero");
    const price = hero.locator('a.fa-link[href="#vylety"]');
    const priceText = await plainText(price);
    assert(priceText === "Výlety od 7 400 USD za osobu", `Odkaz na výlety v úvodu: „${priceText}“.`);
    const sign = hero.locator(".fa-dir");
    const signColor = await sign.evaluate((el) => getComputedStyle(el).backgroundColor);
    assert(signColor === "rgb(241, 190, 72)", `Výzva v úvodu není žlutá: ${signColor}`);
    for (const [name, locator] of [["nadpis", h1], ["žlutá výzva", sign], ["cena za osobu", price]]) {
      const box = await locator.boundingBox();
      assert(box && box.y >= 0 && box.y + box.height <= 667, `${name} není v první obrazovce 375 x 667: ${JSON.stringify(box)}`);
    }

    // Kam letět na telefonu jako seznam (R12): náhled 112 px vlevo, nadpis vedle, Honzův výňatek skrytý.
    const tips = page.locator("#kam-letet .tip");
    assert((await tips.count()) === 4, `Kam letět na úvodu má ${await tips.count()} dlaždic.`);
    for (const tip of await tips.all()) {
      const photo = await tip.locator(".tip-img").boundingBox();
      const title = await tip.locator("h3").boundingBox();
      assert(photo && Math.round(photo.width) === 112, `Náhled destinace má ${photo?.width} px, ne 112 px.`);
      assert(title && title.x >= photo.x + photo.width, "Nadpis destinace není vedle náhledu.");
      assert(!(await tip.locator("p").isVisible()), "Honzův výňatek u destinace je na telefonu vidět.");
    }
    // Fotky letišť a letadel místo pláže (úprava 9).
    assert((await page.locator('#kam-letet img[src*="key-west-plaz"]').count()) === 0, "Kam letět na úvodu ukazuje pláž.");

    // Tabulky výletu na telefonu (úprava 24): popisek sloupce z data-label ani u třetí buňky.
    await page.goto(`${BASE_URL}/letecke-vylety/florida-week`);
    const labels = await page
      .locator(".pk-table td:nth-child(3)")
      .evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell, "::before").content));
    assert(labels.length > 0 && labels.every((content) => content === "none"), `Popisky třetí buňky: ${JSON.stringify(labels)}`);
  },
  { viewport: { width: 375, height: 667 } },
);
