/**
 * e2e testy oblasti Kontakt: poptávka s JavaScriptem i bez něj, Zavolejte mi,
 * výpadek sítě a chyba serveru při odeslání. Od 14. 10. 2026 (audit, úpravy
 * 7, 8, 16, 21, 30) i volby výletu s cenou, sloupec kontaktů, rozepsaný
 * formulář v sessionStorage, „Odesílám…“ při pomalé síti a vlastní hlášky
 * Nechte číslo.
 */
import { BASE_URL, assert, database, plainText, sleep, test, visitor, waitMinFill } from "./_lib.mjs";

/** Lhůta odpovědi (FA_REPLY_TIME v src/lib/site.ts), plainText ji vrací s obyčejnou mezerou. */
const REPLY_TIME = "do 2 dnů";

/** Klíče rozepsaných formulářů v sessionStorage (DRAFT_KEYS v kontakt/form-helpers.tsx). */
const DRAFT_INQUIRY = "fa-poptavka";
const DRAFT_CALLBACK = "fa-zavolam";

const readDraft = (page, key) => page.evaluate((k) => sessionStorage.getItem(k), key);

/**
 * Pomalá síť přes Chrome DevTools Protocol: každý požadavek čeká `latency` ms.
 * Vrací funkci, která síť vrátí do normálu.
 */
async function slowNetwork(page, latency) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  const set = (ms) =>
    cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: ms,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
  await set(latency);
  return () => set(0);
}

/** Na stránce ani v potvrzení nesmí zůstat značka [doplnit] (úprava 7). */
async function assertNoTodo(page, where) {
  assert((await page.locator(".todo").count()) === 0, `${where}: na stránce je značka .todo.`);
  assert(!(await page.locator("body").innerText()).includes("[doplnit"), `${where}: na stránce je „[doplnit“.`);
}

/** Vyplní poptávku na tři kroky (s JavaScriptem, Pokračovat mezi kroky). */
async function fillInquiry(page, { email, name }) {
  const current = () => page.locator(".kt-step.is-current");
  // Krok 1 bez licence: hláška z modelu a fokus na první volbu.
  await current().getByRole("button", { name: "Pokračovat" }).click();
  await page.locator(".fa-err", { hasText: "Vyberte licenci, nebo možnost Nemám." }).waitFor();
  // Ultralight a Nemám: nápověda z Honzových požadavků na piloty, u PPL zase zmizí.
  const note = page.locator("#f-licence-pozn");
  await page.locator('input[name="licence"][value="Ultralight"]').check();
  await note.waitFor();
  assert((await plainText(note)).startsWith("Pro ostatní ať už piloty UL"), "Nápověda u Ultralight nesedí.");
  await page.locator('input[name="licence"][value="PPL"]').check();
  await note.waitFor({ state: "detached" });
  await current().getByRole("button", { name: "Pokračovat" }).click();
  await page.locator("#krok-2.is-current").waitFor();

  await page.locator('input[name="packageSlug"][value="grand-tour"]').check();
  await page.locator("#f-kdy").fill("březen 2027");
  await page.locator('input[name="pilotCount"][value="2"]').check();
  await page.locator('input[name="companions"][value="Ano"]').check();
  await current().getByRole("button", { name: "Pokračovat" }).click();
  await page.locator("#krok-3.is-current").waitFor();

  await page.locator("#f-jmeno").fill(name);
  await page.locator("#f-email").fill(email);
  await page.locator("#f-telefon").fill("+420 602 000 111");
  await page.locator("#f-zprava").fill("Zpráva z e2e testu.");
}

async function assertInquiryRow(sql, email, expected) {
  const rows = await sql`
    select kind, licence, package_slug, travel_date, pilot_count, companions, name, phone,
      message, status, ip_hash is not null as has_ip_hash
    from inquiries where email = ${email}`;
  assert(rows.length === 1, `Poptávek v databázi: ${rows.length}`);
  for (const [key, value] of Object.entries(expected)) {
    assert(rows[0][key] === value, `Poptávka v databázi, ${key}: ${JSON.stringify(rows[0][key])}`);
  }
}

test(
  "poptávka na webu s JavaScriptem",
  async (page, credentials) => {
    const sql = database(credentials);
    const stamp = Date.now();
    const email = `e2e-web-${stamp}@test.local`;
    const oldEmail = `e2e-stara-${stamp}@test.local`;
    try {
      // Starší poptávka než lhůta v zásadách: nová poptávka u ní smaže otisk IP a prohlížeč.
      await sql`
        insert into inquiries (kind, name, email, ip_hash, user_agent, created_at)
        values ('callback', 'E2E Stará', ${oldEmail}, 'e2e-otisk', 'e2e-prohlizec', now() - interval '31 days')`;

      await page.goto(`${BASE_URL}/kontakt`);
      // Po hydrataci formulář řídí kroky (do té doby by klik odeslal formulář).
      await page.waitForLoadState("networkidle");
      const loadedAt = Date.now();
      assert((await page.locator(".kt-step:visible").count()) === 1, "Po načtení je vidět víc kroků než jeden.");
      await assertNoTodo(page, "Kontakt");

      await fillInquiry(page, { email, name: `E2E Web ${stamp}` });
      await waitMinFill(loadedAt);
      await page.getByRole("button", { name: "Odeslat poptávku" }).click();
      await page.locator(".kt-done h2", { hasText: "Děkujeme, poptávka je odeslaná" }).waitFor();
      await page.locator(".kt-done", { hasText: email }).waitFor();
      // Lhůta odpovědi od Honzy (úprava 16), žádná značka [doplnit].
      const thanks = await plainText(page.locator(".kt-done > p").first());
      assert(
        thanks === `Honza se vám ozve na e-mail ${email} ${REPLY_TIME}.`,
        `Věta v potvrzení poptávky: "${thanks}"`,
      );
      await assertNoTodo(page, "Potvrzení poptávky");
      assert((await readDraft(page, DRAFT_INQUIRY)) === null, "Po odeslání zůstala poptávka v sessionStorage.");

      await assertInquiryRow(sql, email, {
        kind: "inquiry",
        licence: "PPL",
        package_slug: "grand-tour",
        travel_date: "březen 2027",
        pilot_count: "2",
        companions: "Ano",
        message: "Zpráva z e2e testu.",
        status: "new",
        has_ip_hash: true,
      });
      const [old] = await sql`select ip_hash, user_agent from inquiries where email = ${oldEmail}`;
      assert(old.ip_hash === null && old.user_agent === null, "U poptávky starší 30 dní zůstal otisk IP nebo prohlížeč.");

      // Další poptávka: prázdný formulář od kroku 1.
      await page.getByRole("link", { name: "Poslat další poptávku" }).click();
      await page.locator("#krok-1.is-current").waitFor();
      assert((await page.locator("#f-jmeno").inputValue()) === "", "Formulář po odeslání není prázdný.");
      assert((await readDraft(page, DRAFT_INQUIRY)) === null, "Po „Poslat další poptávku“ je v sessionStorage poptávka.");
    } finally {
      await sql`delete from inquiries where email in ${sql([email, oldEmail])}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

test(
  "poptávka na webu bez JavaScriptu",
  async (page, credentials) => {
    const sql = database(credentials);
    const stamp = Date.now();
    const email = `e2e-nojs-${stamp}@test.local`;
    try {
      // Starší odkazy s ?balicek= (před přejmenováním na ?vylet=) fungují dál.
      await page.goto(`${BASE_URL}/kontakt?balicek=florida-week`);
      const loadedAt = Date.now();
      // Bez skriptu jsou všechny kroky pod sebou, výlet předvyplněný.
      assert((await page.locator(".kt-step:visible").count()) === 3, "Bez JavaScriptu nejsou vidět všechny kroky.");
      assert(
        await page.locator('input[name="packageSlug"][value="florida-week"]').isChecked(),
        "Výlet ze staršího ?balicek= není předvyplněný.",
      );

      await page.locator('input[name="licence"][value="Nemám"]').check();
      await page.locator("#f-kdy").fill("podzim 2027");
      await page.locator('input[name="pilotCount"][value="1"]').check();
      await page.locator("#f-jmeno").fill(`E2E Bez JS ${stamp}`);
      await page.locator("#f-email").fill("spatny-email");
      await waitMinFill(loadedAt);

      // Chybu najde až server, hodnoty zůstanou ve formuláři.
      await page.getByRole("button", { name: "Odeslat poptávku" }).click();
      await page.locator(".fa-err", { hasText: "Zadejte e-mail ve tvaru jmeno@domena.cz." }).waitFor();
      // Licence Nemám: nápověda z požadavků na piloty i bez skriptu (po návratu ze serveru).
      await page.locator("#f-licence-pozn").waitFor();
      assert(
        (await page.locator("#f-jmeno").inputValue()) === `E2E Bez JS ${stamp}`,
        "Po chybě ze serveru zmizelo jméno.",
      );
      assert((await page.locator("#f-kdy").inputValue()) === "podzim 2027", "Po chybě ze serveru zmizel termín.");

      await page.locator("#f-email").fill(email);
      await page.getByRole("button", { name: "Odeslat poptávku" }).click();
      await page.locator(".kt-done h2", { hasText: "Děkujeme, poptávka je odeslaná" }).waitFor();
      await assertInquiryRow(sql, email, {
        kind: "inquiry",
        licence: "Nemám",
        package_slug: "florida-week",
        travel_date: "podzim 2027",
        pilot_count: "1",
      });
    } finally {
      await sql`delete from inquiries where email = ${email}`;
      await sql.end();
    }
  },
  { ...visitor(), javaScriptEnabled: false, reducedMotion: "reduce" },
);

test(
  "Zavolejte mi na webu",
  async (page, credentials) => {
    const sql = database(credentials);
    const name = `E2E Zavolat ${Date.now()}`;
    try {
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      const loadedAt = Date.now();
      const form = page.locator("#zavolam");
      // Informace o zpracování údajů i u tohoto formuláře.
      await form.getByRole("link", { name: "Zásady zpracování osobních údajů" }).waitFor();

      await form.getByRole("button", { name: "Zavolejte mi" }).click();
      await form.locator(".fa-err", { hasText: "Napište své jméno." }).waitFor();

      await form.getByLabel("Jméno").fill(name);
      await form.getByLabel("Telefon").fill("602 000 222");
      await waitMinFill(loadedAt);
      await form.getByRole("button", { name: "Zavolejte mi" }).click();
      await form.getByRole("status").filter({ hasText: `Děkujeme, Honza vám zavolá ${REPLY_TIME}.` }).waitFor();

      const rows = await sql`select kind, phone from inquiries where name = ${name}`;
      assert(rows.length === 1 && rows[0].kind === "callback", `Žádosti o zavolání v databázi: ${JSON.stringify(rows)}`);
    } finally {
      await sql`delete from inquiries where name = ${name}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

/** Požadavek na server action formulářů stránky Kontakt (POST na /kontakt). */
const isContactPost = (request) =>
  request.method() === "POST" && new URL(request.url()).pathname === "/kontakt";

/**
 * Výpadek sítě při odeslání poptávky: vyplněné údaje zůstanou, místo
 * chybové stránky Next („This page couldn’t load“) česká hláška
 * s telefonem. Po obnovení sítě jde stejný formulář odeslat.
 */
test(
  "poptávka na webu: výpadek sítě zachová údaje",
  async (page, credentials) => {
    const sql = database(credentials);
    const stamp = Date.now();
    const email = `e2e-sit-${stamp}@test.local`;
    const name = `E2E Výpadek ${stamp}`;
    try {
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      const loadedAt = Date.now();
      await fillInquiry(page, { email, name });
      await waitMinFill(loadedAt);

      await page.route(
        (url) => url.pathname === "/kontakt",
        (route) => (isContactPost(route.request()) ? route.abort("internetdisconnected") : route.continue()),
      );
      await page.getByRole("button", { name: "Odeslat poptávku" }).click();
      const alert = page.locator("#poptavka [role=alert]");
      await alert.filter({ hasText: /Poptávku se nepodařilo odeslat/ }).waitFor();
      const message = await plainText(alert);
      assert(
        message === "Poptávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte Honzovi: +420 602 214 719.",
        `Hláška po výpadku: "${message}"`,
      );

      // Žádná chybová stránka, formulář na kroku 3 se všemi údaji.
      assert((await page.getByText(/couldn.t load/i).count()) === 0, "Ukázala se chybová stránka Next.");
      await page.getByRole("heading", { level: 1, name: "Napište, kdy chcete letět." }).waitFor();
      await page.locator("#krok-3.is-current").waitFor();
      for (const [selector, value] of [
        ["#f-jmeno", name],
        ["#f-email", email],
        ["#f-telefon", "+420 602 000 111"],
        ["#f-zprava", "Zpráva z e2e testu."],
        ["#f-kdy", "březen 2027"],
      ]) {
        const actual = await page.locator(selector).inputValue();
        assert(actual === value, `Po výpadku sítě ${selector}: "${actual}"`);
      }
      for (const selector of [
        'input[name="licence"][value="PPL"]',
        'input[name="packageSlug"][value="grand-tour"]',
        'input[name="pilotCount"][value="2"]',
        'input[name="companions"][value="Ano"]',
      ]) {
        assert(await page.locator(selector).isChecked(), `Po výpadku sítě není zaškrtnuté ${selector}.`);
      }
      const [{ n }] = await sql`select count(*)::int as n from inquiries where email = ${email}`;
      assert(n === 0, `Poptávka bez sítě je v databázi (${n}).`);
      // Rozepsaná poptávka zůstala i v sessionStorage (návrat na stránku po výpadku).
      const draft = JSON.parse((await readDraft(page, DRAFT_INQUIRY)) ?? "null");
      assert(draft?.step === 2 && draft.values.email === email, `Po výpadku sítě v sessionStorage: ${JSON.stringify(draft)}`);

      // Síť zase jde: stejný formulář se odešle.
      await page.unrouteAll({ behavior: "wait" });
      await page.getByRole("button", { name: "Odeslat poptávku" }).click();
      await page.locator(".kt-done h2", { hasText: "Děkujeme, poptávka je odeslaná" }).waitFor();
      await assertInquiryRow(sql, email, { kind: "inquiry", licence: "PPL", package_slug: "grand-tour" });
    } finally {
      await sql`delete from inquiries where email = ${email}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

/**
 * Chyba serveru při „Zavolejte mi“ (odpověď 500 místo odpovědi server
 * action, třeba výpadek funkce na Vercelu): údaje zůstanou, česká hláška.
 */
test(
  "Zavolejte mi: chyba serveru zachová údaje",
  async (page, credentials) => {
    const sql = database(credentials);
    const name = `E2E Zavolat chyba ${Date.now()}`;
    try {
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      const loadedAt = Date.now();
      const form = page.locator("#zavolam");
      await form.getByLabel("Jméno").fill(name);
      await form.getByLabel("Telefon").fill("602 000 333");
      await waitMinFill(loadedAt);

      await page.route(
        (url) => url.pathname === "/kontakt",
        (route) =>
          isContactPost(route.request())
            ? route.fulfill({ status: 500, contentType: "text/html", body: "<h1>Internal Server Error</h1>" })
            : route.continue(),
      );
      await form.getByRole("button", { name: "Zavolejte mi" }).click();
      const alert = form.getByRole("alert");
      await alert.filter({ hasText: /Číslo se nepodařilo odeslat/ }).waitFor();
      const message = await plainText(alert);
      assert(
        message === "Číslo se nepodařilo odeslat. Zkuste to prosím znovu, nebo zavolejte Honzovi: +420 602 214 719.",
        `Hláška po chybě serveru: "${message}"`,
      );
      assert((await form.getByLabel("Jméno").inputValue()) === name, "Po chybě serveru zmizelo jméno.");
      assert((await form.getByLabel("Telefon").inputValue()) === "602 000 333", "Po chybě serveru zmizel telefon.");

      await page.unrouteAll({ behavior: "wait" });
      await form.getByRole("button", { name: "Zavolejte mi" }).click();
      await form.getByRole("status").filter({ hasText: `Děkujeme, Honza vám zavolá ${REPLY_TIME}.` }).waitFor();
      const rows = await sql`select kind from inquiries where name = ${name}`;
      assert(rows.length === 1, `Žádosti o zavolání v databázi: ${rows.length}`);
    } finally {
      await sql`delete from inquiries where name = ${name}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

/**
 * Krok 2: volby výletu s délkou a cenou od z dat výletů (úprava 8), bez
 * odkazu Porovnat výlety a bez řádku nápovědy. Cenu mění oblast výletů,
 * test proto hlídá jen tvar „od <číslo> USD za osobu“. Sloupec kontaktů
 * s řádkem WhatsApp a spisovou značkou (úpravy 21 a 7) je sekce (úprava 38).
 */
test(
  "Kontakt: volby výletu s cenou, WhatsApp a spisová značka",
  async (page) => {
    await page.goto(`${BASE_URL}/kontakt`);
    const option = async (slug) =>
      plainText(page.locator(`#f-vylet label`, { has: page.locator(`input[value="${slug}"]`) }));
    const price = String.raw`od \$?\d[\d ]*\d USD za osobu`;
    for (const [slug, start] of [
      ["florida-week", String.raw`Florida Week & Fly - \d+ dní, `],
      ["grand-tour", String.raw`Florida Grand Tour & Fly - \d+ dní, `],
    ]) {
      const label = await option(slug);
      assert(new RegExp(`^${start}${price}$`).test(label), `Volba výletu ${slug}: "${label}"`);
    }
    assert((await option("nevim")) === "Zatím nevím, poradíme se", `Volba Zatím nevím: "${await option("nevim")}"`);
    assert((await page.locator("#f-vylet .fa-hint").count()) === 0, "Pod volbami výletu zůstal řádek nápovědy.");
    assert(
      (await page.locator("#poptavka").getByRole("link", { name: "Porovnat výlety" }).count()) === 0,
      "Ve formuláři zůstal odkaz Porovnat výlety.",
    );
    const hint = await plainText(page.locator("#f-kdy-hint"));
    assert(hint === "Stačí měsíc nebo rozmezí. Když ještě nevíte, napište to.", `Nápověda termínu: "${hint}"`);

    // Sloupec kontaktů: sekce s nadpisem Kontakt, ne doplňkový panel.
    const contacts = page.getByRole("region", { name: "Kontakt", exact: true });
    await contacts.waitFor();
    assert((await page.locator("aside.kt-contacts").count()) === 0, "Sloupec kontaktů je pořád <aside>.");
    const facts = Object.fromEntries(
      await contacts.locator(".kt-facts > div").evaluateAll((rows) =>
        rows.map((row) => [
          row.querySelector("dt").innerText.replace(/\s+/g, " ").trim().toLowerCase(),
          row.querySelector("dd").innerText.replace(/\s+/g, " ").trim(),
        ]),
      ),
    );
    // innerText čte i skrytou část odkazu pro čtečky (.vh).
    assert(facts.whatsapp === "Napsat zprávu na WhatsApp", `Řádek WhatsApp: ${JSON.stringify(facts.whatsapp)}`);
    const whatsapp = contacts.getByRole("link", { name: "Napsat zprávu na WhatsApp" });
    assert(
      (await whatsapp.getAttribute("href")) === "https://wa.me/420602214719",
      `Odkaz WhatsApp: ${await whatsapp.getAttribute("href")}`,
    );
    assert(
      facts["spisová značka"] === "C 236725, Městský soud v Praze",
      `Spisová značka: ${JSON.stringify(facts["spisová značka"])}`,
    );
    // Úvod bloku Nechte číslo (úprava 16).
    const callIntro = await plainText(page.locator(".kt-call > p"));
    assert(callIntro === "Stačí jméno a telefon.", `Úvod Nechte číslo: "${callIntro}"`);
  },
  visitor(),
);

/**
 * Rozepsaná poptávka (úprava 8): hodnoty polí a krok jsou v sessionStorage
 * karty, po odchodu jinam na webu a návratu Zpět i po novém načtení se
 * obnoví. Výlet z adresy má přednost před uloženým. Po odeslání se smaže.
 */
test(
  "poptávka na webu: rozepsaná poptávka přežije odchod a návrat",
  async (page, credentials) => {
    const sql = database(credentials);
    const stamp = Date.now();
    const email = `e2e-koncept-${stamp}@test.local`;
    try {
      const current = () => page.locator(".kt-step.is-current");
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      await page.locator('input[name="licence"][value="CPL/ATPL"]').check();
      await page.locator("#f-onas").fill("Létám C172, 300 hodin.");
      await current().getByRole("button", { name: "Pokračovat" }).click();
      await page.locator("#krok-2.is-current").waitFor();
      await page.locator('input[name="packageSlug"][value="grand-tour"]').check();
      await page.locator("#f-kdy").fill("duben 2027");
      await page.locator('input[name="pilotCount"][value="1"]').check();

      // Uložená jsou jen pole formuláře a krok, ne token ani past na roboty.
      const saved = JSON.parse((await readDraft(page, DRAFT_INQUIRY)) ?? "null");
      assert(saved?.step === 1, `Uložený krok: ${JSON.stringify(saved)}`);
      assert(saved.values.travelDate === "duben 2027", `Uložené hodnoty: ${JSON.stringify(saved.values)}`);
      assert(!("formToken" in saved.values) && !("website" in saved.values), "V sessionStorage je token nebo past.");

      const assertRestored = async (where, packageSlug) => {
        await page.locator("#krok-2.is-current").waitFor();
        assert((await page.locator("#f-kdy").inputValue()) === "duben 2027", `${where}: termín se neobnovil.`);
        assert((await page.locator("#f-onas").inputValue()) === "Létám C172, 300 hodin.", `${where}: text o pilotovi.`);
        for (const selector of [
          'input[name="licence"][value="CPL/ATPL"]',
          `input[name="packageSlug"][value="${packageSlug}"]`,
          'input[name="pilotCount"][value="1"]',
        ]) {
          assert(await page.locator(selector).isChecked(), `${where}: není zaškrtnuté ${selector}.`);
        }
      };

      // Odchod jinam na webu (menu) a Zpět v prohlížeči.
      await page.getByRole("navigation", { name: "Hlavní menu" }).getByRole("link", { name: "Letecké výlety" }).click();
      await page.waitForURL(`${BASE_URL}/letecke-vylety`);
      await page.goBack();
      await page.waitForURL(`${BASE_URL}/kontakt`);
      await assertRestored("Po návratu Zpět", "grand-tour");

      // Nové načtení (telefon kartu na pozadí zahodil).
      await page.reload();
      await page.waitForLoadState("networkidle");
      await assertRestored("Po novém načtení", "grand-tour");

      // Odkaz „Poptat tento výlet“ s jiným výletem: výlet z adresy má přednost.
      await page.goto(`${BASE_URL}/kontakt?vylet=florida-week#poptavka`);
      await page.waitForLoadState("networkidle");
      const loadedAt = Date.now();
      await assertRestored("S ?vylet=florida-week", "florida-week");
      const chosen = await plainText(page.locator("#kt-vybrano strong"));
      assert(chosen === "Florida Week & Fly", `Poptáváte: "${chosen}"`);

      await current().getByRole("button", { name: "Pokračovat" }).click();
      await page.locator("#krok-3.is-current").waitFor();
      await page.locator("#f-jmeno").fill(`E2E Koncept ${stamp}`);
      await page.locator("#f-email").fill(email);
      await waitMinFill(loadedAt);
      await page.getByRole("button", { name: "Odeslat poptávku" }).click();
      await page.locator(".kt-done h2", { hasText: "Děkujeme, poptávka je odeslaná" }).waitFor();
      assert((await readDraft(page, DRAFT_INQUIRY)) === null, "Po odeslání zůstala poptávka v sessionStorage.");
      await assertInquiryRow(sql, email, {
        licence: "CPL/ATPL",
        package_slug: "florida-week",
        travel_date: "duben 2027",
        pilot_count: "1",
      });

      // Po odeslání a novém načtení je formulář prázdný na kroku 1.
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.locator("#krok-1.is-current").waitFor();
      assert((await page.locator("#f-kdy").inputValue()) === "", "Po odeslání se obnovila stará poptávka.");
    } finally {
      await sql`delete from inquiries where email = ${email}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

/**
 * Pomalá síť (úprava 8): během odesílání tlačítko „Odesílám…“
 * s aria-disabled, formulář aria-busy, čtečka to slyší z oblasti aria-live
 * a fokus zůstane na tlačítku. Další kliknutí a Enter během odesílání
 * poptávku nezdvojí.
 */
test(
  "poptávka na webu: pomalé odeslání ukáže Odesílám… a nezdvojí se",
  async (page, credentials) => {
    const sql = database(credentials);
    const stamp = Date.now();
    const email = `e2e-pomalu-${stamp}@test.local`;
    let posts = 0;
    page.on("request", (request) => {
      if (isContactPost(request)) posts++;
    });
    try {
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      const loadedAt = Date.now();
      await fillInquiry(page, { email, name: `E2E Pomalu ${stamp}` });
      await waitMinFill(loadedAt);

      const restore = await slowNetwork(page, 2_500);
      const button = page.locator("#krok-3 button[type=submit]");
      await button.click();
      await button.filter({ hasText: "Odesílám…" }).waitFor();
      assert((await button.getAttribute("aria-disabled")) === "true", "Tlačítko během odesílání nemá aria-disabled.");
      assert((await button.evaluate((el) => el.disabled)) === false, "Tlačítko je disabled, fokus by z něj spadl.");
      assert((await page.locator("#poptavka").getAttribute("aria-busy")) === "true", "Formulář nemá aria-busy.");
      const live = page.locator("#poptavka + [aria-live=polite]");
      assert((await plainText(live)) === "Odesílám…", `Ohlášení čtečce: "${await plainText(live)}"`);
      assert(await button.evaluate((el) => el === document.activeElement), "Fokus během odesílání není na tlačítku.");

      // Netrpělivý návštěvník: další kliknutí a Enter během odesílání.
      await button.click({ force: true });
      await page.keyboard.press("Enter");
      await page.locator(".kt-done h2", { hasText: "Děkujeme, poptávka je odeslaná" }).waitFor({ timeout: 30_000 });
      await restore();
      await sleep(500);

      assert(posts === 1, `Odeslání na server: ${posts}, čekal jsem 1.`);
      const [{ n }] = await sql`select count(*)::int as n from inquiries where email = ${email}`;
      assert(n === 1, `Poptávek v databázi: ${n}`);
      assert((await page.locator("#poptavka").getAttribute("aria-busy")) === null, "Formulář po odeslání zůstal aria-busy.");
      assert((await plainText(live)) === "", `Ohlášení po odeslání nezmizelo: "${await plainText(live)}"`);
    } finally {
      await sql`delete from inquiries where email = ${email}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

/**
 * Nechte číslo (úprava 8): rozepsané jméno a telefon přežijí nové načtení,
 * při pomalé síti „Odesílám…“ a druhé kliknutí nic nezdvojí, po odeslání
 * je sessionStorage prázdné.
 */
test(
  "Zavolejte mi: rozepsané číslo přežije návrat, odesílání je vidět",
  async (page, credentials) => {
    const sql = database(credentials);
    const name = `E2E Zavolat koncept ${Date.now()}`;
    let posts = 0;
    page.on("request", (request) => {
      if (isContactPost(request)) posts++;
    });
    try {
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      const form = page.locator("#zavolam");
      await form.getByLabel("Jméno").fill(name);
      await form.getByLabel("Telefon").fill("602 000 444");

      await page.reload();
      await page.waitForLoadState("networkidle");
      const loadedAt = Date.now();
      assert((await form.getByLabel("Jméno").inputValue()) === name, "Po novém načtení zmizelo jméno.");
      assert((await form.getByLabel("Telefon").inputValue()) === "602 000 444", "Po novém načtení zmizel telefon.");
      await waitMinFill(loadedAt);

      const restore = await slowNetwork(page, 2_500);
      const button = form.locator("button[type=submit]");
      await button.click();
      await button.filter({ hasText: "Odesílám…" }).waitFor();
      assert((await button.getAttribute("aria-disabled")) === "true", "Tlačítko během odesílání nemá aria-disabled.");
      assert((await form.getAttribute("aria-busy")) === "true", "Formulář nemá aria-busy.");
      const live = page.locator("#zavolam + [aria-live=polite]");
      assert((await plainText(live)) === "Odesílám…", `Ohlášení čtečce: "${await plainText(live)}"`);
      await button.click({ force: true });
      await form.getByRole("status").filter({ hasText: `Děkujeme, Honza vám zavolá ${REPLY_TIME}.` }).waitFor({
        timeout: 30_000,
      });
      await restore();
      await sleep(500);

      assert(posts === 1, `Odeslání na server: ${posts}, čekal jsem 1.`);
      assert((await readDraft(page, DRAFT_CALLBACK)) === null, "Po odeslání zůstalo číslo v sessionStorage.");
      const rows = await sql`select kind from inquiries where name = ${name}`;
      assert(rows.length === 1, `Žádostí o zavolání v databázi: ${rows.length}`);
    } finally {
      await sql`delete from inquiries where name = ${name}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

/**
 * Vlastní hláška Nechte číslo při limitu (úprava 30): po 5 žádostech za
 * hodinu z jedné adresy (MAX_PER_IP_PER_HOUR v src/lib/inquiries/spam.ts)
 * hláška s Honzovým telefonem, ne s e-mailem. Údaje zůstanou ve formuláři.
 */
test(
  "Zavolejte mi: vlastní hláška při limitu žádostí",
  async (page, credentials) => {
    const sql = database(credentials);
    const base = `E2E Zavolat limit ${Date.now()}`;
    const limit = 5;
    try {
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      await waitMinFill(Date.now());
      const form = page.locator("#zavolam");
      for (let i = 1; i <= limit; i++) {
        await form.getByLabel("Jméno").fill(`${base} ${i}`);
        await form.getByLabel("Telefon").fill("602 000 555");
        await form.getByRole("button", { name: "Zavolejte mi" }).click();
        // Po odeslání jsou pole prázdná, při chybě by v nich údaje zůstaly.
        await page.waitForFunction(() => document.querySelector("#z-jmeno")?.value === "");
      }

      await form.getByLabel("Jméno").fill(`${base} navíc`);
      await form.getByLabel("Telefon").fill("602 000 555");
      await form.getByRole("button", { name: "Zavolejte mi" }).click();
      const alert = form.getByRole("alert");
      await alert.filter({ hasText: /víc žádostí/ }).waitFor();
      const message = await plainText(alert);
      assert(
        message ===
          "Z vaší adresy přišlo za poslední hodinu víc žádostí. Zkuste to prosím později, nebo zavolejte Honzovi: +420 602 214 719.",
        `Hláška při limitu: "${message}"`,
      );
      assert((await form.getByLabel("Jméno").inputValue()) === `${base} navíc`, "Po hlášce o limitu zmizelo jméno.");
      const [{ n }] = await sql`select count(*)::int as n from inquiries where name like ${`${base}%`}`;
      assert(n === limit, `Žádostí o zavolání v databázi: ${n}, čekal jsem ${limit}.`);
    } finally {
      await sql`delete from inquiries where name like ${`${base}%`}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

/**
 * Obnovená poptávka odeslaná hned po načtení (nález z kontroly 14. 10. 2026):
 * kdo se vrátí do zahozené karty, má formulář ze sessionStorage hned
 * hotový. Server odmítne odeslání do 3 s od vykreslení (MIN_FILL_MS),
 * formulář proto odeslání o zbytek doby pozdrží s „Odesílám…“ místo hlášky
 * „Zkontrolujte prosím údaje…“.
 */
test(
  "poptávka na webu: obnovená poptávka odeslaná hned po načtení projde",
  async (page, credentials) => {
    const sql = database(credentials);
    const stamp = Date.now();
    const email = `e2e-hned-${stamp}@test.local`;
    try {
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      await fillInquiry(page, { email, name: `E2E Hned ${stamp}` });

      await page.reload();
      await page.locator("#krok-3.is-current").waitFor();
      assert((await page.locator("#f-email").inputValue()) === email, "Po novém načtení se poptávka neobnovila.");
      const button = page.locator("#krok-3 button[type=submit]");
      await button.click();
      await button.filter({ hasText: "Odesílám…" }).waitFor();
      await page.locator(".kt-done h2", { hasText: "Děkujeme, poptávka je odeslaná" }).waitFor({ timeout: 20_000 });
      assert(
        (await page.getByText("Zkontrolujte prosím údaje a odešlete formulář znovu.").count()) === 0,
        "Rychlé odeslání obnovené poptávky skončilo hláškou pro roboty.",
      );
      await assertInquiryRow(sql, email, { package_slug: "grand-tour", travel_date: "březen 2027" });
    } finally {
      await sql`delete from inquiries where email = ${email}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);

/** Totéž u Nechte číslo: obnovené jméno a telefon odeslané hned po načtení. */
test(
  "Zavolejte mi: obnovené číslo odeslané hned po načtení projde",
  async (page, credentials) => {
    const sql = database(credentials);
    const name = `E2E Zavolat hned ${Date.now()}`;
    try {
      await page.goto(`${BASE_URL}/kontakt`);
      await page.waitForLoadState("networkidle");
      const form = page.locator("#zavolam");
      await form.getByLabel("Jméno").fill(name);
      await form.getByLabel("Telefon").fill("602 000 666");

      await page.reload();
      await page.waitForFunction((value) => document.querySelector("#z-jmeno")?.value === value, name);
      await form.getByRole("button", { name: "Zavolejte mi" }).click();
      await form.getByRole("status").filter({ hasText: `Děkujeme, Honza vám zavolá ${REPLY_TIME}.` }).waitFor({
        timeout: 20_000,
      });
      const rows = await sql`select kind from inquiries where name = ${name}`;
      assert(rows.length === 1, `Žádostí o zavolání v databázi: ${rows.length}`);
    } finally {
      await sql`delete from inquiries where name = ${name}`;
      await sql.end();
    }
  },
  { ...visitor(), reducedMotion: "reduce" },
);
