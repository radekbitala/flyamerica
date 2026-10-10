import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-guard";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Přihlášení",
};

export default async function AdminLoginPage() {
  // Stejná kontrola jako v layoutu administrace, jinak by se účet s platnou
  // session, který už v databázi není, točil mezi přihlášením a přehledem.
  if (await getAdmin()) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-2xl font-bold text-foreground">
          Administrace FLY America
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
