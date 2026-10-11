#!/usr/bin/env node
/**
 * Test přesměrování starých adres proti běžícímu serveru (next dev nebo
 * next start):
 *   npx next dev -p 3201
 *   node scripts/test-redirects.mjs
 *
 * Adresy k vyzkoušení: zdroje pravidel ze src/data/redirects.json (s lomítkem
 * na konci i bez, ukázkové adresy pro :path* a :rok, /?p=ID) a když je vedle
 * repozitáře ../migrace/redirects.csv, i všechny adresy starého webu z něj.
 * Pro každou adresu musí platit:
 * - cíl je stejný, jaký by dalo první pravidlo pro adresu bez lomítka na
 *   konci (pořadí pravidel, matcher z Next.js), u adresy z CSV navíc stejný
 *   jako v CSV,
 * - nejvýš jedno přesměrování (308) a cíl vrátí 200 bez dalšího přesměrování,
 * - jiná adresa s lomítkem na konci (/kontakt/, /denik/<slug>/) jedním 308
 *   na adresu bez lomítka, stránky webu, soubory z public a /_next/static
 *   se nepřesměrovávají,
 * - adresy, které v CSV mají „(bez přesměrování)“ (/wp-admin/ a podobně),
 *   žádné pravidlo nezachytí: nejvýš odstranění lomítka na konci, pak 404,
 *   u /?p=ID úvod.
 *
 * Jiná adresa serveru: BASE_URL=http://localhost:3203.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match");

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3201").replace(/\/$/, "");
const CSV = path.join(ROOT, "..", "migrace", "redirects.csv");
const CONCURRENCY = 8;

const rules = JSON.parse(readFileSync(path.join(ROOT, "src/data/redirects.json"), "utf8")).map((rule) => ({
  ...rule,
  match: getPathMatch(rule.source, { strict: true, removeUnnamedParams: true }),
}));

/** Cíl podle prvního pravidla, které adresu (bez lomítka na konci) zachytí, jinak null. */
function expectedDestination(pathname, search) {
  const bare = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const query = new URLSearchParams(search);
  for (const rule of rules) {
    if (!rule.match(bare)) continue;
    const has = (rule.has ?? []).every(
      (item) => item.type === "query" && query.has(item.key) && new RegExp(`^${item.value}$`).test(query.get(item.key)),
    );
    if (has) return rule.destination;
  }
  return null;
}

/** Ukázkové adresy pro pravidlo ze src/data/redirects.json. */
function samples(rule) {
  if (rule.has) {
    const p = rule.has.find((item) => item.type === "query" && item.key === "p");
    return p && /^\d+$/.test(p.value) ? [`/?p=${p.value}`] : [];
  }
  const source = rule.source;
  if (source.includes(":file(")) return []; // jednotlivé soubory, pokrývá je CSV
  const base = source.replace(/\/:path[*+]$/, "").replace(":rok(\\d{4})", "2016");
  if (/:/.test(base)) return [];
  const out = [];
  if (!source.endsWith(":path+")) out.push(base);
  if (/:path[*+]$/.test(source)) out.push(`${base}/neco`, `${base}/neco/dalsi`);
  return out.flatMap((sample) => (sample === "/" ? [sample] : [sample, `${sample}/`]));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

/** Adresy starého webu z migrace (stará, nová): s lomítkem i bez, kromě souborů. */
function csvCases() {
  if (!existsSync(CSV)) return [];
  const [, ...rows] = parseCsv(readFileSync(CSV, "utf8").replace(/^﻿/, ""));
  const cases = [];
  for (const [old, destination] of rows) {
    // Vzory („<rok>/<měsíc>/…“, „*“) nejsou adresy, pokrývají je ukázky z pravidel.
    if (!old || /[*<]/.test(old)) continue;
    const url = new URL(old);
    const extra = destination?.startsWith("/")
      ? { csvDestination: destination }
      : destination === "(bez přesměrování)"
        ? { noRedirect: true }
        : {};
    cases.push({ path: url.pathname + url.search, ...extra });
    if (url.pathname !== "/" && !/\.[a-z0-9]{2,4}$/i.test(url.pathname)) {
      const other = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : `${url.pathname}/`;
      cases.push({ path: other + url.search, ...extra });
    }
  }
  return cases;
}

const PAGES = [
  "/",
  "/balicek-florida-week",
  "/balicek-grand-tour",
  "/tipy-na-vylety",
  "/o-honzovi",
  "/denik",
  "/kontakt",
  "/zasady-zpracovani-osobnich-udaju",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/og/og-image.jpg",
];

async function main() {
  try {
    await fetch(`${BASE_URL}/`, { redirect: "manual" });
  } catch {
    throw new Error(`Server na ${BASE_URL} neodpovídá. Spusťte npx next dev -p 3201.`);
  }

  // Soubor z /_next/static, který stránka opravdu načítá.
  const home = await (await fetch(`${BASE_URL}/`)).text();
  const asset = /(?:href|src)="(\/_next\/static\/[^"?]+)"/.exec(home)?.[1];
  if (!asset) throw new Error("Úvod nenačítá nic z /_next/static.");

  // Článek z cílů přesměrování (existuje, jinak by test cílů selhal).
  const article = rules.map((rule) => rule.destination).find((d) => d.startsWith("/denik/"));

  const cases = [
    ...rules.flatMap((rule) => samples(rule).map((sample) => ({ path: sample }))),
    ...csvCases(),
    { path: "/kontakt/", expect: "/kontakt" },
    { path: "/denik/", expect: "/denik" },
    { path: `${article}/`, expect: article },
    { path: "/admin/", expect: "/admin" },
    { path: "/neexistujici-adresa/", expect: "/neexistujici-adresa" },
    { path: "/?p=99999", expect: null },
    ...PAGES.map((page) => ({ path: page, expect: null })),
    { path: asset, expect: null },
  ];
  const unique = [...new Map(cases.map((c) => [c.path, c])).values()];

  const errors = [];
  const destinations = new Map();
  let index = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (index < unique.length) {
        const c = unique[index++];
        const url = new URL(c.path, BASE_URL);
        const ruleDestination = "expect" in c ? null : expectedDestination(url.pathname, url.search);
        const expected =
          "expect" in c
            ? c.expect
            : (ruleDestination ??
              (url.pathname.length > 1 && url.pathname.endsWith("/") ? url.pathname.replace(/\/+$/, "") : null));
        if (c.csvDestination && expected !== c.csvDestination) {
          errors.push(`${c.path}: pravidla vedou na ${expected}, CSV na ${c.csvDestination}`);
          continue;
        }
        if (c.noRedirect) {
          // Bez pravidla, nejvýš odstranění lomítka na konci. Pak 404, u /?p=ID úvod.
          const final = await fetch(url, { redirect: "follow" });
          const wantStatus = url.pathname === "/" ? 200 : 404;
          const wantUrl = new URL((expected ?? url.pathname) + url.search, BASE_URL).href;
          if (ruleDestination !== null || final.status !== wantStatus || final.url !== wantUrl) {
            errors.push(`${c.path}: čekáno ${wantStatus} bez přesměrování, je ${final.status} na ${final.url}`);
          }
          continue;
        }

        const res = await fetch(url, { redirect: "manual" });
        if (expected === null) {
          if (res.status >= 300 && res.status < 400) {
            errors.push(`${c.path}: přesměrování na ${res.headers.get("location")}, čekáno bez přesměrování`);
          } else if (PAGES.includes(c.path) || c.path === asset) {
            if (res.status !== 200) errors.push(`${c.path}: stav ${res.status}`);
          }
          continue;
        }
        const location = res.headers.get("location");
        const target = location ? new URL(location, url) : null;
        const want = new URL(expected, BASE_URL);
        if (res.status !== 308 || !target || target.pathname !== want.pathname || target.hash !== want.hash) {
          errors.push(`${c.path}: ${res.status} na ${location}, čekáno 308 na ${expected}`);
          continue;
        }
        // Cíl pravidla musí existovat. Odstranění lomítka u neznámé adresy (/neexistujici/) smí skončit 404.
        if (ruleDestination !== null || c.csvDestination) {
          destinations.set(want.pathname, (destinations.get(want.pathname) ?? 0) + 1);
        }
      }
    }),
  );

  // Každý cíl vrátí 200 bez dalšího přesměrování.
  for (const destination of destinations.keys()) {
    const res = await fetch(`${BASE_URL}${destination}`, { redirect: "manual" });
    if (res.status !== 200) errors.push(`cíl ${destination}: stav ${res.status}`);
  }

  const fromCsv = unique.filter((c) => c.csvDestination || c.noRedirect).length;
  console.log(
    `Adres: ${unique.length} (z toho z migrace/redirects.csv ${fromCsv}${existsSync(CSV) ? "" : ", CSV chybí"}), ` +
      `pravidel: ${rules.length}, cílů: ${destinations.size}.`,
  );
  if (errors.length) {
    for (const error of errors.slice(0, 40)) console.log(`CHYBA  ${error}`);
    console.log(`\n${errors.length} chyb.`);
    process.exit(1);
  }
  console.log("Všechny staré adresy vedou jedním přesměrováním (308) na cíl se stavem 200.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
