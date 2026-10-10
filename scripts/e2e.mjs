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
  return { email, password };
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
