import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export class AdminAuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AdminAuthError";
  }
}

/**
 * Přihlášený administrátor, nebo null.
 *
 * Kromě session ověřuje i řádek v admin_users: smazaný účet přestane fungovat
 * hned, ne až za 30 dní, kdy vyprší JWT. Stejně tak přihlášení vydané před
 * změnou hesla (jiná session_version). Kontroluje se id, ne jen existence
 * session, protože auth() při chybě konfigurace vrací objekt s chybou místo
 * null. cache() zajistí jeden dotaz na požadavek, i když se volá v layoutu
 * i ve stránce.
 */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (typeof id !== "string" || id === "") return null;

  const [user] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      sessionVersion: adminUsers.sessionVersion,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  if (!user || user.sessionVersion !== session?.sessionVersion) return null;
  return { id: user.id, email: user.email, name: user.name };
});

/**
 * Pro server actions a API routy administrace. Ty jsou veřejné endpointy,
 * dají se zavolat i bez otevření stránky, a ochrana v layoutu se jich
 * netýká. Proto každá z nich volá requireAdmin() sama (hlídá to ESLint
 * pravidlo local/require-admin).
 *
 * V akci volané z formuláře nebo v API routě (viz signedOutAsNull):
 *   const admin = await requireAdmin().catch(signedOutAsNull);
 *   if (!admin) return { status: "error", formError: SESSION_EXPIRED_MESSAGE };
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new AdminAuthError();
  return admin;
}

export const SESSION_EXPIRED_MESSAGE =
  "Přihlášení vypršelo. Přihlaste se v nové záložce a zkuste to tady znovu.";

/**
 * Pro .catch() u requireAdmin(). Vypršelé přihlášení vrátí null, akce pak
 * vrátí hlášku a rozepsaný článek nebo poznámka ve formuláři zůstane. Bez
 * toho by výjimka nahradila formulář chybovou stránkou a text by se ztratil.
 * Jiná chyba (třeba výpadek databáze) letí dál, aby se nehlásila jako
 * vypršelé přihlášení.
 */
export function signedOutAsNull(error: unknown): null {
  if (error instanceof AdminAuthError) return null;
  throw error;
}

/**
 * Pro layouty a stránky administrace: nepřihlášeného pošle na přihlášení.
 * Volá ho i každá stránka, protože layout se při navigaci znovu nevykresluje.
 */
export async function requireAdminPage(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
