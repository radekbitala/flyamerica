import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Drobečková navigace"
      className="mb-4 flex items-center gap-1 text-sm text-text-secondary"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {item.href && !last ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-foreground" : ""}>{item.label}</span>
            )}
            {!last && <ChevronRight size={14} className="text-text-secondary" />}
          </span>
        );
      })}
    </nav>
  );
}
