#!/usr/bin/env node
/**
 * E2E testy přes systémový Chrome (playwright-core, prohlížeče Playwrightu
 * se nestahují).
 *
 * Předpoklad: běží lokální databáze a vývojový server:
 *   npm run db:local
 *   npx next dev -p 3201
 *   npm run e2e
 *
 * Testy veřejného webu počítají s ukázkovými daty z npm run db:local. Když
 * je v lokální databázi i importovaný deník (node scripts/import-denik.mjs
 * --local) a běží server s jeho fotkami na 127.0.0.1:8816 (README, Import
 * deníku), prověří navíc články ze starého webu.
 *
 * Přihlašovací údaje testovacího admina bere z .env.development.local
 * (zapisuje je scripts/local-db.mjs). Jiná adresa: E2E_BASE_URL=...,
 * viditelný prohlížeč: E2E_HEADED=1, jen některé testy: E2E_ONLY=část názvu.
 * Při chybě uloží snímek do test-results/.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { chromium } from "playwright-core";
import postgres from "postgres";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3201").replace(/\/$/, "");
const RESULTS_DIR = path.join(ROOT, "test-results");

function loadTestEnv() {
  const file = path.join(ROOT, ".env.development.local");
  const env = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
  const email = process.env.TEST_ADMIN_EMAIL ?? env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD ?? env.TEST_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Chybí TEST_ADMIN_EMAIL a TEST_ADMIN_PASSWORD. Spusťte npm run db:local.");
  }
  // Testy, které si připravují data rovnou v databázi (poptávky).
  const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;
  return { email, password, databaseUrl };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tests = [];
/** options = volby kontextu prohlížeče (javaScriptEnabled, viewport, hlavičky). */
const test = (name, fn, options = {}) => tests.push({ name, fn, options });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Spojení na lokální databázi pro přípravu dat a kontrolu výsledku. */
function database({ databaseUrl }) {
  if (!databaseUrl) throw new Error("Chybí DATABASE_URL. Spusťte npm run db:local.");
  return postgres(databaseUrl, { max: 1, onnotice: () => {} });
}

/**
 * Adresa testovacího návštěvníka pro limit poptávek z jedné IP (hlavička
 * x-real-ip, src/lib/inquiries/spam.ts). Rozsah 198.51.100.0/24 je
 * vyhrazený pro dokumentaci, každý test má jinou adresu.
 */
let ipCounter = Math.floor(Math.random() * 200);
const visitor = () => ({ extraHTTPHeaders: { "x-real-ip": `198.51.100.${1 + (ipCounter++ % 254)}` } });

/** Formulář na webu odeslaný dřív než 3 s po vykreslení server odmítne (MIN_FILL_MS). */
const MIN_FILL_MS = 3_000;
async function waitMinFill(loadedAt) {
  await sleep(Math.max(0, MIN_FILL_MS + 400 - (Date.now() - loadedAt)));
}

/** Kolik px stránka přetéká do strany. */
const overflowX = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Odpověď bez následování přesměrování. */
const fetchManual = (url) => fetch(`${BASE_URL}${url}`, { redirect: "manual" });

// ---------------------------------------------------------------------------
// Testy
// ---------------------------------------------------------------------------

test("přihlášení testovacího admina a přehled", async (page, { email, password }) => {
  // Nepřihlášeného administrace pošle na přihlášení.
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForURL(`${BASE_URL}/admin/login`);

  // Špatné heslo neprojde.
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("spatne-heslo");
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await page.getByRole("alert").filter({ hasText: "Nesprávný e-mail nebo heslo." }).waitFor();

  // Správné heslo vede na přehled.
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await page.waitForURL(`${BASE_URL}/admin`);
  await page.getByRole("heading", { level: 1, name: "Přehled" }).waitFor();

  const nav = page.getByRole("navigation", { name: "Administrace" });
  for (const name of ["Přehled", "Z cest", "Poptávky"]) {
    await nav.getByRole("link", { name, exact: true }).waitFor();
  }

  // Počty jdou z databáze, ukázková data mají publikovaný článek.
  const published = await page.getByRole("link", { name: /Publikované články/ }).innerText();
  assert(/\d+/.test(published), `Karta publikovaných článků bez čísla: "${published}"`);

  // Odhlášení ukončí session.
  await page.getByRole("button", { name: "Odhlásit" }).click();
  await page.waitForURL(`${BASE_URL}/admin/login`);
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForURL(`${BASE_URL}/admin/login`);
});

/** Přihlásí testovacího admina a počká na přehled. */
async function login(page, { email, password }) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await page.waitForURL(`${BASE_URL}/admin`);
}

/**
 * Poptávky v administraci: přehled, seznam s filtrem, detail, změna stavu,
 * poznámka, archivace a smazání. Poptávka se kvůli rychlosti vkládá rovnou
 * do databáze, odeslání formulářů na webu prověřují testy veřejného webu
 * níž a validaci server action scripts/test-inquiry-action.mjs.
 */
async function testPoptavky(page, credentials) {
  if (!credentials.databaseUrl) {
    throw new Error("Chybí DATABASE_URL. Spusťte npm run db:local.");
  }
  const sql = postgres(credentials.databaseUrl, { max: 1, onnotice: () => {} });
  const stamp = Date.now();
  const name = `E2E Poptávka ${stamp}`;
  const email = `e2e-${stamp}@test.local`;
  const rowLink = () => page.getByRole("link", { name: new RegExp(name) });
  let id;

  try {
    [{ id }] = await sql`
      insert into inquiries (kind, licence, about_pilot, package_slug, travel_date,
        pilot_count, companions, name, email, phone, referral_source, message,
        consent, consent_at)
      values ('inquiry', 'PPL', ${"Nalétáno 120 hodin.\nLétám C172."}, 'grand-tour',
        'březen 2027', '2', 'Ano', ${name}, ${email}, '+420 602 000 111',
        'Z vyhledávače', 'Testovací zpráva pro e2e', true, now())
      returning id`;

    await login(page, credentials);

    // Přehled: poptávka je mezi posledními.
    await page.getByRole("region", { name: "Poslední poptávky" }).getByRole("link", { name: new RegExp(name) }).waitFor();

    // Seznam: filtr Nové, poptávka v něm, odkaz na detail.
    await page.getByRole("link", { name: "Poptávky", exact: true }).first().click();
    await page.getByRole("heading", { level: 1, name: "Poptávky" }).waitFor();
    const filters = page.getByRole("navigation", { name: "Filtr podle stavu" });
    await filters.getByRole("link", { name: /^Nové \d+$/ }).click();
    await page.waitForURL(`${BASE_URL}/admin/poptavky?stav=new`);
    await rowLink().click();
    await page.waitForURL(`${BASE_URL}/admin/poptavky/${id}`);

    // Detail: všechna pole a odkazy na e-mail a telefon.
    await page.getByRole("heading", { level: 1, name }).waitFor();
    const mailHref = await page.getByRole("link", { name: email }).getAttribute("href");
    assert(mailHref === `mailto:${email}`, `Odkaz na e-mail: "${mailHref}"`);
    const telHref = await page.getByRole("link", { name: "+420 602 000 111" }).getAttribute("href");
    assert(telHref === "tel:+420602000111", `Odkaz na telefon: "${telHref}"`);
    for (const text of [
      "Florida Grand Tour & Fly",
      "březen 2027",
      "PPL",
      "Z vyhledávače",
      "Testovací zpráva pro e2e",
      "Nalétáno 120 hodin.",
    ]) {
      await page.getByText(text).first().waitFor();
    }

    // Změna stavu.
    const statusGroup = page.getByRole("group", { name: "Stav poptávky" });
    await statusGroup.getByRole("button", { name: "Rozpracovaná", exact: true }).click();
    await page.getByText("Stav změněn: Rozpracovaná").waitFor();
    await statusGroup.getByRole("button", { name: "Rozpracovaná", pressed: true }).waitFor();
    const [afterStatus] = await sql`select status from inquiries where id = ${id}`;
    assert(afterStatus.status === "in_progress", `Stav v databázi: ${afterStatus.status}`);

    // Interní poznámka přežije znovunačtení stránky.
    const noteText = "Zavolat v pondělí, chce letět se synem.";
    await page.getByLabel("Interní poznámka").fill(noteText);
    await page.getByRole("button", { name: "Uložit poznámku" }).click();
    await page.getByText("Poznámka uložená").waitFor();
    await page.reload();
    const savedNote = await page.getByLabel("Interní poznámka").inputValue();
    assert(savedNote === noteText, `Poznámka po načtení: "${savedNote}"`);
    const [afterNote] = await sql`select internal_note from inquiries where id = ${id}`;
    assert(afterNote.internal_note === noteText, "Poznámka není v databázi.");

    // Filtr podle stavu: je mezi rozpracovanými, mezi novými už ne.
    await page.goto(`${BASE_URL}/admin/poptavky?stav=in_progress`);
    await rowLink().waitFor();
    await page.goto(`${BASE_URL}/admin/poptavky?stav=new`);
    assert((await rowLink().count()) === 0, "Rozpracovaná poptávka je pořád mezi novými.");

    // Archivace: zmizí z výchozího seznamu, zůstane v archivu.
    await page.goto(`${BASE_URL}/admin/poptavky/${id}`);
    await statusGroup.getByRole("button", { name: "Archivovaná", exact: true }).click();
    await page.getByText("Stav změněn: Archivovaná").waitFor();
    await page.goto(`${BASE_URL}/admin/poptavky`);
    assert((await rowLink().count()) === 0, "Archivovaná poptávka je ve výchozím seznamu.");
    await page.goto(`${BASE_URL}/admin/poptavky?stav=archived`);
    await rowLink().click();
    await page.waitForURL(`${BASE_URL}/admin/poptavky/${id}`);

    // Trvalé smazání až po potvrzení v dialogu.
    await page.getByRole("button", { name: "Smazat trvale" }).click();
    const dialog = page.getByRole("dialog", { name: "Smazat poptávku trvale?" });
    await dialog.getByRole("button", { name: "Zrušit" }).click();
    await dialog.waitFor({ state: "hidden" });
    const [kept] = await sql`select count(*)::int as n from inquiries where id = ${id}`;
    assert(kept.n === 1, "Poptávka zmizela bez potvrzení.");
    await page.getByRole("button", { name: "Smazat trvale" }).click();
    await dialog.getByRole("button", { name: "Smazat", exact: true }).click();
    await page.waitForURL(/\/admin\/poptavky(\?.*)?$/);
    await page.getByText("Smazáno").waitFor();
    const [gone] = await sql`select count(*)::int as n from inquiries where id = ${id}`;
    assert(gone.n === 0, "Poptávka po smazání zůstala v databázi.");

    // Neexistující a neplatné id skončí na stránce Nenalezeno.
    for (const missing of [id, "neni-uuid"]) {
      await page.goto(`${BASE_URL}/admin/poptavky/${missing}`);
      await page.getByRole("heading", { level: 1, name: "Nenalezeno" }).waitFor();
    }
  } finally {
    if (id) await sql`delete from inquiries where id = ${id}`;
    await sql.end();
  }
}

test("poptávky v administraci", testPoptavky);

/** Je článek vidět na webu? Detail, seznam Z cest a mapa webu. */
async function publicPost(slug) {
  const article = await fetchManual(`/z-cest/${slug}`);
  const list = await (await fetch(`${BASE_URL}/z-cest`)).text();
  const sitemap = await (await fetch(`${BASE_URL}/sitemap.xml`)).text();
  return {
    status: article.status,
    inList: list.includes(`href="/z-cest/${slug}"`),
    inSitemap: sitemap.includes(`/z-cest/${slug}</loc>`),
  };
}

function assertHidden(state, when) {
  assert(
    state.status === 404 && !state.inList && !state.inSitemap,
    `${when}: článek je na webu vidět (${JSON.stringify(state)}).`,
  );
}

/**
 * Články (Z cest) v administraci: koncept, úprava, publikace, kontrola
 * v seznamu, vrácení do konceptů a smazání, u každého kroku i to, co je
 * vidět na webu (detail, /z-cest, sitemap.xml). Bez nahrávání fotek, lokálně úložiště
 * nastavené není. Předpokládá přihlášeného admina. S databaseUrl po sobě
 * článek uklidí, i když test spadne uprostřed.
 */
async function testDenik(page, { databaseUrl } = {}) {
  const stamp = Date.now().toString(36);
  const title = `E2E článek ${stamp}`;
  const edited = `${title} upravený`;
  const slug = `e2e-clanek-${stamp}`;
  const editor = page.getByRole("textbox", { name: "Text článku" });
  const titleField = page.getByLabel("Název", { exact: true });
  const isAction = (response) =>
    response.request().method() === "POST" && "next-action" in response.request().headers();

  try {
    // Karta Koncepty na přehledu vede na seznam s filtrem konceptů.
    await page.goto(`${BASE_URL}/admin`);
    await page.getByRole("link", { name: /Koncepty$/ }).click();
    await page.waitForURL(`${BASE_URL}/admin/posts?stav=draft`);
    await page.getByRole("button", { name: /^Koncepty/, pressed: true }).waitFor();
    assert(
      (await page.locator("tbody tr").filter({ hasText: "Publikováno" }).count()) === 0,
      "Filtr konceptů ukazuje publikovaný článek.",
    );

    // Nový koncept.
    await page.goto(`${BASE_URL}/admin/posts`);
    await page.getByRole("heading", { level: 1, name: "Z cest" }).waitFor();
    await page.getByRole("link", { name: "Nový článek" }).click();
    await page.waitForURL(`${BASE_URL}/admin/posts/new`);
    // Editor se vykreslí až po hydrataci, do té doby by React vyplněný
    // název přepsal.
    await editor.waitFor();
    await titleField.fill(title);
    const generatedSlug = await page.getByLabel("Adresa článku").inputValue();
    assert(generatedSlug === slug, `Adresa z názvu: "${generatedSlug}"`);
    await editor.click();
    await page.keyboard.type("První odstavec z e2e testu.");
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}\/edit/);
    await page.getByRole("heading", { level: 1, name: "Upravit článek" }).waitFor();
    await page.getByText("Koncept uložen").waitFor();
    const editUrl = page.url().replace(/\?.*$/, "");
    assertHidden(await publicPost(slug), "Koncept");

    // Úprava konceptu: název i text, adresa zůstává.
    await titleField.fill(edited);
    // Klik doprostřed jednořádkového odstavce = kurzor za poslední slovo
    // (klávesa End na macOS kurzor neposune).
    await editor.locator("p").first().click();
    await page.keyboard.type(" Doplněná věta.");
    await Promise.all([
      page.waitForResponse(isAction),
      page.getByRole("button", { name: "Uložit koncept" }).click(),
    ]);
    // Přesměrování po uložení nechat doběhnout, goto by ho přerušilo.
    await page.waitForLoadState("networkidle");
    await page.goto(editUrl);
    assert((await titleField.inputValue()) === edited, "Upravený název se neuložil.");
    assert(
      (await page.getByLabel("Adresa článku").inputValue()) === slug,
      "Adresa se po změně názvu změnila.",
    );
    await editor.getByText("Doplněná věta.").waitFor();

    // Publikace vede na seznam, článek je publikovaný.
    await page.getByRole("button", { name: "Publikovat" }).click();
    await page.waitForURL(/\/admin\/posts(\?.*)?$/);
    await page.getByText("Článek publikován").waitFor();
    const row = page.getByRole("row").filter({ hasText: edited });
    await row.getByText("Publikováno").waitFor();
    await row.getByText(`/z-cest/${slug}`).waitFor();

    // Publikovaný článek je hned na webu: detail, seznam Z cest a mapa webu.
    const published = await publicPost(slug);
    assert(
      published.status === 200 && published.inList && published.inSitemap,
      `Publikovaný článek na webu: ${JSON.stringify(published)}`,
    );

    // Publikovaný článek: Uložit změny, ne Publikovat.
    await row.getByRole("link", { name: edited, exact: true }).click();
    await page.waitForURL(editUrl);
    await page.getByRole("button", { name: "Uložit změny" }).waitFor();

    // Vrácení do konceptů článek z webu zase stáhne.
    await page.getByRole("button", { name: "Vrátit do konceptů" }).click();
    await page.getByText("Článek vrácen do konceptů").waitFor();
    await page.getByRole("button", { name: "Publikovat" }).waitFor();
    assertHidden(await publicPost(slug), "Po vrácení do konceptů");

    // Smazání až po potvrzení v dialogu.
    await page.getByRole("button", { name: "Smazat článek" }).click();
    const dialog = page.getByRole("dialog", { name: "Smazat článek?" });
    await dialog.getByRole("button", { name: "Smazat", exact: true }).click();
    await page.waitForURL(/\/admin\/posts(\?.*)?$/);
    await page.getByText("Článek smazán").waitFor();
    assert(
      (await page.getByRole("row").filter({ hasText: edited }).count()) === 0,
      "Smazaný článek je pořád v seznamu.",
    );
  } finally {
    if (databaseUrl) {
      const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
      try {
        await sql`delete from posts where slug = ${slug}`;
      } finally {
        await sql.end();
      }
    }
  }
}

test("články Z cest v administraci", async (page, credentials) => {
  await login(page, credentials);
  await testDenik(page, credentials);
});

/**
 * Přihlášení vyprší uprostřed psaní (odhlášení v jiné záložce, smazané
 * cookies): uložení vrátí hlášku a rozepsaný text zůstane v editoru.
 */
test("vypršelé přihlášení neztratí rozepsaný článek", async (page, credentials) => {
  const stamp = Date.now().toString(36);
  const title = `E2E vypršelé přihlášení ${stamp}`;
  const text = "Text, který se nesmí ztratit.";
  const editor = page.getByRole("textbox", { name: "Text článku" });

  try {
    await login(page, credentials);
    await page.goto(`${BASE_URL}/admin/posts/new`);
    await editor.waitFor();
    await page.getByLabel("Název", { exact: true }).fill(title);
    await editor.click();
    await page.keyboard.type(text);

    await page.context().clearCookies();
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByRole("alert").filter({ hasText: "Přihlášení vypršelo." }).waitFor();
    await editor.getByText(text).waitFor();

    // Přihlášení v nové záložce a uložení stejného formuláře.
    const second = await page.context().newPage();
    await login(second, credentials);
    await second.close();
    await page.getByRole("button", { name: "Uložit koncept" }).click();
    await page.getByText("Koncept uložen").waitFor();
    // Hláška z adresy zmizí až po dokončení navigace (ToastOnParam).
    await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}\/edit$/);
    await editor.getByText(text).waitFor();
  } finally {
    if (credentials.databaseUrl) {
      const sql = postgres(credentials.databaseUrl, { max: 1, onnotice: () => {} });
      try {
        await sql`delete from posts where title = ${title}`;
      } finally {
        await sql.end();
      }
    }
  }
});

/** Po změně hesla (vyšší session_version) přestane dřívější přihlášení platit. */
test("změna hesla odhlásí přihlášená zařízení", async (page, credentials) => {
  if (!credentials.databaseUrl) throw new Error("Chybí DATABASE_URL. Spusťte npm run db:local.");
  await login(page, credentials);
  const sql = postgres(credentials.databaseUrl, { max: 1, onnotice: () => {} });
  try {
    // Totéž dělá scripts/create-admin.mjs při změně hesla.
    await sql`update admin_users set session_version = session_version + 1
      where email = ${credentials.email}`;
  } finally {
    await sql.end();
  }
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForURL(`${BASE_URL}/admin/login`);
  await login(page, credentials);
});

/** Po 10 špatných heslech z jedné adresy se přihlášení na 15 minut zablokuje. */
test("omezení pokusů o přihlášení", async (page, credentials) => {
  if (!credentials.databaseUrl) throw new Error("Chybí DATABASE_URL. Spusťte npm run db:local.");
  const sql = postgres(credentials.databaseUrl, { max: 1, onnotice: () => {} });
  const button = page.getByRole("button", { name: "Přihlásit se" });
  const submit = async (password) => {
    await page.getByLabel("Heslo").fill(password);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
      button.click(),
    ]);
    // Během požadavku má tlačítko text Přihlašuji..., hláška je hotová,
    // až když se vrátí.
    await button.waitFor();
    // Formulář, ne oznamovač navigace z Next (taky role alert).
    return (await page.locator("form").getByRole("alert").innerText()).trim();
  };

  try {
    await sql`delete from login_attempts`;
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("E-mail").fill(credentials.email);
    for (let i = 1; i <= 10; i++) {
      const message = await submit(`spatne-heslo-${i}`);
      assert(message === "Nesprávný e-mail nebo heslo.", `Pokus ${i}: "${message}"`);
    }
    // Jedenáctý pokus neprojde ani se správným heslem.
    const blocked = await submit(credentials.password);
    assert(blocked.startsWith("Příliš mnoho neúspěšných pokusů"), `Po 10 pokusech: "${blocked}"`);
    assert(page.url() === `${BASE_URL}/admin/login`, "Zablokované přihlášení prošlo.");

    // Po vypršení okna (tady smazání záznamů) přihlášení funguje a pokusy vynuluje.
    await sql`delete from login_attempts`;
    await submit("spatne-heslo");
    await login(page, credentials);
    const [{ n }] = await sql`select count(*)::int as n from login_attempts`;
    assert(n === 0, `Po úspěšném přihlášení zůstalo ${n} pokusů.`);
  } finally {
    await sql`delete from login_attempts`;
    await sql.end();
  }
});

/** Administrace na šířce telefonu nepřetéká do strany (tabulka článků, galerie). */
test("administrace na telefonu", async (page, credentials) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, credentials);
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  for (const url of ["/admin", "/admin/posts", "/admin/poptavky"]) {
    await page.goto(`${BASE_URL}${url}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const px = await overflow();
    assert(px <= 0, `${url} přetéká o ${px} px.`);
  }

  // Ukázkový článek z scripts/local-db.mjs má galerii se dvěma fotkami.
  await page.goto(`${BASE_URL}/admin/posts`);
  await page.getByRole("link", { name: "Ukázkový článek s galerií", exact: true }).click();
  await page.getByRole("heading", { level: 3, name: "Galerie 1" }).waitFor();
  const px = await overflow();
  assert(px <= 0, `Úprava článku s galerií přetéká o ${px} px.`);
});

// ---------------------------------------------------------------------------
// Veřejný web
// ---------------------------------------------------------------------------

/** Stránky webu (src/app/sitemap.ts). */
const PUBLIC_PAGES = [
  "/",
  "/letecke-vylety",
  "/letecke-vylety/florida-week",
  "/letecke-vylety/grand-tour",
  "/kam-letet",
  "/kam-letet/fa83",
  "/kam-letet/key-west-everglades",
  "/z-cest",
  "/vas-mentor",
  "/kontakt",
  "/zasady-zpracovani-osobnich-udaju",
];

test("veřejný web: úvod, výlet a stránky na telefonu", async (page) => {
  const response = await page.goto(`${BASE_URL}/`);
  assert(response?.status() === 200, `Úvod vrátil ${response?.status()}.`);
  // Bezpečnostní hlavičky z next.config.ts, bez X-Powered-By.
  const headers = response.headers();
  assert(headers["x-frame-options"] === "DENY", `X-Frame-Options: ${headers["x-frame-options"]}`);
  assert(headers["x-content-type-options"] === "nosniff", "Chybí X-Content-Type-Options.");
  assert(!("x-powered-by" in headers), "Odpověď prozrazuje X-Powered-By.");

  await page.getByRole("heading", { level: 1 }).waitFor();
  // Kotva, na kterou vede přesměrování ze starého webu (/validace/).
  assert((await page.locator("#postup").count()) === 1, "Úvod nemá kotvu #postup.");
  // Z cest na úvodu z databáze: nejnovější článek a odkaz na všechny články, bez podpisu.
  const diary = page.locator("#z-cest");
  const latest = await diary.getByRole("link", { name: /Číst celý článek/ }).getAttribute("href");
  assert(/^\/z-cest\/[a-z0-9-]+$/.test(latest ?? ""), `Odkaz na nejnovější článek: ${latest}`);
  await diary.getByRole("link", { name: "Všechny články" }).waitFor();
  assert((await diary.locator(".sig").count()) === 0, "Úvod podepisuje článek, autor v databázi není.");

  // Menu: Letecké výlety, Kam letět, Z cest, Váš mentor, Kontakt. Na detailu
  // výletu je položka sekce aktivní (aria-current="true"), na stránce sekce "page".
  const menu = page.getByRole("navigation", { name: "Hlavní menu" });
  const labels = (await menu.getByRole("link").allInnerTexts()).map((label) => label.trim());
  assert(
    JSON.stringify(labels) === JSON.stringify(["Letecké výlety", "Kam letět", "Z cest", "Váš mentor", "Kontakt"]),
    `Menu: ${JSON.stringify(labels)}`,
  );
  await page.goto(`${BASE_URL}/z-cest`);
  assert((await menu.getByRole("link", { name: "Z cest" }).getAttribute("aria-current")) === "page", "Z cest v menu není aktivní.");

  // Výlet: výzva vede na poptávku s předvyplněným výletem.
  await page.goto(`${BASE_URL}/letecke-vylety/florida-week`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert(
    (await menu.getByRole("link", { name: "Letecké výlety" }).getAttribute("aria-current")) === "true",
    "Letecké výlety v menu nejsou na detailu výletu aktivní.",
  );
  assert((await page.getByText(/balíč/i).count()) === 0, "Stránka výletu obsahuje slovo balíček.");
  await page.locator('main a[href^="/kontakt?vylet=florida-week"]').first().click();
  await page.waitForURL(/\/kontakt\?vylet=florida-week/);
  const preset = page.locator('input[name="packageSlug"][value="florida-week"]');
  await preset.waitFor({ state: "attached" });
  assert(await preset.isChecked(), "Výlet z odkazu není ve formuláři předvyplněný.");
  await page.getByText("Poptáváte:").waitFor();

  // Neznámý výlet a neznámá destinace jsou 404.
  for (const url of ["/letecke-vylety/neexistuje", "/kam-letet/neexistuje"]) {
    const res = await fetchManual(url);
    assert(res.status === 404, `${url} vrátila ${res.status}.`);
  }

  // Žádná stránka nepřetéká do strany na šířce telefonu.
  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of PUBLIC_PAGES) {
    const res = await page.goto(`${BASE_URL}${url}`);
    assert(res?.status() === 200, `${url} vrátila ${res?.status()}.`);
    const px = await overflowX(page);
    assert(px <= 0, `${url} na 375 px přetéká o ${px} px.`);
  }
});

/** Vyplní poptávku na tři kroky (s JavaScriptem, Pokračovat mezi kroky). */
async function fillInquiry(page, { email, name }) {
  const current = () => page.locator(".kt-step.is-current");
  // Krok 1 bez licence: hláška z modelu a fokus na první volbu.
  await current().getByRole("button", { name: "Pokračovat" }).click();
  await page.locator(".fa-err", { hasText: "Vyberte licenci, nebo možnost Nemám." }).waitFor();
  await page.locator('input[name="licence"][value="PPL"]').check();
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

      await fillInquiry(page, { email, name: `E2E Web ${stamp}` });
      await waitMinFill(loadedAt);
      await page.getByRole("button", { name: "Odeslat poptávku" }).click();
      await page.locator(".kt-done h2", { hasText: "Děkujeme, poptávka je odeslaná" }).waitFor();
      await page.locator(".kt-done", { hasText: email }).waitFor();

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
      await form.getByRole("status").filter({ hasText: "Děkujeme, Honza se vám ozve." }).waitFor();

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

/** Text bez rozdílu mezi mezerou a pevnou mezerou. */
const plainText = async (locator) => (await locator.innerText()).replace(/\s+/g, " ").trim();

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
      await form.getByRole("status").filter({ hasText: "Děkujeme, Honza se vám ozve." }).waitFor();
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
    // video jen jako odkaz (bez kliknutí žádný požadavek na YouTube a Google).
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

test(
  "404 a přesměrování starých adres",
  async (page) => {
    const res = await page.goto(`${BASE_URL}/neexistujici-adresa-e2e`);
    assert(res?.status() === 404, `Neznámá adresa vrátila ${res?.status()}.`);
    await page.getByRole("heading", { level: 1, name: "Stránka nenalezena" }).waitFor();
    // Patička začíná až pod záhybem, pod ní nezůstane světlý pruh.
    const footerTop = await page.locator("footer").last().evaluate((el) => el.getBoundingClientRect().top);
    assert(footerTop >= 900 - 1, `Patička stránky 404 začíná na ${footerTop} px.`);

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
 * Články importované ze starého webu jde v administraci uložit beze změny
 * (limity popisků a galerií, adresy fotek z 127.0.0.1:8816 při vývoji).
 * Text, značky galerií a galerie zůstanou. Editor přidá prázdný odstavec
 * za galerii na konci a formulář posílá konce řádků jako \r\n, obojí web
 * ignoruje. Bez importu deníku se přeskočí.
 */
test("administrace uloží importované články beze změny", async (page, credentials) => {
  const sql = database(credentials);
  try {
    const posts = await sql`
      select id, slug, content, gallery from posts
      where status = 'published' and image_url like 'http://127.0.0.1:8816/%'
      order by published_at desc`;
    if (posts.length === 0) {
      console.log("         (přeskočeno: lokální databáze je bez importu deníku)");
      return;
    }
    const plain = (html) =>
      html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;| /g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const markers = (html) => [...html.matchAll(/data-gallery="([^"]+)"/g)].map((m) => m[1]).join(",");
    const images = (html) => [...html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]).join(",");
    const galleries = (gallery) =>
      JSON.stringify(
        gallery.map((g) => [g.id, g.items.map((item) => [item.url, item.caption, item.alt ?? null, item.width, item.height])]),
      );

    await login(page, credentials);
    for (const post of posts) {
      await page.goto(`${BASE_URL}/admin/posts/${post.id}/edit`);
      await page.getByRole("textbox", { name: "Text článku" }).waitFor();
      await page.getByRole("button", { name: "Uložit změny" }).click();
      try {
        await page.waitForURL(/\/admin\/posts(\?.*)?$/, { timeout: 30_000 });
      } catch {
        const errors = await page.locator("[role=alert]").allInnerTexts();
        throw new Error(`${post.slug} se neuložil: ${errors.join(" | ")}`);
      }
      const [saved] = await sql`select content, gallery from posts where id = ${post.id}`;
      assert(plain(saved.content) === plain(post.content), `${post.slug}: uložení změnilo text.`);
      assert(markers(saved.content) === markers(post.content), `${post.slug}: uložení změnilo značky galerií.`);
      assert(images(saved.content) === images(post.content), `${post.slug}: uložení změnilo fotky v textu.`);
      assert(galleries(saved.gallery) === galleries(post.gallery), `${post.slug}: uložení změnilo galerie.`);
    }
  } finally {
    await sql.end();
  }
});

// ---------------------------------------------------------------------------

async function main() {
  const credentials = loadTestEnv();

  try {
    await fetch(`${BASE_URL}/admin/login`, { redirect: "manual" });
  } catch {
    throw new Error(`Server na ${BASE_URL} neodpovídá. Spusťte npx next dev -p 3201.`);
  }

  const browser = await chromium.launch({
    channel: "chrome",
    headless: !process.env.E2E_HEADED,
  });

  const only = process.env.E2E_ONLY;
  const selected = only ? tests.filter(({ name }) => name.includes(only)) : tests;
  let failed = 0;
  try {
    for (const { name, fn, options } of selected) {
      const context = await browser.newContext({ locale: "cs-CZ", ...options });
      context.setDefaultTimeout(15_000);
      // První překlad stránky s editorem při next dev trvá i 14 s.
      context.setDefaultNavigationTimeout(60_000);
      const page = await context.newPage();
      try {
        await fn(page, credentials);
        console.log(`ok       ${name}`);
      } catch (error) {
        failed++;
        mkdirSync(RESULTS_DIR, { recursive: true });
        const shot = path.join(RESULTS_DIR, `${name.replace(/[^a-z0-9]+/gi, "-")}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        console.log(`SELHALO  ${name}\n         ${error instanceof Error ? error.message : error}\n         snímek: ${path.relative(ROOT, shot)}`);
      } finally {
        // Dobíhající navigaci (třeba odstranění ?toast= z adresy) nechat
        // doběhnout, jinak by dev server hlásil přerušený stream.
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${selected.length - failed}/${selected.length} testů prošlo.`);
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
