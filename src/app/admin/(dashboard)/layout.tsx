import { Suspense } from "react";
import { Toaster } from "sonner";
import { signOut } from "@/lib/auth";
import { requireAdminPage } from "@/lib/admin-guard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ToastOnParam } from "@/components/admin/ToastOnParam";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        userName={admin.name}
        logoutSlot={
          <form
            // eslint-disable-next-line local/require-admin -- odhlášení musí projít i s prošlou session
            action={async () => {
              "use server";
              await signOut({ redirect: true, redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="cursor-pointer text-sm text-text-secondary transition-colors hover:text-foreground"
            >
              Odhlásit
            </button>
          </form>
        }
      />

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>

      <Toaster
        position="top-right"
        richColors
        closeButton
        containerAriaLabel="Oznámení"
        toastOptions={{ closeButtonAriaLabel: "Zavřít oznámení" }}
      />
      <Suspense fallback={null}>
        <ToastOnParam />
      </Suspense>
    </div>
  );
}
