import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";
import { clientIp, hashIp } from "@/lib/inquiries/spam";

/**
 * Omezení pokusů o přihlášení do administrace.
 *
 * Počítá se podle otisku IP, ne podle e-mailu: limit na e-mail by komukoli
 * dovolil zablokovat Honzovi přihlášení. Zablokovaný pokus se vrátí dřív,
 * než se spustí bcrypt, takže zahlcení přihlášení nespálí výkon serveru.
 */

/** Nejvýš tolik neúspěšných pokusů z jedné IP za LOGIN_WINDOW_MINUTES minut. */
export const MAX_FAILED_LOGINS = 10;
export const LOGIN_WINDOW_MINUTES = 15;

/**
 * Zapíše pokus dopředu, ještě před ověřením hesla, a pod zámkem na otisk
 * IP. Bez toho by dávka souběžných požadavků prošla kontrolou počtu celá.
 * Vrací otisk IP pro clearLoginAttempts(), nebo "blocked".
 *
 * Bez IP v hlavičkách (na Vercelu je nastavuje platforma) se omezení
 * přeskočí, stejně jako u poptávek.
 */
export async function startLoginAttempt(
  headers: Headers,
): Promise<{ ipHash: string | null } | "blocked"> {
  const ip = clientIp(headers);
  const ipHash = ip ? hashIp(ip) : null;
  if (!ipHash) return { ipHash: null };

  const allowed = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`login:${ipHash}`}, 0))`,
    );
    // Starší záznamy už nic neblokují.
    await tx
      .delete(loginAttempts)
      .where(lt(loginAttempts.createdAt, sql`now() - interval '1 day'`));
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.ipHash, ipHash),
          gt(
            loginAttempts.createdAt,
            sql`now() - make_interval(mins => ${LOGIN_WINDOW_MINUTES})`,
          ),
        ),
      );
    if (count >= MAX_FAILED_LOGINS) return false;
    await tx.insert(loginAttempts).values({ ipHash });
    return true;
  });

  return allowed ? { ipHash } : "blocked";
}

/** Po úspěšném přihlášení: pokusy z téhle IP se přestanou počítat. */
export async function clearLoginAttempts(ipHash: string | null): Promise<void> {
  if (!ipHash) return;
  await db.delete(loginAttempts).where(eq(loginAttempts.ipHash, ipHash));
}
