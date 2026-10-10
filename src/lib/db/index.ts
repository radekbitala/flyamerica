import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Chybí DATABASE_URL. Lokálně ji zapíše npm run db:local do .env.development.local.",
    );
  }

  const poolMax = Number(process.env.DB_POOL_MAX);

  const client = postgres(connectionString, {
    // Supabase pooler v režimu transaction nepodporuje prepared statements.
    prepare: false,
    max:
      Number.isInteger(poolMax) && poolMax > 0
        ? poolMax
        : process.env.NODE_ENV === "production"
          ? 10
          : 1,
    idle_timeout: 20,
  });

  return drizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;

// Klient žije v globalThis, aby ho v dev nezakládal znovu každý HMR reload
// (Supabase pooler v session režimu má jen asi 15 spojení).
const globalForDb = globalThis as unknown as { __db?: Db };

function getDb(): Db {
  globalForDb.__db ??= createDb();
  return globalForDb.__db;
}

/**
 * Klient se vytvoří až při prvním dotazu, ne při importu. Build tak projde
 * bez proměnných prostředí a chybějící DATABASE_URL se ohlásí srozumitelnou
 * chybou až tam, kde je databáze opravdu potřeba.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
