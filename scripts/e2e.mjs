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
 * Testy jsou od 14. 10. 2026 rozdělené podle oblastí webu do modulů
 * scripts/e2e/*.mjs (pomocné funkce v scripts/e2e/_lib.mjs), aby je oblasti
 * mohly měnit souběžně. Tenhle soubor je jen spouštěč: načte moduly a spustí
 * testy v pořadí RUN_ORDER.
 *
 * Testy veřejného webu počítají s ukázkovými daty z npm run db:local. Když
 * je v lokální databázi i importovaný deník (node scripts/import-denik.mjs
 * --local) a běží server s jeho fotkami na 127.0.0.1:8816 (README, Import
 * deníku), prověří navíc články ze starého webu.
 *
 * Přihlašovací údaje testovacího admina bere z .env.development.local
 * (zapisuje je scripts/local-db.mjs). Jiná adresa: E2E_BASE_URL=...,
 * viditelný prohlížeč: E2E_HEADED=1, jen některé testy: E2E_ONLY=část názvu,
 * jen jeden modul: E2E_FILE=kontakt (název souboru v scripts/e2e bez .mjs).
 * Při chybě uloží snímek do test-results/.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { BASE_URL, ROOT, loadTestEnv, setModule, tests } from "./e2e/_lib.mjs";

const RESULTS_DIR = path.join(ROOT, "test-results");
const MODULES_DIR = path.join(import.meta.dirname, "e2e");

/**
 * Pořadí při plném běhu: [modul, část] (část nastavuje part() v modulu).
 * Odpovídá pořadí testů z doby, kdy byly v jednom souboru: uložení
 * importovaných článků v administraci (admin, část 2) je poslední, protože
 * články mění.
 */
const RUN_ORDER = [
  ["admin", 1],
  ["uvod-vylety", 1],
  ["globalni", 1],
  ["kam-letet", 1],
  ["kontakt", 1],
  ["globalni", 2],
  ["z-cest", 1],
  ["globalni", 3],
  ["admin", 2],
];
const MODULES = [...new Set(RUN_ORDER.map(([name]) => name))];

/** E2E_FILE: název modulu, i s příponou nebo cestou (scripts/e2e/kontakt.mjs). */
function selectedModule() {
  const file = process.env.E2E_FILE;
  if (!file) return null;
  const name = path.basename(file).replace(/\.mjs$/, "");
  if (!MODULES.includes(name)) {
    throw new Error(`E2E_FILE: modul „${name}“ neexistuje. Moduly: ${MODULES.join(", ")}.`);
  }
  return name;
}

/** Načte moduly (každý zaregistruje své testy) a vrátí testy v pořadí RUN_ORDER. */
async function loadTests(only) {
  if (!only) {
    // Modul, který v RUN_ORDER chybí, by se tiše nespustil.
    const files = readdirSync(MODULES_DIR).filter((file) => file.endsWith(".mjs") && !file.startsWith("_"));
    const missing = files.filter((file) => !MODULES.includes(file.replace(/\.mjs$/, "")));
    if (missing.length) throw new Error(`Moduly mimo RUN_ORDER ve scripts/e2e.mjs: ${missing.join(", ")}.`);
  }
  for (const name of only ? [only] : MODULES) {
    const file = path.join(MODULES_DIR, `${name}.mjs`);
    if (!existsSync(file)) throw new Error(`Chybí modul ${path.relative(ROOT, file)}.`);
    setModule(name);
    await import(pathToFileURL(file).href);
  }
  const ordered = RUN_ORDER.flatMap(([name, part]) =>
    tests.filter((entry) => entry.module === name && entry.part === part),
  );
  const unlisted = tests.filter((entry) => !ordered.includes(entry));
  if (unlisted.length) {
    const names = unlisted.map((entry) => `${entry.module} část ${entry.part}: ${entry.name}`).join("; ");
    throw new Error(`Testy v části, která v RUN_ORDER není: ${names}.`);
  }
  return ordered;
}

async function main() {
  const credentials = loadTestEnv();
  const all = await loadTests(selectedModule());

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
  const selected = only ? all.filter(({ name }) => name.includes(only)) : all;
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
