#!/usr/bin/env node
/**
 * Založení účtu do administrace (nebo změna jména a hesla existujícího).
 *
 *   DATABASE_URL="postgres://..." node scripts/create-admin.mjs
 *
 * Zeptá se na e-mail, jméno a heslo (heslo se při psaní nezobrazuje).
 * Heslo uloží jen jako bcrypt hash (cost 12). Nic z toho nevypisuje.
 */
import readline from "node:readline/promises";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const MIN_PASSWORD = 12;

function askHidden(question) {
  if (!process.stdin.isTTY) {
    throw new Error("Heslo jde zadat jen v terminálu.");
  }
  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.setEncoding("utf8");
  process.stdin.resume();

  return new Promise((resolve) => {
    let value = "";
    const done = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          done();
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          done();
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Chybí DATABASE_URL. Spusťte třeba: DATABASE_URL="postgres://..." node scripts/create-admin.mjs',
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const email = (await rl.question("E-mail: ")).trim().toLowerCase();
  const name = (await rl.question("Jméno: ")).trim();
  rl.close();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Neplatný e-mail.");
  if (!name) throw new Error("Jméno je povinné.");

  const password = await askHidden(`Heslo (aspoň ${MIN_PASSWORD} znaků): `);
  if (password.length < MIN_PASSWORD) {
    throw new Error(`Heslo musí mít aspoň ${MIN_PASSWORD} znaků.`);
  }
  if ((await askHidden("Heslo znovu: ")) !== password) {
    throw new Error("Hesla se neshodují.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    // xmax = 0 znamená, že řádek vznikl teď, ne že se aktualizoval.
    const [row] = await sql`
      insert into admin_users (email, name, password_hash)
      values (${email}, ${name}, ${passwordHash})
      on conflict (email) do update
        set name = excluded.name,
            password_hash = excluded.password_hash,
            updated_at = now()
      returning (xmax = 0) as inserted`;
    console.log(
      row.inserted
        ? "Účet je založený."
        : "Účet s tímto e-mailem už existoval, jméno a heslo jsou změněné.",
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
