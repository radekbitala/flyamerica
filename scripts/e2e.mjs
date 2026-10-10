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
 * Přihlašovací údaje testovacího admina bere z .env.development.local
 * (zapisuje je scripts/local-db.mjs). Jiná adresa: E2E_BASE_URL=...,
 * viditelný prohlížeč: E2E_HEADED=1. Při chybě uloží snímek do test-results/.
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
const test = (name, fn) => tests.push({ name, fn });

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
  for (const name of ["Přehled", "Deník", "Poptávky"]) {
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
 * poznámka, archivace a smazání. Poptávka se vkládá rovnou do databáze,
 * formulář na webu ještě není a testovací stránka do produkčního kódu
 * nepatří. Validaci server action pokrývá scripts/test-inquiry-action.mjs.
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

/**
 * Deník v administraci: koncept, úprava, publikace, kontrola v seznamu
 * a smazání. Bez nahrávání fotek, lokálně úložiště nastavené není.
 * Předpokládá přihlášeného admina. S databaseUrl po sobě článek uklidí,
 * i když test spadne uprostřed.
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
    await page.getByRole("heading", { level: 1, name: "Deník" }).waitFor();
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
    await row.getByText(`/denik/${slug}`).waitFor();

    // Publikovaný článek: Uložit změny, ne Publikovat.
    await row.getByRole("link", { name: edited, exact: true }).click();
    await page.waitForURL(editUrl);
    await page.getByRole("button", { name: "Uložit změny" }).waitFor();

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

test("deník v administraci", async (page, credentials) => {
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

  let failed = 0;
  try {
    for (const { name, fn } of tests) {
      const context = await browser.newContext({ locale: "cs-CZ" });
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

  console.log(`\n${tests.length - failed}/${tests.length} testů prošlo.`);
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
