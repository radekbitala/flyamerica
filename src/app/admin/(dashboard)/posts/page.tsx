import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-guard";

export const metadata: Metadata = {
  title: "Deník",
};

// Dočasná stránka, správu článků doplní další krok.
export default async function AdminPostsPage() {
  await requireAdminPage();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Deník</h1>
      <p className="text-text-secondary">Správa článků se připravuje.</p>
    </div>
  );
}
