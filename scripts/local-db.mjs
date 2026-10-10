#!/usr/bin/env node
/**
 * Lokální databáze pro vývoj a testy: skutečný Postgres (embedded-postgres)
 * na portu 54329, data v .local-db/.
 *
 *   npm run db:local            spustí databázi (běží v popředí do Ctrl+C)
 *   npm run db:local -- reset   smaže data, založí čistou databázi a spustí ji
 *   npm run db:local -- stop    zastaví databázi spuštěnou jinde
 *
 * Při prvním spuštění (a po resetu) aplikuje migrace z drizzle/, založí
 * testovacího admina, ukázkové články a kategorii a zapíše testovací hodnoty
 * do .env.development.local (odtud je bere next dev a npm run e2e). Hesla
 * se nikam nevypisují. Při dalších spuštěních doběhnou jen nové migrace.
 */
import { existsSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import bcrypt from "bcryptjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE_DIR = path.join(ROOT, ".local-db");
const DATA_DIR = path.join(BASE_DIR, "data");
const RUNNER_PID = path.join(BASE_DIR, "runner.pid");
const ENV_FILE = path.join(ROOT, ".env.development.local");
const PORT = 54329;
const DB_NAME = "flyamerica";
const DB_USER = "postgres";
const ADMIN_EMAIL = "admin@test.local";
const MARKER = "# Vygenerováno skriptem scripts/local-db.mjs";

const secret = (bytes) => randomBytes(bytes).toString("base64url");
const databaseUrl = (password) =>
  `postgres://${DB_USER}:${password}@localhost:${PORT}/${DB_NAME}`;

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(file) {
  if (!existsSync(file)) return null;
  const pid = Number(readFileSync(file, "utf8").split("\n")[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function postmasterPid() {
  return readPid(path.join(DATA_DIR, "postmaster.pid"));
}

/** Soubor s proměnnými smí skript přepsat, jen když ho sám vytvořil. */
function ownEnvFile() {
  if (!existsSync(ENV_FILE)) return null;
  const content = readFileSync(ENV_FILE, "utf8");
  if (!content.startsWith(MARKER)) {
    throw new Error(
      ".env.development.local existuje a nevytvořil ho tento skript. Přejmenujte ho nebo smažte a spusťte znovu.",
    );
  }
  return parseEnv(content);
}

function writeEnvFile({ dbPassword, authSecret, adminPassword }) {
  writeFileSync(
    ENV_FILE,
    [
      MARKER,
      "# Jen testovací hodnoty pro lokální databázi, žádné skutečné klíče.",
      "# Přepisuje ho npm run db:local -- reset, ručně ho neupravujte.",
      `DATABASE_URL=${databaseUrl(dbPassword)}`,
      `AUTH_SECRET=${authSecret}`,
      `TEST_ADMIN_EMAIL=${ADMIN_EMAIL}`,
      `TEST_ADMIN_PASSWORD=${adminPassword}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
}

function createCluster(password, logs) {
  const keep = (message) => {
    logs.push(String(message));
    if (logs.length > 50) logs.shift();
  };
  return new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    port: PORT,
    user: DB_USER,
    password,
    authMethod: "scram-sha-256",
    persistent: true,
    // Jako Supabase: UTF-8 a české texty řazené podle locale, ne po bajtech.
    initdbFlags: ["--encoding=UTF8", "--locale=en_US.UTF-8"],
    // Výpis Postgresu jen do paměti, ukáže se, když start selže.
    onLog: keep,
    onError: keep,
  });
}

async function migrateAndSeed(url, { seed, adminPassword }) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: path.join(ROOT, "drizzle") });
    if (seed) await seedData(sql, adminPassword);
  } finally {
    await sql.end();
  }
}

async function seedData(sql, adminPassword) {
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const [admin] = await sql`
    insert into admin_users (email, name, password_hash)
    values (${ADMIN_EMAIL}, 'Testovací admin', ${passwordHash})
    returning id`;

  const [category] = await sql`
    insert into post_categories (slug, name, sort_order)
    values ('ukazkova-kategorie', 'Ukázková kategorie', 1)
    returning id`;

  // Ukázkové obrázky z placehold.co. Cesty v bucketu jsou vymyšlené, soubory
  // v úložišti nejsou.
  const gallery = [
    {
      id: "galerie-1",
      items: [
        {
          path: "ukazka/galerie-1.png",
          url: "https://placehold.co/1200x800/png?text=Galerie+1",
          width: 1200,
          height: 800,
          caption: "Ukázková fotka 1",
        },
        {
          path: "ukazka/galerie-2.png",
          url: "https://placehold.co/800x1200/png?text=Galerie+2",
          width: 800,
          height: 1200,
          caption: "Ukázková fotka 2",
        },
      ],
    },
  ];

  const [published] = await sql`
    insert into posts (slug, title, perex, content, image_url, image_width,
      image_height, image_alt, gallery, status, published_at, created_by)
    values (
      'ukazkovy-clanek-s-galerii',
      'Ukázkový článek s galerií',
      'Testovací článek pro lokální vývoj. Na webu se neobjeví.',
      ${'<p>První odstavec ukázkového článku.</p><h2>Mezititulek</h2><p>Pod tímto odstavcem je galerie se dvěma fotkami.</p><p data-gallery="galerie-1"></p><p>Poslední odstavec.</p>'},
      'https://placehold.co/1600x900/png?text=FLY+America',
      1600, 900, 'Ukázková titulní fotka',
      ${JSON.stringify(gallery)}::jsonb,
      'published', now(), ${admin.id})
    returning id`;

  await sql`
    insert into posts (slug, title, perex, content, status, created_by)
    values ('rozepsany-koncept', 'Rozepsaný koncept', null,
      '<p>Koncept, který ještě není publikovaný.</p>', 'draft', ${admin.id})`;

  await sql`
    insert into post_category_map (post_id, category_id)
    values (${published.id}, ${category.id})`;
}

async function stop() {
  const runner = readPid(RUNNER_PID);
  const pg = postmasterPid();
  if (runner && isAlive(runner)) {
    // Proces se skriptem databázi při ukončení sám korektně zastaví.
    process.kill(runner, "SIGINT");
  } else if (pg && isAlive(pg)) {
    // SIGINT = rychlé vypnutí Postgresu, rozpracované transakce se zruší.
    process.kill(pg, "SIGINT");
  } else {
    console.log("Lokální databáze neběží.");
    return;
  }

  for (let i = 0; i < 100; i++) {
    const current = postmasterPid();
    if (!current || !isAlive(current)) {
      console.log("Lokální databáze je zastavená.");
      return;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("Databáze se do 15 s nezastavila.");
}

async function start({ reset }) {
  if (reset) {
    await stop();
    rmSync(BASE_DIR, { recursive: true, force: true });
    if (ownEnvFile()) unlinkSync(ENV_FILE);
  }

  const running = postmasterPid();
  if (running && isAlive(running)) {
    console.log(`Lokální databáze už běží na localhost:${PORT}.`);
    return;
  }

  const fresh = !existsSync(path.join(DATA_DIR, "PG_VERSION"));
  const env = ownEnvFile();
  let dbPassword;
  let generated = null;

  if (fresh) {
    generated = {
      dbPassword: secret(18),
      authSecret: secret(32),
      adminPassword: secret(18),
    };
    dbPassword = generated.dbPassword;
  } else {
    if (!env?.DATABASE_URL) {
      throw new Error(
        "Data v .local-db existují, ale chybí .env.development.local s heslem. Spusťte npm run db:local -- reset.",
      );
    }
    dbPassword = decodeURIComponent(new URL(env.DATABASE_URL).password);
  }

  const logs = [];
  const cluster = createCluster(dbPassword, logs);
  try {
    if (fresh) await cluster.initialise();
    await cluster.start();
    if (fresh) await cluster.createDatabase(DB_NAME);
    await migrateAndSeed(databaseUrl(dbPassword), {
      seed: fresh,
      adminPassword: generated?.adminPassword,
    });
  } catch (error) {
    console.error(logs.slice(-20).join(""));
    await cluster.stop();
    throw error;
  }

  if (generated) writeEnvFile(generated);

  writeFileSync(RUNNER_PID, String(process.pid));
  process.on("exit", () => {
    if (readPid(RUNNER_PID) === process.pid) unlinkSync(RUNNER_PID);
  });

  console.log(
    [
      `Lokální databáze běží na localhost:${PORT} (databáze ${DB_NAME}).`,
      fresh
        ? "Založená čistá databáze s ukázkovými daty. Testovací hodnoty jsou v .env.development.local."
        : "Migrace jsou aktuální.",
      "Ukončení: Ctrl+C nebo npm run db:local -- stop.",
    ].join("\n"),
  );

  // Proces drží databázi naživu. Ctrl+C (SIGINT) ji přes embedded-postgres
  // korektně zastaví.
  setInterval(() => {}, 1 << 30);
}

const command = process.argv[2] ?? "start";

try {
  if (command === "start") await start({ reset: false });
  else if (command === "reset") await start({ reset: true });
  else if (command === "stop") await stop();
  else {
    console.error(`Neznámý příkaz "${command}". Použijte start, reset nebo stop.`);
    process.exit(1);
  }
} catch (error) {
  console.error(process.env.DEBUG ? error : error instanceof Error ? error.message : error);
  process.exit(1);
}
