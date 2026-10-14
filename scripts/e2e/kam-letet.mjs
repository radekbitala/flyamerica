/**
 * e2e testy oblasti Kam letět: neznámá destinace je 404, detail destinace
 * v okně, zavření a staré kotvy, destinace bez značek [doplnit], řádek
 * s výlety a poptávkou, mezititulky (h2 na stránce, h3 v okně) a dlaždice.
 */
import { BASE_URL, assert, fetchManual, plainText, test } from "./_lib.mjs";

// Neznámá destinace je 404 (dřív součást testu „veřejný web: úvod, výlet a stránky na telefonu“).
test("Kam letět: neznámá destinace je 404", async () => {
  const url = "/kam-letet/neexistuje";
  const res = await fetchManual(url);
  assert(res.status === 404, `${url} vrátila ${res.status}.`);
});

/** Stav okna s detailem destinace: adresa, otevřený <dialog>, zamknutý posun stránky, fokus. */
const destinationDialogState = (page) =>
  page.evaluate(() => ({
    path: location.pathname + location.hash,
    open: document.querySelector("dialog.kl-dialog")?.open ?? false,
    locked: document.documentElement.style.overflow === "hidden",
    focus: document.activeElement?.id || document.activeElement?.getAttribute("href") || document.activeElement?.tagName,
  }));

/** Po zavření okna: adresa /kam-letet, žádné okno, stránka se dá posouvat. */
async function assertDialogClosed(page, when) {
  await page.waitForURL(`${BASE_URL}/kam-letet`);
  await page.locator("dialog.kl-dialog").waitFor({ state: "detached" });
  const state = await destinationDialogState(page);
  assert(!state.open && !state.locked, `${when}: okno zůstalo otevřené nebo stránka zamknutá (${JSON.stringify(state)}).`);
}

test(
  "Kam letět: detail destinace v okně, zavření a staré kotvy",
  async (page) => {
    const dialog = page.locator("dialog.kl-dialog");
    const tile = page.locator('a.tip[href="/kam-letet/cedar-key"]');

    // Klik na dlaždici: okno nad rozcestníkem s adresou detailu, fokus na nadpisu okna.
    await page.goto(`${BASE_URL}/kam-letet`);
    await tile.click();
    await page.waitForURL(`${BASE_URL}/kam-letet/cedar-key`);
    await dialog.waitFor({ state: "visible" });
    let state = await destinationDialogState(page);
    assert(state.open && state.locked, `Okno po kliku: ${JSON.stringify(state)}`);
    assert(state.focus === "kam-letet-okno-nadpis", `Fokus po otevření okna: ${state.focus}`);
    // Tip pro piloty od Honzy (14. 10. 2026) místo značky [doplnit].
    const tip = dialog.locator(".kl-tip");
    await tip.getByRole("heading", { name: "Tip pro piloty" }).waitFor();
    assert(
      (await plainText(tip.locator("p"))).startsWith("Z Orlanda létáme zpravidla přes letiště Inverness"),
      "Okno Cedar Key nemá Honzův tip pro piloty.",
    );
    assert((await dialog.locator(".todo").count()) === 0, "Okno Cedar Key má značku [doplnit].");

    // Escape zavře okno, adresa je zase /kam-letet a fokus se vrátí na dlaždici.
    await page.keyboard.press("Escape");
    await assertDialogClosed(page, "Escape");
    state = await destinationDialogState(page);
    assert(state.focus === "/kam-letet/cedar-key", `Fokus po zavření okna: ${state.focus}`);

    // Další přepne destinaci bez nového záznamu v historii: Zavřít pak vede na /kam-letet.
    await tile.click();
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("link", { name: /^Další/ }).click();
    await page.waitForURL(`${BASE_URL}/kam-letet/albert-whitted`);
    await dialog.getByRole("button", { name: "Zavřít" }).click();
    await assertDialogClosed(page, "Další a Zavřít");

    // Staré kotvy otevřou okno nad rozcestníkem (i přes přesměrování /tipy-na-vylety)
    // a Escape, Zavřít i Zpět v prohlížeči ho zavřou. Mezi pokusy jiná stránka,
    // jinak by změna kotvy stránku znovu nenačetla.
    for (const [start, close] of [
      ["/kam-letet#cedar-key", "Escape"],
      ["/tipy-na-vylety#cedar-key", "Zavřít"],
      ["/kam-letet#cedar-key", "Zpět"],
    ]) {
      await page.goto("about:blank");
      await page.goto(`${BASE_URL}${start}`);
      await page.waitForURL(`${BASE_URL}/kam-letet/cedar-key`);
      await dialog.waitFor({ state: "visible" });
      if (close === "Escape") await page.keyboard.press("Escape");
      else if (close === "Zavřít") await dialog.getByRole("button", { name: "Zavřít" }).click();
      else await page.goBack();
      await assertDialogClosed(page, `${start}, ${close}`);
    }
    // Stránka pod zavřeným oknem není neaktivní: menu funguje.
    await page.getByRole("navigation", { name: "Hlavní menu" }).getByRole("link", { name: "Z cest" }).click();
    await page.waitForURL(`${BASE_URL}/z-cest`);

    // Přímá adresa detailu je celá stránka s h1, bez okna.
    await page.goto(`${BASE_URL}/kam-letet/cedar-key`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    assert((await dialog.count()) === 0, "Přímá adresa detailu otevřela okno.");

    // Palatka: kód 28J podle Honzovy opravy (14. 10. 2026), tip pro piloty. Chybějící fotky
    // se neoznačují (úprava 7), stránka je bez galerie.
    await page.goto(`${BASE_URL}/kam-letet/palatka`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const route = await plainText(page.locator(".kl-page-route"));
    assert(route === "FA83 28J", `Trasa Palatky: ${route}`);
    await page.locator(".kl-tip").getByRole("heading", { name: "Tip pro piloty" }).waitFor();
    assert((await page.locator(".dest-gal").count()) === 0, "Palatka má galerii, fotky letiště od Honzy ještě nejsou.");
    assert((await page.getByText("KFLZ").count()) === 0, "Stránka Palatky má starý kód KFLZ.");
  },
  { viewport: { width: 1440, height: 900 } },
);

/** Destinace v pořadí Honzova podkladu (src/data/destinations.ts). */
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

/** Značka chybějícího podkladu: třída .todo (.dest-todo) nebo text „[doplnit“ v rozsahu scope. */
async function assertNoTodo(scope, where) {
  const marks = await scope.locator(".todo, .dest-todo").count();
  const text = await scope.innerText();
  assert(marks === 0 && !text.includes("[doplnit"), `${where} má značku [doplnit].`);
}

/** Řádek s výlety a poptávkou pod textem destinace (DestinationTrips): text a odkazy [text, href]. */
async function destinationTrips(scope) {
  const trips = scope.locator(".kl-trips");
  return {
    text: await plainText(trips),
    links: await trips
      .locator("a")
      .evaluateAll((links) => links.map((a) => [a.textContent.replace(/\s+/g, " ").trim(), a.getAttribute("href")])),
  };
}

/** Výlety a poptávka podle pole destinations v src/data/trips.ts (úprava 11 z auditu). */
const WEEK = ["Florida Week & Fly", "/letecke-vylety/florida-week"];
const TOUR = ["Florida Grand Tour & Fly", "/letecke-vylety/grand-tour"];
const ASK = ["Poptat termín", "/kontakt#poptavka"];
const BOTH_TRIPS = {
  text: "Letíte sem na výletech Florida Week & Fly a Florida Grand Tour & Fly Poptat termín",
  links: [WEEK, TOUR, ASK],
};
// Vero Beach, Palatka, Kissimmee a Merritt Island nejsou v textech výletů: jen Poptat termín.
const ASK_ONLY = { text: "Poptat termín", links: [ASK] };
const EXPECTED_TRIPS = {
  fa83: {
    text: "Domovská základna obou výletů: Florida Week & Fly a Florida Grand Tour & Fly Poptat termín",
    links: [WEEK, TOUR, ASK],
  },
  "cedar-key": BOTH_TRIPS,
  "albert-whitted": BOTH_TRIPS,
  "vero-beach": ASK_ONLY,
  palatka: ASK_ONLY,
  kissimmee: ASK_ONLY,
  "merritt-island": ASK_ONLY,
  "key-west-everglades": {
    text: "Letíte sem na výletu Florida Grand Tour & Fly Poptat termín",
    links: [TOUR, ["Poptat termín", "/kontakt?vylet=grand-tour#poptavka"]],
  },
};

async function assertTrips(scope, slug, where) {
  const actual = await destinationTrips(scope);
  const expected = EXPECTED_TRIPS[slug];
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${where}: řádek s výlety ${JSON.stringify(actual)}, čekal jsem ${JSON.stringify(expected)}.`,
  );
}

/** Mezititulky textu destinace: [úroveň, text]. */
const subheadings = (scope) =>
  scope
    .locator(".dest-text")
    .locator("h2, h3")
    .evaluateAll((headings) => headings.map((h) => [h.tagName, h.textContent.replace(/\s+/g, " ").trim()]));

test(
  "Kam letět: bez značek [doplnit], výlety a poptávka, mezititulky a dlaždice",
  async (page) => {
    // Úprava 9: dlaždice Key West, Vero Beach a Merritt Island ukazují letiště nebo letadlo.
    await page.goto(`${BASE_URL}/kam-letet`);
    const tileSrc = (slug) =>
      page
        .locator(`a.tip[href="/kam-letet/${slug}"] img`)
        .evaluate((img) => decodeURIComponent(img.currentSrc || img.getAttribute("src")));
    for (const [slug, file] of [
      ["key-west-everglades", "/img/everglades-airpark.jpg"],
      ["vero-beach", "/img/kam-letet/letadla-vero-beach-07.jpg"],
      ["merritt-island", "/img/kam-letet/destinace-cape-canaveral-13.jpg"],
    ]) {
      const src = await tileSrc(slug);
      assert(src.includes(file), `Dlaždice ${slug} má fotku ${src}, čekal jsem ${file}.`);
    }
    // Úprava 39: dlaždice v řadě mají trasu a výňatek na stejné výšce (subgrid), i když se nadpis zalomí.
    const rows = await page.locator(".kl-tiles > li").evaluateAll((items) => {
      const top = (el) => Math.round(el.getBoundingClientRect().top);
      const byRow = new Map();
      for (const li of items) {
        const key = top(li.querySelector(".tip-img"));
        byRow.set(key, [...(byRow.get(key) ?? []), [top(li.querySelector(".route")), top(li.querySelector("p"))]]);
      }
      return [...byRow.values()];
    });
    assert(rows.length === 2, `Rozcestník má ${rows.length} řad dlaždic, čekal jsem 2.`);
    for (const row of rows) {
      const positions = new Set(row.map(([route, text]) => `${route}/${text}`));
      assert(positions.size === 1, `Řada dlaždic není vyrovnaná: ${JSON.stringify(row)}`);
    }

    // Úprava 7 a 35: žádná z 8 stránek nemá [doplnit], mezititulky jsou h2 pod h1.
    for (const slug of DESTINATION_SLUGS) {
      await page.goto(`${BASE_URL}/kam-letet/${slug}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await assertNoTodo(page.locator("main"), `Stránka /kam-letet/${slug}`);
      const headings = await subheadings(page.locator("main"));
      assert(
        headings.length >= 2 && headings.every(([tag]) => tag === "H2"),
        `Mezititulky stránky ${slug} nejsou h2: ${JSON.stringify(headings)}`,
      );
      if (slug === "cedar-key") {
        assert(
          JSON.stringify(headings) ===
            JSON.stringify([["H2", "Zajímavosti"], ["H2", "Proč je dobré tam letět"], ["H2", "Tip pro piloty"]]),
          `Mezititulky Cedar Key: ${JSON.stringify(headings)}`,
        );
      }
      // Úprava 11: řádek s výlety a Poptat termín u všech osmi destinací.
      await assertTrips(page.locator("main"), slug, `Stránka ${slug}`);
    }

    // Okno: všech 8 destinací přes Další, bez [doplnit], mezititulky h3 pod h2 okna.
    const dialog = page.locator("dialog.kl-dialog");
    await page.goto(`${BASE_URL}/kam-letet`);
    await page.locator('a.tip[href="/kam-letet/fa83"]').click();
    await dialog.waitFor({ state: "visible" });
    for (const [index, slug] of DESTINATION_SLUGS.entries()) {
      if (index > 0) {
        await dialog.getByRole("link", { name: /^Další/ }).click();
        await page.waitForURL(`${BASE_URL}/kam-letet/${slug}`);
      }
      await dialog.locator("#kam-letet-okno-nadpis").waitFor();
      await dialog.locator(".kl-trips").waitFor();
      await assertNoTodo(dialog, `Okno ${slug}`);
      const headings = await subheadings(dialog);
      assert(
        headings.length >= 2 && headings.every(([tag]) => tag === "H3"),
        `Mezititulky okna ${slug} nejsou h3: ${JSON.stringify(headings)}`,
      );
      await assertTrips(dialog, slug, `Okno ${slug}`);
    }

    // Klik na výlet v okně: okno se zavře, stránka výletu se dá posouvat. Zpět vrátí
    // okno nad rozcestník, Escape ho zavře.
    await page.goto(`${BASE_URL}/kam-letet`);
    await page.locator('a.tip[href="/kam-letet/cedar-key"]').click();
    await dialog.waitFor({ state: "visible" });
    await dialog.locator(".kl-trips").getByRole("link", { name: "Florida Week & Fly" }).click();
    await page.waitForURL(`${BASE_URL}/letecke-vylety/florida-week`);
    await dialog.waitFor({ state: "detached" });
    let state = await destinationDialogState(page);
    assert(!state.open && !state.locked, `Po kliku na výlet: ${JSON.stringify(state)}`);
    await page.getByRole("heading", { level: 1, name: /Florida Week/ }).waitFor();
    await page.mouse.move(600, 500);
    await page.mouse.wheel(0, 800);
    await page.waitForFunction(() => window.scrollY > 0);

    await page.goBack();
    await page.waitForURL(`${BASE_URL}/kam-letet/cedar-key`);
    await dialog.waitFor({ state: "visible" });
    state = await destinationDialogState(page);
    assert(state.open && state.locked, `Zpět ze stránky výletu: ${JSON.stringify(state)}`);
    await page.keyboard.press("Escape");
    await assertDialogClosed(page, "Zpět ze stránky výletu a Escape");

    // Poptat termín v okně Key West (odkaz s předvyplněným výletem ověřuje assertTrips): okno se zavře.
    await page.locator('a.tip[href="/kam-letet/key-west-everglades"]').click();
    await dialog.waitFor({ state: "visible" });
    await dialog.locator(".kl-trips").getByRole("link", { name: "Poptat termín" }).click();
    await page.waitForURL((url) => url.pathname === "/kontakt");
    await dialog.waitFor({ state: "detached" });
    state = await destinationDialogState(page);
    assert(!state.open && !state.locked, `Po kliku na Poptat termín: ${JSON.stringify(state)}`);
  },
  { viewport: { width: 1440, height: 900 } },
);
