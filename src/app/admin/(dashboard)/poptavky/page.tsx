import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-guard";

export const metadata: Metadata = {
  title: "Poptávky",
};

// Dočasná stránka, přehled poptávek doplní další krok.
export default async function AdminInquiriesPage() {
  await requireAdminPage();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Poptávky</h1>
      <p className="text-text-secondary">Přehled poptávek se připravuje.</p>
    </div>
  );
}
