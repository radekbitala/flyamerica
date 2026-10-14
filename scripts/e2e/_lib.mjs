/**
 * Společné pomocné funkce e2e testů (scripts/e2e.mjs spouští moduly
 * scripts/e2e/*.mjs). Modul registruje testy přes test(), spouštěč je pak
 * spustí v pořadí RUN_ORDER ze scripts/e2e.mjs.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import postgres from "postgres";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3201").replace(/\/$/, "");

export function loadTestEnv() {
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

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ---------------------------------------------------------------------------
// Registrace testů
// ---------------------------------------------------------------------------

/** Všechny registrované testy: { name, fn, options, module, part }. */
export const tests = [];
let currentModule = null;
let currentPart = 1;

/** Spouštěč nastaví před načtením modulu, testy modulu se zapíšou pod jeho název. */
export function setModule(name) {
  currentModule = name;
  currentPart = 1;
}

/**
 * Část modulu pro další testy. Při plném běhu jdou části modulů v pořadí
 * RUN_ORDER ze scripts/e2e.mjs (stejné pořadí testů jako před rozdělením
 * 14. 10. 2026). Bez part() je všechno v části 1.
 */
export function part(n) {
  currentPart = n;
}

/** options = volby kontextu prohlížeče (javaScriptEnabled, viewport, hlavičky). */
export const test = (name, fn, options = {}) =>
  tests.push({ name, fn, options, module: currentModule, part: currentPart });

// ---------------------------------------------------------------------------
// Pomocné funkce
// ---------------------------------------------------------------------------

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Spojení na lokální databázi pro přípravu dat a kontrolu výsledku. */
export function database({ databaseUrl }) {
  if (!databaseUrl) throw new Error("Chybí DATABASE_URL. Spusťte npm run db:local.");
  return postgres(databaseUrl, { max: 1, onnotice: () => {} });
}

/**
 * Adresa testovacího návštěvníka pro limit poptávek z jedné IP (hlavička
 * x-real-ip, src/lib/inquiries/spam.ts). Rozsah 198.51.100.0/24 je
 * vyhrazený pro dokumentaci, každý test má jinou adresu.
 */
let ipCounter = Math.floor(Math.random() * 200);
export const visitor = () => ({ extraHTTPHeaders: { "x-real-ip": `198.51.100.${1 + (ipCounter++ % 254)}` } });

/** Formulář na webu odeslaný dřív než 3 s po vykreslení server odmítne (MIN_FILL_MS). */
const MIN_FILL_MS = 3_000;
export async function waitMinFill(loadedAt) {
  await sleep(Math.max(0, MIN_FILL_MS + 400 - (Date.now() - loadedAt)));
}

/** Kolik px stránka přetéká do strany. */
export const overflowX = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Odpověď bez následování přesměrování. */
export const fetchManual = (url) => fetch(`${BASE_URL}${url}`, { redirect: "manual" });

/** Přihlásí testovacího admina a počká na přehled. */
export async function login(page, { email, password }) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await page.waitForURL(`${BASE_URL}/admin`);
}

/** Text bez rozdílu mezi mezerou a pevnou mezerou. */
export const plainText = async (locator) => (await locator.innerText()).replace(/\s+/g, " ").trim();

/** Stránky webu (src/app/sitemap.ts). */
export const PUBLIC_PAGES = [
  "/",
  "/letecke-vylety",
  "/letecke-vylety/florida-week",
  "/letecke-vylety/grand-tour",
  "/kam-letet",
  "/kam-letet/fa83",
  "/kam-letet/palatka",
  "/kam-letet/key-west-everglades",
  "/z-cest",
  "/vas-mentor",
  "/kontakt",
  "/zasady-zpracovani-osobnich-udaju",
];
