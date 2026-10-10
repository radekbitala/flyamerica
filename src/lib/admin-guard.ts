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
 * hned, ne až za 30 dní, kdy vyprší JWT. Kontroluje se id, ne jen existence
 * session, protože auth() při chybě konfigurace vrací objekt s chybou místo
 * null. cache() zajistí jeden dotaz na požadavek, i když se volá v layoutu
 * i ve stránce.
 */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (typeof id !== "string" || id === "") return null;

  const [user] = await db
    .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return user ?? null;
});

/**
 * Pro server actions a API routy administrace. Ty jsou veřejné endpointy,
 * dají se zavolat i bez otevření stránky, a ochrana v layoutu se jich
 * netýká. Proto každá z nich volá requireAdmin() sama (hlídá to ESLint
 * pravidlo local/require-admin).
 *
 * V API routě:
 *   const admin = await requireAdmin().catch(() => null);
 *   if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new AdminAuthError();
  return admin;
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
