#!/usr/bin/env node
/**
 * Import deníku ze starého webu (WordPress) do databáze tohoto webu.
 *
 *   node scripts/import-denik.mjs            suchý běh: zkontroluje data a fotky, vypíše souhrn, nic nezapíše
 *   node scripts/import-denik.mjs --local    zapíše články do lokální databáze (npm run db:local)
 *   node scripts/import-denik.mjs --ostre    nahraje fotky do bucketu "denik" a zapíše články do ostré databáze
 *
 * Další přepínače:
 *   --aktualizovat       přepíše články, které už v databázi jsou (podle slugu), i s úpravami z administrace
 *   --jen=slug[,slug]    jen vybrané články
 *   --zdroj=<složka>     složka s převodem deníku, výchozí ../migrace vedle repa
 *
 * Vstup: <zdroj>/posts.json a fotky <zdroj>/storage/<slug>/<soubor>.jpg, popis v migrace/MIGRACE.md.
 *
 * Proměnné: --local bere DATABASE_URL z .env.development.local (zapisuje ho npm run db:local),
 * --ostre bere SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY a DATABASE_URL z .env.import.local (vzor
 * .env.import.local.example). Proměnné prostředí shellu skript nepoužije, aby omylem nezapsal jinam.
 * Hodnoty klíčů a hesel nikam nevypisuje, z adres jen host.
 *
 * Co se při importu mění oproti posts.json:
 * - Fotky jen JPEG. WebP se nenahrává, formáty pro prohlížeč dělá next/image. Cesta v bucketu
 *   "denik" je "<slug>/<soubor>.jpg", adresa <SUPABASE_URL>/storage/v1/object/public/denik/<cesta>.
 *   Lokálně (--local) http://127.0.0.1:8816/<cesta>, kde fotky servíruje python3 -m http.server
 *   nad <zdroj>/storage (README, Lokální vývoj).
 * - Titulek bez přípony „ | 2016“ (_meta.titleMain), přípona se nikam neukládá.
 * - Galerie NextGEN jako PostGallery { id, items } v pořadí podle "order". alt jen tam, kde se liší
 *   od popisku (GalleryItem.alt).
 * - Blokové galerie WordPressu (fotky s popisky pod sebou v článcích 2019, 2022 a 2023) se převedou
 *   na galerie a na jejich místo přijde značka <p data-gallery="wp-<rok>-<n>"></p>. Hranice bloků
 *   jsou podle původního WordPressu (BLOCK_GALLERIES), skript ověří, že na ně sedí řady fotek v textu.
 * - Úvodní fotka a perex podle klikacího modelu (HERO_FROM_MODEL, PEREX_FROM_MODEL), jinak
 *   z WordPressu. Popis úvodní fotky (image_alt) je alt fotky z modelu.
 * - Popisky fotek opravené v modelu (prototyp/_ZMENY_popisky_2026-10-10.md) mají opravu i v galerii.
 * - alt fotek bez popisku ve tvaru názvu souboru: „001_Venice“ -> „Venice“, „Den2_02“ se vynechá (cleanAlt).
 * - Text článku projde sanitizePostHtml() jako při uložení v administraci.
 * - Kategorie z posts.json do post_categories a post_category_map. Článek 2025 zůstává koncept.
 *
 * Idempotentní podle slugu: existující článek přeskočí, přepíše ho jen --aktualizovat. Fotky,
 * které už v bucketu jsou se stejnou velikostí, se nenahrávají znovu.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseEnv } from "dotenv";
import postgres from "postgres";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

// TypeScript ze src/ načte Node sám (odstranění typů). Háček jako ve
// scripts/test-inquiry-action.mjs: alias @/, přípona .ts a prázdný
// "server-only", který mimo Next schválně vyhazuje chybu.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      specifier = pathToFileURL(path.join(SRC, specifier.slice(2))).href;
    }
    let resolved;
    try {
      resolved = next(specifier, context);
    } catch (error) {
      if (!/^(\.|file:)/.test(specifier) || specifier.endsWith(".ts")) throw error;
      resolved = next(`${specifier}.ts`, context);
    }
    return resolved.url.endsWith(".ts") ? { ...resolved, format: "module-typescript" } : resolved;
  },
});

// Stejné čištění a stejná validace jako v administraci.
const { sanitizePostHtml } = await import("../src/lib/sanitize.ts");
const { postSchema } = await import("../src/lib/post-form.ts");

/** DENIK_BUCKET v src/lib/supabase/admin.ts. */
const BUCKET = "denik";
/** Veřejná adresa projektu Supabase (není to klíč). Pro suchý běh a --local. */
const PROJECT_URL = "https://uwiqbznnnltgwjyvhzcg.supabase.co";
/** Lokální server s fotkami z <zdroj>/storage. */
const LOCAL_BASE = "http://127.0.0.1:8816";
/** Zástupný text v posts.json před cestou fotky. */
const STORAGE_TOKEN = "{{STORAGE}}/denik/";
/** Článek 2025 chybí fotky a závěr, zůstává koncept (MIGRACE.md 4.5). */
const DRAFT_SLUG = "dalsi-prelet-oceanu-2025";
const UPLOAD_CONCURRENCY = 6;

/**
 * Úvodní fotky podle klikacího modelu (../prototyp). Karty v denik.html mají
 * všude tutéž fotku jako WordPress. Článek 2017 Druhý přelet Atlantiku má
 * v modelu vlastní stránku a jako velkou úvodní fotku (.page-photo) Ledové
 * kry (Ferry_036), karta v denik.html má Ferry_010 jako WordPress. Úvodní
 * fotka je jedna pro kartu i článek, platí tedy stránka článku.
 * alt je z modelu (img/_seznam.tsv) včetně oprav pravopisu.
 */
const HERO_FROM_MODEL = {
  "opet-z-vychodu-na-zapad-usa-2023": {
    file: "dscn1105.jpg",
    alt: "Jedno z předměstí Orlanda",
    model: "denik.html karta (img/denik-2023-orlando.jpg)",
  },
  "po-vynucene-pauze-opet-v-usa-2022": {
    file: "03-barvy-podzimu-nad-tenesee.jpg",
    alt: "Barvy podzimu nad Tennessee",
    model: "denik.html karta (img/denik-2022-tennessee.jpg)",
  },
  "vrtulnikem-nad-aligatory-2019": {
    file: "vrtfl19-10-po-pristani-na-albert-whitted-kspg.jpg",
    alt: "Na letišti Albert Whitted, Saint Petersburg",
    model: "denik.html karta (img/denik-2019-albert-whitted-r44.jpg)",
  },
  "objevujeme-letiste-stredni-floridy-2018": {
    file: "g36-013-lakeland-hurricanehunters.jpg",
    alt: "Letadlo lovců hurikánů se chystá ke vzletu k hurikánu Michael na letišti Lakeland (KLAL)",
    model: "denik.html karta (img/denik-2018-lakeland.jpg)",
  },
  "druhy-prelet-atlantiku-2017": {
    file: "g28-ferry-036.jpg",
    alt: "Ledové kry v jednom z grónských fjordů",
    model: "denik-druhy-prelet-atlantiku-2017.html velká fotka (img/denik-2017-ledove-kry.jpg)",
  },
  "po-jihovychode-usa-s-cessnou-i-cirrusem-generace-6-2017": {
    file: "g26-vbr-021.jpg",
    alt: "Rozlétání na typu SR-22, Generace 6, předtím než mi společnost Cirrus Aircraft letadlo zapůjčila.",
    model: "denik.html karta (img/denik-2017-cirrus-g6.jpg)",
  },
  "stredni-floridou-k-miami-a-mezi-letnimi-bourkami-zpet-2017": {
    file: "g24-vanous.jpg",
    alt: "Prohlídka Cessny Mustang na letišti Stuart KSUA",
    model: "denik.html karta (img/denik-2017-stuart-mustang.jpg)",
  },
  "z-vrtulnikove-kalifornie-rovnou-na-floridu-2017": {
    file: "g23-024-aircare.jpg",
    alt: "AirCare",
    model: "denik.html karta (img/denik-2017-aircare.jpg)",
  },
  "letani-po-usa-a-prelet-atlantiku-2016": {
    file: "g25-prelet-03.jpg",
    alt: "Houston Southwest (KAHX)",
    model: "denik.html karta (img/denik-2016-houston.jpg)",
  },
  "oblet-ameriky-2016": {
    file: "023-death-valley-furnace.jpg",
    alt: "Death Valley Furnace",
    model: "denik.html karta (img/denik-2016-death-valley.jpg)",
  },
  "lednove-poletovani-na-floride-2010": {
    file: "g39-1-1po-priletu-do-ny.jpg",
    alt: "Naše letadlo Boeing 767 společnosti Delta na letišti JFK v New Yorku",
    model: "denik.html karta (img/denik-2010-jfk.jpg)",
  },
};

/**
 * Perexy z karet v denik.html (u článku 2025 záhlaví jeho stránky v modelu).
 * Model je zkrátil na celé věty a u Obletu Ameriky vynechal větu se slovem
 * „instruktor“ (_PRAVIDLA.md, část 3). Bez pevných mezer, ty doplní web při
 * vykreslení. Skript ověří, že každý je doslova z textu článku.
 */
const PEREX_FROM_MODEL = {
  "dalsi-prelet-oceanu-2025":
    "Před dvěma lety jsme do Evropy přivezli Cirrus SR22 šesté generace. Loni na podzim však nastal čas na jeho obměnu, jelikož sedmá generace (G7) láká na novou dotykovou avioniku Garmin Cirrus Perspective Touch+, která koncepčně vychází z robustního systému Garmin G3000.",
  "opet-z-vychodu-na-zapad-usa-2023":
    "Tak a je to tady. Amerika 2023 je za námi a nastal čas podělit se o nové zážitky. Tentokrát jsme náš dvoutýdenní pobyt zakončili kurzem pro piloty vrtulníků Robinson v kalifornském Torrance a tak jsme mohli porovnat po delší době obě americká pobřeží, co se týče počasí i celkové atmosféry.",
  "po-vynucene-pauze-opet-v-usa-2022":
    "Tak jsme se konečně dočkali. Určitě jsme nebyli jediní, kdo více než dva roky netrpělivě čekal až se uvolní opatření a zase budeme moci svobodně putovat po světě.",
  "vrtulnikem-nad-aligatory-2019":
    "Všichni dobře vědí, že jsem velkým příznivcem létání v USA a v posledních letech se téměř pravidelně vydávám s klienty na slunnou Floridu užít si komfortu, který USA pro všeobecné letectví nabízí.",
  "objevujeme-letiste-stredni-floridy-2018":
    "Stává se téměř tradicí, že s koncem naší letové sezóny se vydáváme za létáním přes oceán na slunnou Floridu. Ta nám Středoevropanům umožňuje létat i v době, kdy u nás buď řádí podzimní plískanice, nebo jsou rána na letištích zahalena hustou mlhou.",
  "druhy-prelet-atlantiku-2017":
    "Koncem října 2017 jsme pro našeho klienta zajišťovali přelet zbrusu nového letadla Cirrus SR-22 nové 6. generace.",
  "po-jihovychode-usa-s-cessnou-i-cirrusem-generace-6-2017":
    "V polovině října 2017 jsme opět vyrazili na Floridu. U nás v České republice už říjnové počasí přešlo do typicky sychravého a krátkého dne, s ranními mlhami, nízkou oblačností a teplotami kolem 10 st.",
  "stredni-floridou-k-miami-a-mezi-letnimi-bourkami-zpet-2017":
    "V polovině července 2017 jsme zajišťovali létání na Floridě pouze pro jednoho zájemce, ten si chtěl svůj pobyt opravdu užít a neřešit nic než létání. Vypůjčili jsme si tedy opět naši oblíbenou „expediční“ Cessnu 182 a vydali se za dobrodružstvím po floridských letištích podél pobřeží až do Miami.",
  "z-vrtulnikove-kalifornie-rovnou-na-floridu-2017":
    "Dne 14. dubna 2017 jsme zakončili další výpravu s našimi klienty za létáním na Floridě, kam jsme přijeli z bezpečnostního kurzu pro piloty vrtulníků u společnosti Robinson. Na Floridě jsme za pouhých šest letových dní nalétali bezmála 30 letových hodin a navštívili přes 20 různých letišť.",
  "letani-po-usa-a-prelet-atlantiku-2016":
    "Na podzim roku 2016 jsme pro našeho klienta zajišťovali převzetí letadla Piper PA-46 Malibu Mirage (N6094G) v San Antoniu, ve státě Texas.",
  "oblet-ameriky-2016":
    "Společně obletěli jako první Češi celé Spojené státy podél hranice a navštívili i většinu známých přírodních parků.",
  "lednove-poletovani-na-floride-2010":
    "Pokud chce někdo znát hlavní důvod, proč jsme se vydali letos v lednu na Floridu tak stačí, aby se dotyčný podíval z okna. Letošní zima je naprosto šílená, taková jakou jsem znal jen z vyprávění mého dědy.",
};

/**
 * Blokové galerie WordPressu (wp:gallery) podle zálohy starého webu: počet
 * fotek v každém bloku v pořadí v textu. V posts.json jsou to fotky
 * s popiskem pod sebou, tři bloky na konci článku 2023 navazují bez textu.
 */
const BLOCK_GALLERIES = {
  "vrtulnikem-nad-aligatory-2019": { prefix: "wp-2019", sizes: [3, 3, 3, 3, 3] },
  "po-vynucene-pauze-opet-v-usa-2022": { prefix: "wp-2022", sizes: [3, 3, 2, 8] },
  "opet-z-vychodu-na-zapad-usa-2023": { prefix: "wp-2023", sizes: [12, 17, 6] },
};

/**
 * Opravy pravopisu archivních popisků z prototyp/_ZMENY_popisky_2026-10-10.md
 * (rozhodnutí Radka 10. 10.). Model je udělal u fotek, které ukazuje, tady
 * platí pro tytéž fotky v galerii článku (popisek i alt, i delší popisek
 * se stejným začátkem). Každá oprava musí v datech najít aspoň jedno místo.
 */
const CAPTION_FIXES = {
  "druhy-prelet-atlantiku-2017": [
    ["trati Knoxville do Erie (Pensylvania)", "trati z Knoxville do Erie (Pennsylvania)"],
    ['v "divočině" bylo', "v „divočině“ bylo"],
    ["Velkých Amerických jezer", "Velkých amerických jezer"],
    ["množství starší Falconů", "množství starších Falconů"],
    ["Další úsek ze kterého mrazí", "Další úsek, ze kterého mrazí"],
    ["kde se ukládali oběti", "kde se ukládaly oběti"],
    ["Ropné plošiny v severním moři", "Ropné plošiny v Severním moři"],
    [
      "zde mezi Hamburkem a Severním mořem je výrazně",
      "zde mezi Hamburkem a Severním mořem, je výrazně",
    ],
  ],
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STORAGE_PATH = /^(?!.*\.\.)[a-z0-9][a-z0-9._/-]{0,200}$/;

class ImportError extends Error {}

const log = (...parts) => console.log(...parts);
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// ---------------------------------------------------------------- přepínače

function parseArgs(argv) {
  const flags = new Set();
  const options = {};
  for (const arg of argv) {
    const match = /^--(jen|zdroj)=(.*)$/.exec(arg);
    if (match) options[match[1]] = match[2];
    else if (["--local", "--ostre", "--aktualizovat"].includes(arg)) flags.add(arg);
    else throw new ImportError(`neznámý přepínač ${arg} (platí --local, --ostre, --aktualizovat, --jen=, --zdroj=)`);
  }
  if (flags.has("--local") && flags.has("--ostre")) {
    throw new ImportError("--local a --ostre nejdou spolu");
  }
  return {
    mode: flags.has("--ostre") ? "ostre" : flags.has("--local") ? "local" : "dry",
    update: flags.has("--aktualizovat"),
    only: options.jen ? new Set(options.jen.split(",").filter(Boolean)) : null,
    source: path.resolve(options.zdroj ?? path.join(ROOT, "..", "migrace")),
  };
}

// ---------------------------------------------------------------- proměnné

/** Proměnné jen ze souboru, ne z prostředí shellu. Hodnoty se nevypisují. */
function readEnvFile(name, keys) {
  const file = path.join(ROOT, name);
  if (!existsSync(file)) {
    throw new ImportError(`chybí soubor ${name} (postup v README, Import deníku)`);
  }
  const values = parseEnv(readFileSync(file));
  const missing = keys.filter((key) => !values[key]?.trim());
  if (missing.length) throw new ImportError(`v ${name} chybí ${missing.join(", ")}`);
  return Object.fromEntries(keys.map((key) => [key, values[key].trim()]));
}

/** Host a databáze z DATABASE_URL pro výpis, bez jména a hesla. */
function describeDatabase(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    // Zpráva vlastní, chyba URL by obsahovala celou adresu i s heslem.
    throw new ImportError("DATABASE_URL není platná adresa (postgres://...)");
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new ImportError("DATABASE_URL musí začínat postgres:// nebo postgresql://");
  }
  return { host: parsed.hostname, port: parsed.port || "5432", database: parsed.pathname.slice(1) };
}

function supabaseBase(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImportError("SUPABASE_URL není platná adresa (https://<projekt>.supabase.co)");
  }
  if (parsed.protocol !== "https:" || parsed.pathname.replace(/\/+$/, "") !== "") {
    throw new ImportError("SUPABASE_URL má tvar https://<projekt>.supabase.co, bez cesty");
  }
  return parsed.origin;
}

// ---------------------------------------------------------------- pomocné funkce

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_m, entity) => {
    const e = entity.toLowerCase();
    if (e.startsWith("#x")) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#")) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[e];
  });
}

/** Text pro porovnání: bez značek, jednotné uvozovky a mezery. */
function plain(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/[„“”"]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** "denik/<slug>/x.jpg" z posts.json -> "<slug>/x.jpg" (cesta v bucketu). */
function storagePath(file, slug, where) {
  const prefix = `denik/${slug}/`;
  if (typeof file !== "string" || !file.startsWith(prefix) || !file.endsWith(".jpg")) {
    throw new ImportError(`${where}: nečekaná cesta fotky ${file}`);
  }
  const result = file.slice("denik/".length);
  if (!STORAGE_PATH.test(result)) throw new ImportError(`${where}: neplatná cesta ${result}`);
  return result;
}

/** Rozměry JPEG ze značky SOF, bez knihovny. */
function jpegSize(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

/**
 * alt fotek bez popisku je ze starého webu název souboru (MIGRACE.md,
 * otázka 11). Čtečka by ho přečetla doslova:
 * - „001_Venice“, „002_Cape Coral“: pořadí pryč, podtržítka jako mezery („Venice“, „Cape Coral“),
 * - „Den2_02“: jen pořadí, alt se vynechá. Fotka bez popisku i altu má na
 *   webu v mřížce jméno odkazu „Fotka N“ a zvětšení vlastní aria-label.
 */
const ALT_NUMBERED = /^\d{1,4}_(.+)$/;
const ALT_ORDER_ONLY = /^(?:Den)?\d+(?:_\d+)+$/i;
/** Alt, který po úpravě pořád vypadá jako název souboru. Skript ho nepustí. */
const ALT_FILE_NAME = /^\d+_|_\d+$/;
const altFixes = { renamed: 0, dropped: 0 };

function cleanAlt(alt) {
  if (!alt) return alt;
  if (ALT_ORDER_ONLY.test(alt)) {
    altFixes.dropped += 1;
    return "";
  }
  const numbered = ALT_NUMBERED.exec(alt);
  if (numbered) {
    altFixes.renamed += 1;
    return numbered[1].replaceAll("_", " ").replace(/\s+/g, " ").trim();
  }
  return alt;
}

/** Fotka galerie podle GalleryItem v src/lib/db/schema.ts. */
function galleryItem({ path: filePath, width, height, caption, alt: rawAlt, blur }, base) {
  const item = { path: filePath, url: `${base}/${filePath}`, width, height, caption };
  const alt = cleanAlt(rawAlt);
  // alt jen tam, kde se liší od popisku, jinak web použije caption.
  if (alt && alt !== caption) item.alt = alt;
  if (blur) item.blur = blur;
  return item;
}

/** Opravy popisků pro jeden článek, s počítáním použití. */
function captionFixer(slug) {
  const fixes = (CAPTION_FIXES[slug] ?? []).map(([from, to]) => ({ from, to, hits: 0 }));
  const apply = (text) => {
    let result = text;
    for (const fix of fixes) {
      if (result.includes(fix.from)) {
        result = result.replaceAll(fix.from, fix.to);
        fix.hits += 1;
      }
    }
    return result;
  };
  const check = () => {
    const unused = fixes.filter((fix) => fix.hits === 0);
    if (unused.length) {
      throw new ImportError(`${slug}: oprava popisku nenašla text „${unused[0].from}“`);
    }
    return fixes.reduce((sum, fix) => sum + fix.hits, 0);
  };
  return { apply, check };
}

/** Rozměry, náhled a popisky všech fotek článku podle cesty v bucketu. */
function imageIndex(post) {
  const index = new Map();
  const add = (file, record) => {
    const key = storagePath(file, post.slug, post.slug);
    if (!index.has(key)) index.set(key, record);
  };
  for (const im of post._meta?.inlineImages ?? []) {
    add(im.file, { width: im.width, height: im.height, blur: im.blur, alt: im.alt, caption: im.caption });
  }
  for (const gallery of post.gallery ?? []) {
    for (const im of gallery.images) {
      add(im.file, { width: im.width, height: im.height, blur: im.blur, alt: im.alt, caption: im.caption });
    }
  }
  if (post.imageUrl) {
    add(post._meta.imagePath, {
      width: post.imageWidth,
      height: post.imageHeight,
      blur: post.imageBlur,
      alt: null,
      caption: null,
    });
  }
  return index;
}

// ---------------------------------------------------------------- blokové galerie

const BLOCK_TOKEN = /\s*(<img\b[^>]*>|<(p|h2|h3|ul|ol|blockquote|div)\b[^>]*>[\s\S]*?<\/\2>)/y;
const CAPTION_P = /^<p><em>([^<]*)<\/em><\/p>$/;

/** Rozdělí HTML článku na bloky nejvyšší úrovně. Neznámé HTML = chyba. */
function tokenize(html, where) {
  const tokens = [];
  let pos = 0;
  while (html.slice(pos).trim()) {
    BLOCK_TOKEN.lastIndex = pos;
    const match = BLOCK_TOKEN.exec(html);
    if (!match) throw new ImportError(`${where}: nečekané HTML „${html.slice(pos, pos + 60)}…“`);
    tokens.push(match[1]);
    pos = BLOCK_TOKEN.lastIndex;
  }
  return tokens;
}

function imgAttributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/\s([a-z-]+)="([^"]*)"/g)) attrs[match[1]] = decodeEntities(match[2]);
  return attrs;
}

/**
 * Souvislé řady fotek (<img> a případně <p><em>popisek</em></p> pod ní)
 * nahradí značkami galerií. Řada se rozdělí podle počtů fotek v blocích
 * WordPressu, které musí přesně sedět.
 */
function convertBlockGalleries(html, post, spec, images, base) {
  const where = post.slug;
  const tokens = tokenize(html, where);
  const out = [];
  const runs = [];
  for (let i = 0; i < tokens.length; ) {
    if (!tokens[i].startsWith("<img")) {
      out.push(tokens[i]);
      i += 1;
      continue;
    }
    const run = { at: out.length, items: [] };
    out.push(null);
    while (i < tokens.length && tokens[i].startsWith("<img")) {
      const attrs = imgAttributes(tokens[i]);
      i += 1;
      const caption = i < tokens.length ? CAPTION_P.exec(tokens[i]) : null;
      if (caption) i += 1;
      if (!attrs.src?.startsWith(STORAGE_TOKEN)) {
        throw new ImportError(`${where}: fotka mimo úložiště ${attrs.src}`);
      }
      const filePath = storagePath(`denik/${attrs.src.slice(STORAGE_TOKEN.length)}`, post.slug, where);
      const record = images.get(filePath);
      if (!record) throw new ImportError(`${where}: fotka ${filePath} chybí v _meta.inlineImages`);
      if (Number(attrs.width) !== record.width || Number(attrs.height) !== record.height) {
        throw new ImportError(`${where}: rozměry ${filePath} v textu nesedí s _meta`);
      }
      run.items.push(
        galleryItem(
          {
            path: filePath,
            width: record.width,
            height: record.height,
            caption: caption ? decodeEntities(caption[1]).trim() : "",
            alt: (attrs.alt ?? "").trim(),
            blur: record.blur,
          },
          base,
        ),
      );
    }
    runs.push(run);
  }

  const sizes = [...spec.sizes];
  const galleries = [];
  for (const run of runs) {
    const markers = [];
    let rest = run.items;
    while (rest.length) {
      const size = sizes.shift();
      if (!size || size > rest.length) {
        throw new ImportError(
          `${where}: řady fotek v textu (${runs.map((r) => r.items.length).join(", ")}) nesedí na bloky WordPressu (${spec.sizes.join(", ")})`,
        );
      }
      const id = `${spec.prefix}-${galleries.length + 1}`;
      galleries.push({ id, items: rest.slice(0, size) });
      markers.push(`<p data-gallery="${id}"></p>`);
      rest = rest.slice(size);
    }
    out[run.at] = markers.join("\n");
  }
  if (sizes.length) {
    throw new ImportError(`${where}: v textu je méně fotek, než měly bloky WordPressu (${spec.sizes.join(", ")})`);
  }
  return { content: out.join("\n"), galleries };
}

// ---------------------------------------------------------------- příprava článku

function preparePost(post, base) {
  const where = post.slug;
  const warnings = [];
  if (!SLUG.test(post.slug ?? "")) throw new ImportError(`neplatný slug ${post.slug}`);

  const title = post._meta?.titleMain?.trim();
  if (!title || title.includes(" | ") || title.length > 255) {
    throw new ImportError(`${where}: chybí nebo nesedí _meta.titleMain`);
  }

  if (!["published", "draft"].includes(post.status)) {
    throw new ImportError(`${where}: neznámý stav ${post.status}`);
  }
  if (post.slug === DRAFT_SLUG && post.status !== "draft") {
    throw new ImportError(`${where}: článek 2025 musí zůstat koncept`);
  }
  if (post.status === "published" && !post.publishedAt) {
    throw new ImportError(`${where}: publikovaný článek bez publishedAt`);
  }
  const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;
  if (publishedAt && Number.isNaN(publishedAt.getTime())) {
    throw new ImportError(`${where}: neplatné datum ${post.publishedAt}`);
  }

  const images = imageIndex(post);
  const fixer = captionFixer(post.slug);

  // Galerie NextGEN v pořadí podle "order", skryté fotky se nepřenáší.
  const galleries = (post.gallery ?? []).map((gallery) => {
    const hidden = new Set(gallery.hiddenInOldGallery ?? []);
    const items = [...gallery.images]
      .sort((a, b) => a.order - b.order)
      .map((im) => {
        if (im.source && hidden.has(path.basename(im.source))) {
          throw new ImportError(`${where}: skrytá fotka ${im.source} v galerii ${gallery.id}`);
        }
        return galleryItem(
          {
            path: storagePath(im.file, post.slug, where),
            width: im.width,
            height: im.height,
            caption: fixer.apply((im.caption ?? "").trim()),
            alt: fixer.apply((im.alt ?? "").trim()),
            blur: im.blur,
          },
          base,
        );
      });
    return { id: String(gallery.id), items };
  });
  const captionFixes = fixer.check();

  let content = post.content;
  let blockGalleries = 0;
  const spec = BLOCK_GALLERIES[post.slug];
  if (spec) {
    const converted = convertBlockGalleries(content, post, spec, images, base);
    content = converted.content;
    galleries.push(...converted.galleries);
    blockGalleries = converted.galleries.length;
  }

  content = content.replaceAll(STORAGE_TOKEN, `${base}/`);
  if (content.includes("{{")) throw new ImportError(`${where}: v textu zůstal zástupný text {{…}}`);

  // Stejné čištění jako při uložení v administraci (prepareContent v
  // src/app/admin/(dashboard)/posts/actions.ts).
  const sanitized = sanitizePostHtml(content);
  if (sanitizePostHtml(sanitized) !== sanitized) {
    throw new ImportError(`${where}: sanitizePostHtml není na textu stabilní`);
  }
  const markers = [...sanitized.matchAll(/<p data-gallery="([a-z0-9-]+)"><\/p>/g)].map((m) => m[1]);
  const ids = galleries.map((g) => g.id);
  const missingMarker = ids.filter((id) => !markers.includes(id));
  const orphanMarker = markers.filter((id) => !ids.includes(id));
  if (missingMarker.length || orphanMarker.length || new Set(markers).size !== markers.length) {
    throw new ImportError(
      `${where}: značky galerií po čištění nesedí (bez značky: ${missingMarker.join(", ") || "-"}, bez galerie: ${orphanMarker.join(", ") || "-"})`,
    );
  }
  // Pořadí galerií v poli podle pořadí značek v textu.
  galleries.sort((a, b) => markers.indexOf(a.id) - markers.indexOf(b.id));

  // Úvodní fotka: model, jinak WordPress.
  const hero = HERO_FROM_MODEL[post.slug];
  let image = null;
  if (hero) {
    const filePath = `${post.slug}/${hero.file}`;
    const record = images.get(filePath);
    if (!record) throw new ImportError(`${where}: úvodní fotka z modelu ${filePath} v článku není`);
    image = { path: filePath, ...record, alt: hero.alt, source: hero.model };
  } else if (post.imageUrl) {
    const filePath = storagePath(post._meta.imagePath, post.slug, where);
    const record = images.get(filePath);
    const alt = record?.alt?.trim();
    if (!alt) throw new ImportError(`${where}: úvodní fotka z WordPressu nemá popis (alt)`);
    image = { path: filePath, ...record, alt, source: "WordPress" };
  }

  // Perex: model, jinak posts.json. Text z modelu musí být doslova v článku.
  const modelPerex = PEREX_FROM_MODEL[post.slug];
  if (modelPerex && !plain(`${post.perex ?? ""} ${post.content}`).includes(plain(modelPerex))) {
    throw new ImportError(`${where}: perex z modelu není doslova v textu článku`);
  }
  const perex = (modelPerex ?? post.perex ?? "").trim() || null;

  const row = {
    slug: post.slug,
    title,
    perex,
    content: sanitized,
    imageUrl: image ? `${base}/${image.path}` : null,
    imageWidth: image?.width ?? null,
    imageHeight: image?.height ?? null,
    imageBlur: image?.blur ?? null,
    imageAlt: image?.alt ?? null,
    videoUrl: post.videoUrl || null,
    gallery: galleries,
    status: post.status,
    publishedAt,
    categories: post.categories ?? [],
  };

  // Rozměry fotek: z textu (fotky, které v něm zůstaly), galerií a úvodní fotky.
  const files = new Map();
  const expect = (filePath, width, height) => {
    const known = files.get(filePath);
    if (known && (known.width !== width || known.height !== height)) {
      throw new ImportError(`${where}: fotka ${filePath} má v datech dvoje rozměry`);
    }
    files.set(filePath, { width, height });
  };
  for (const match of sanitized.matchAll(/<img\b[^>]*>/g)) {
    const attrs = imgAttributes(match[0]);
    if (!attrs.src.startsWith(`${base}/`)) throw new ImportError(`${where}: cizí obrázek ${attrs.src}`);
    expect(attrs.src.slice(base.length + 1), Number(attrs.width), Number(attrs.height));
  }
  for (const gallery of galleries) {
    for (const item of gallery.items) expect(item.path, item.width, item.height);
  }
  if (image) expect(image.path, image.width, image.height);

  for (const gallery of galleries) {
    for (const item of gallery.items) {
      if (item.alt && ALT_FILE_NAME.test(item.alt)) {
        throw new ImportError(`${where}: alt fotky ${item.path} vypadá jako název souboru („${item.alt}“)`);
      }
    }
  }

  // Pravidla textů: jen krátký spojovník, perex bez slova instruktor.
  const texts = [title, perex ?? "", plain(sanitized), image?.alt ?? ""];
  for (const gallery of galleries) for (const item of gallery.items) texts.push(item.caption, item.alt ?? "");
  if (texts.some((text) => /[\u2013\u2014]/.test(text))) warnings.push("text obsahuje dlouhou nebo střední pomlčku");
  if (/instruktor/i.test(perex ?? "")) warnings.push("perex obsahuje slovo instruktor");

  // Uloží ho potom administrace? Stejná validace jako formulář článku.
  const check = postSchema.safeParse({
    title,
    slug: post.slug,
    perex: perex ?? "",
    content: sanitized,
    imageUrl: row.imageUrl ?? "",
    imageWidth: row.imageWidth ?? undefined,
    imageHeight: row.imageHeight ?? undefined,
    imageBlur: row.imageBlur ?? undefined,
    imageAlt: row.imageAlt ?? "",
    videoUrl: row.videoUrl ?? "",
    gallery: galleries,
    categoryIds: [],
    newCategories: [],
    status: post.status,
  });
  if (!check.success) {
    const messages = new Map();
    for (const issue of check.error.issues) {
      const message = `${issue.path[0]}: ${issue.message}`;
      messages.set(message, (messages.get(message) ?? 0) + 1);
    }
    for (const [message, count] of messages) {
      warnings.push(`administrace článek neuloží, ${message}${count > 1 ? ` (${count}x)` : ""}`);
    }
  }

  const inline = (sanitized.match(/<img\b/g) ?? []).length;
  return {
    row,
    files,
    warnings,
    info: {
      nextgen: galleries.length - blockGalleries,
      blocks: blockGalleries,
      photos: galleries.reduce((sum, g) => sum + g.items.length, 0),
      inline,
      hero: image ? { file: path.basename(image.path), source: image.source } : null,
      perex: modelPerex ? "model" : "posts.json",
      captionFixes,
      sanitizeChanged: sanitized !== content,
    },
  };
}

/** Totéž s jinou adresou fotek (lokální server místo Supabase). */
function rebase(row, from, to) {
  const swap = (url) => (url?.startsWith(`${from}/`) ? `${to}/${url.slice(from.length + 1)}` : url);
  return {
    ...row,
    content: row.content.replaceAll(`"${from}/`, `"${to}/`),
    imageUrl: swap(row.imageUrl),
    gallery: row.gallery.map((g) => ({ ...g, items: g.items.map((item) => ({ ...item, url: swap(item.url) })) })),
  };
}

// ---------------------------------------------------------------- fotky

/** Ověří soubory na disku (existence, JPEG, rozměry) a vrátí jejich velikosti. */
async function checkFiles(storageDir, expected) {
  const result = [];
  for (const [filePath, { width, height }] of expected) {
    const local = path.join(storageDir, filePath);
    if (!existsSync(local)) throw new ImportError(`chybí fotka ${local}`);
    const buffer = await readFile(local);
    const size = jpegSize(buffer);
    if (!size) throw new ImportError(`${filePath} není JPEG`);
    if (size.width !== width || size.height !== height) {
      throw new ImportError(`${filePath}: soubor má ${size.width} x ${size.height}, data ${width} x ${height}`);
    }
    result.push({ path: filePath, local, bytes: statSync(local).size });
  }
  return result;
}

async function uploadPhotos(env, files) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(BUCKET);
  if (bucketError || !bucket) {
    throw new ImportError(
      `bucket "${BUCKET}" nejde načíst (${bucketError?.message ?? "neexistuje"}). Založte ho podle README, Nasazení, krok 1.`,
    );
  }
  if (!bucket.public) throw new ImportError(`bucket "${BUCKET}" není veřejný, fotky by se na webu nezobrazily`);

  const existing = new Map();
  for (const folder of new Set(files.map((f) => path.posix.dirname(f.path)))) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
    if (error) throw new ImportError(`výpis ${BUCKET}/${folder}: ${error.message}`);
    for (const object of data ?? []) existing.set(`${folder}/${object.name}`, object.metadata?.size);
  }
  const todo = files.filter((f) => existing.get(f.path) !== f.bytes);
  log(`Fotky: ${files.length - todo.length} už v bucketu je, ${todo.length} k nahrání (${mb(todo.reduce((s, f) => s + f.bytes, 0))}).`);

  let done = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
      while (queue.length) {
        const file = queue.shift();
        const body = await readFile(file.local);
        const { error } = await supabase.storage.from(BUCKET).upload(file.path, body, {
          contentType: "image/jpeg",
          // Jako nahrávání z administrace (src/app/api/admin/upload/route.ts).
          cacheControl: "31536000, immutable",
          upsert: true,
        });
        if (error) throw new ImportError(`nahrání ${file.path}: ${error.message}`);
        done += 1;
        if (done % 50 === 0) log(`  nahráno ${done}/${todo.length}`);
      }
    }),
  );
  if (todo.length) log(`  nahráno ${done}/${todo.length}`);
  return { uploaded: done, skipped: files.length - todo.length };
}

// ---------------------------------------------------------------- databáze

async function writeDatabase(databaseUrl, rows, categories, { update, ssl }) {
  const sql = postgres(databaseUrl, {
    max: 1,
    // Supabase pooler v režimu transaction nepodporuje prepared statements.
    prepare: false,
    ...(ssl === undefined ? {} : { ssl }),
    connect_timeout: 15,
    onnotice: () => {},
  });
  try {
    const [{ count }] = await sql`
      select count(*)::int as count from information_schema.columns
      where table_schema = 'public' and table_name = 'posts'
        and column_name in ('gallery', 'image_alt')`;
    if (count !== 2) {
      throw new ImportError("tabulka posts nemá sloupce gallery a image_alt, nejdřív spusťte migrace (README, Nasazení, krok 2)");
    }

    return await sql.begin(async (tx) => {
      const stats = { inserted: 0, updated: 0, skipped: [], newCategories: 0, links: 0 };

      for (const category of categories) {
        const created = await tx`
          insert into post_categories (slug, name, sort_order)
          values (${category.slug}, ${category.name}, ${category.sortOrder})
          on conflict (slug) do nothing
          returning id`;
        stats.newCategories += created.length;
      }
      const categoryIds = new Map();
      if (categories.length) {
        const found = await tx`
          select id, slug from post_categories where slug in ${tx(categories.map((c) => c.slug))}`;
        for (const c of found) categoryIds.set(c.slug, c.id);
      }

      for (const row of rows) {
        const [existing] = await tx`select id from posts where slug = ${row.slug}`;
        if (existing && !update) {
          stats.skipped.push(row.slug);
          continue;
        }
        // tx.json(), ne JSON.stringify: s prepare: false by postgres-js
        // řetězec zakódoval podruhé a v jsonb by byl text místo pole.
        const gallery = tx.json(row.gallery);
        const publishedAt = row.publishedAt?.toISOString() ?? null;
        let id = existing?.id;
        if (existing) {
          await tx`
            update posts set
              title = ${row.title}, perex = ${row.perex}, content = ${row.content},
              image_url = ${row.imageUrl}, image_width = ${row.imageWidth},
              image_height = ${row.imageHeight}, image_blur = ${row.imageBlur},
              image_alt = ${row.imageAlt}, video_url = ${row.videoUrl},
              gallery = ${gallery}, status = ${row.status}::post_status,
              published_at = ${publishedAt}::timestamptz,
              created_at = coalesce(${publishedAt}::timestamptz, created_at),
              updated_at = now()
            where id = ${id}`;
          stats.updated += 1;
        } else {
          // created_at = původní datum, administrace podle něj řadí.
          const [created] = await tx`
            insert into posts (slug, title, perex, content, image_url, image_width,
              image_height, image_blur, image_alt, video_url, gallery, status,
              published_at, created_at, updated_at)
            values (${row.slug}, ${row.title}, ${row.perex}, ${row.content}, ${row.imageUrl},
              ${row.imageWidth}, ${row.imageHeight}, ${row.imageBlur}, ${row.imageAlt},
              ${row.videoUrl}, ${gallery}, ${row.status}::post_status,
              ${publishedAt}::timestamptz, coalesce(${publishedAt}::timestamptz, now()), now())
            returning id`;
          id = created.id;
          stats.inserted += 1;
        }

        await tx`delete from post_category_map where post_id = ${id}`;
        for (const slug of row.categories) {
          const categoryId = categoryIds.get(slug);
          if (!categoryId) throw new ImportError(`${row.slug}: neznámá kategorie ${slug}`);
          await tx`insert into post_category_map (post_id, category_id) values (${id}, ${categoryId})`;
          stats.links += 1;
        }
      }

      // Kontrola zapsaných dat ještě v transakci, při chybě se nezapíše nic.
      const written = rows.filter((row) => !stats.skipped.includes(row.slug));
      if (written.length) {
        const check = await tx`
          select slug, jsonb_typeof(gallery) as type,
            (select count(*)::int from jsonb_array_elements(case when jsonb_typeof(gallery) = 'array' then gallery else '[]'::jsonb end)) as galleries
          from posts where slug in ${tx(written.map((row) => row.slug))}`;
        for (const row of written) {
          const found = check.find((c) => c.slug === row.slug);
          if (!found || found.type !== "array" || found.galleries !== row.gallery.length) {
            throw new ImportError(`${row.slug}: galerie se do databáze nezapsaly jako pole, import se vrátil zpět`);
          }
        }
      }
      return stats;
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Běží lokální server s fotkami? Jen upozornění, import ho nepotřebuje. */
async function localPhotosReachable(url) {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- hlavní běh

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const postsFile = path.join(args.source, "posts.json");
  const storageDir = path.join(args.source, "storage");
  if (!existsSync(postsFile)) throw new ImportError(`chybí ${postsFile} (přepínač --zdroj=<složka migrace>)`);

  const doc = JSON.parse(readFileSync(postsFile, "utf8"));
  if (!Array.isArray(doc.posts) || !Array.isArray(doc.categories)) {
    throw new ImportError("posts.json nemá pole posts a categories");
  }
  const slugs = doc.posts.map((p) => p.slug);
  if (new Set(slugs).size !== slugs.length) throw new ImportError("posts.json má dva články se stejným slugem");
  for (const slug of [...Object.keys(HERO_FROM_MODEL), ...Object.keys(PEREX_FROM_MODEL), ...Object.keys(BLOCK_GALLERIES)]) {
    if (!slugs.includes(slug)) throw new ImportError(`článek ${slug} z tabulek skriptu v posts.json není`);
  }
  if (args.only) {
    const unknown = [...args.only].filter((slug) => !slugs.includes(slug));
    if (unknown.length) throw new ImportError(`neznámý slug v --jen: ${unknown.join(", ")}`);
  }
  const selected = doc.posts.filter((p) => !args.only || args.only.has(p.slug));

  // Proměnné a cíl.
  let env = {};
  if (args.mode === "local") env = readEnvFile(".env.development.local", ["DATABASE_URL"]);
  if (args.mode === "ostre") {
    env = readEnvFile(".env.import.local", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"]);
  }
  const supabaseUrl = args.mode === "ostre" ? supabaseBase(env.SUPABASE_URL) : PROJECT_URL;
  const publicBase = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;
  const database = env.DATABASE_URL ? describeDatabase(env.DATABASE_URL) : null;
  if (args.mode === "local" && !["localhost", "127.0.0.1", "[::1]"].includes(database.host)) {
    throw new ImportError(".env.development.local nemíří na lokální databázi, --local zapisuje jen do ní");
  }

  log(
    {
      dry: "Suchý běh: nic se nezapíše (zápis: --local nebo --ostre).",
      local: `Import do lokální databáze ${database?.host}:${database?.port}/${database?.database}.`,
      ostre: `OSTRÝ IMPORT: Supabase ${new URL(supabaseUrl).host}, databáze ${database?.host}:${database?.port}/${database?.database}.`,
    }[args.mode],
  );
  if (args.mode === "ostre" && new URL(supabaseUrl).host !== new URL(PROJECT_URL).host) {
    log(`Pozor: SUPABASE_URL není projekt FLY America (${new URL(PROJECT_URL).host}).`);
  }
  log(`Zdroj: ${args.source}`);
  log(`Fotky: ${args.mode === "local" ? `${LOCAL_BASE}/<slug>/<soubor>.jpg` : `${publicBase}/<slug>/<soubor>.jpg`}`);
  log("");

  // Příprava a kontrola všech článků, i v ostrém režimu dřív, než se cokoli zapíše.
  const prepared = selected.map((post) => preparePost(post, publicBase));
  const expected = new Map();
  for (const p of prepared) {
    for (const [filePath, size] of p.files) {
      const known = expected.get(filePath);
      if (known && (known.width !== size.width || known.height !== size.height)) {
        throw new ImportError(`fotka ${filePath} má v datech dvoje rozměry`);
      }
      expected.set(filePath, size);
    }
  }
  const files = await checkFiles(storageDir, expected);

  const usedCategories = new Set(prepared.flatMap((p) => p.row.categories));
  const categories = doc.categories
    .filter((c) => usedCategories.has(c.slug))
    .map((c) => ({ slug: c.slug, name: c.name, sortOrder: c.sortOrder ?? 0 }));
  const unknownCategory = [...usedCategories].filter((slug) => !categories.some((c) => c.slug === slug));
  if (unknownCategory.length) throw new ImportError(`kategorie ${unknownCategory.join(", ")} chybí v posts.json`);

  // Souhrn po článcích.
  log("Články:");
  for (const { row, info } of prepared) {
    const date = row.publishedAt ? row.publishedAt.toISOString().slice(0, 10) : "bez data  ";
    const galleries = info.nextgen + info.blocks;
    log(
      `  ${row.status === "draft" ? "koncept " : "publikov."} ${date}  ${row.slug}\n` +
        `      galerie ${galleries}${info.blocks ? ` (z toho ${info.blocks} z bloků WordPressu)` : ""}, ` +
        `fotky v galeriích ${info.photos}, fotky v textu ${info.inline}, ` +
        `kategorie ${row.categories.join(", ") || "-"}, perex z ${info.perex}` +
        (info.captionFixes ? `, opravené popisky ${info.captionFixes}` : ""),
    );
  }

  log("\nÚvodní fotky:");
  for (const { row, info } of prepared) {
    log(`  ${row.slug}: ${info.hero ? `${info.hero.file} (${info.hero.source})` : "žádná"}`);
  }

  const warnings = prepared.flatMap((p) => p.warnings.map((w) => `${p.row.slug}: ${w}`));
  if (warnings.length) {
    log("\nUpozornění (import proběhne, ale):");
    for (const warning of warnings) log(`  ${warning}`);
  }

  const totals = {
    posts: prepared.length,
    published: prepared.filter((p) => p.row.status === "published").length,
    nextgen: prepared.reduce((s, p) => s + p.info.nextgen, 0),
    blocks: prepared.reduce((s, p) => s + p.info.blocks, 0),
    photos: prepared.reduce((s, p) => s + p.info.photos, 0),
    inline: prepared.reduce((s, p) => s + p.info.inline, 0),
    heroes: prepared.filter((p) => p.info.hero).length,
    links: prepared.reduce((s, p) => s + p.row.categories.length, 0),
    sanitized: prepared.filter((p) => p.info.sanitizeChanged).length,
  };
  log(
    [
      "",
      `Celkem: ${totals.posts} článků (${totals.published} publikovaných, ${totals.posts - totals.published} koncept), ` +
        `${totals.nextgen + totals.blocks} galerií (${totals.nextgen} NextGEN, ${totals.blocks} z bloků WordPressu) ` +
        `s ${totals.photos} fotkami. Fotky v textu: ${totals.inline}, úvodní fotky: ${totals.heroes}.`,
      `Soubory JPEG: ${files.length} (${mb(files.reduce((s, f) => s + f.bytes, 0))}), všechny na disku s rozměry podle dat.`,
      `Kategorie: ${categories.length} (${categories.map((c) => c.name).join(", ")}), přiřazení ${totals.links}.`,
      `sanitizePostHtml: značky galerií prošly u všech článků, text upravil u ${totals.sanitized} článků.`,
      `alt fotek z názvu souboru (MIGRACE.md, otázka 11): ${altFixes.renamed} upraveno na název místa, ${altFixes.dropped} vynecháno (jen pořadí).`,
    ].join("\n"),
  );

  if (args.mode === "dry") {
    log("\nSuchý běh hotový, nic se nezapsalo.");
    return;
  }

  log("");
  if (args.mode === "ostre") await uploadPhotos(env, files);

  const rows = prepared.map((p) => (args.mode === "local" ? rebase(p.row, publicBase, LOCAL_BASE) : p.row));
  const stats = await writeDatabase(env.DATABASE_URL, rows, categories, {
    update: args.update,
    // Ostrá databáze přes TLS ("require" = šifrované spojení bez ověření
    // certifikátu). sslmode v DATABASE_URL má přednost, postgres-js ho čte sám.
    ssl: args.mode === "ostre" ? (new URL(env.DATABASE_URL).searchParams.has("sslmode") ? undefined : "require") : false,
  });

  log(
    [
      `Databáze: vloženo ${stats.inserted}, aktualizováno ${stats.updated}, přeskočeno ${stats.skipped.length}` +
        (stats.skipped.length ? " (už existují, přepsat jde s --aktualizovat)" : "") +
        ".",
      `Kategorie: nových ${stats.newCategories}, existujících ${categories.length - stats.newCategories}. ` +
        `Přiřazení kategorií zapsáno: ${stats.links}.`,
    ].join("\n"),
  );

  if (args.mode === "local") {
    const sample = rows.find((r) => r.imageUrl)?.imageUrl;
    if (sample && !(await localPhotosReachable(sample))) {
      log(
        `\nFotky na ${LOCAL_BASE} teď neběží. Pro next dev: python3 -m http.server 8816 --bind 127.0.0.1 --directory ${storageDir}`,
      );
    }
  }
  if (args.mode === "ostre") {
    log(
      "\nBěží-li už web, uložte v administraci libovolný článek (obnoví cache deníku), nebo web znovu nasaďte.",
    );
  }
}

try {
  await main();
} catch (error) {
  // Jen zpráva: chyby databáze ani Supabase neobsahují hesla, ale výpis
  // celého objektu by mohl obsahovat parametry dotazu.
  console.error(`\nCHYBA: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
