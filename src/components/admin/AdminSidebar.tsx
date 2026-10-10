"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Přehled", icon: LayoutDashboard, exact: true },
  { href: "/admin/posts", label: "Deník", icon: FileText },
  { href: "/admin/poptavky", label: "Poptávky", icon: Inbox },
];

export function AdminSidebar({
  userName,
  logoutSlot,
}: {
  userName: string;
  logoutSlot: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <Link href="/admin" className="text-lg font-bold text-foreground">
          FLY America
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Otevřít menu"
          aria-expanded={open}
          className="-mr-2 p-2 text-text-secondary hover:text-foreground"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-6">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="text-lg font-bold text-foreground"
          >
            FLY America
          </Link>
          <button
            type="button"
            className="-mr-2 p-2 text-text-secondary hover:text-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Zavřít menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Administrace" className="flex-1 space-y-1 px-3 py-6">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/10 text-accent-ink"
                    : "text-text-secondary hover:bg-gray-50 hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-50 hover:text-foreground"
          >
            <ExternalLink size={18} />
            Zobrazit web
          </a>
        </nav>

        <div className="border-t border-gray-200 px-4 py-4">
          <div className="mb-1 truncate text-sm font-medium text-foreground">
            {userName}
          </div>
          {logoutSlot}
        </div>
      </aside>
    </>
  );
}
