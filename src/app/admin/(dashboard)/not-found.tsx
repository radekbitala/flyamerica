import Link from "next/link";

// Pro notFound() ve stránkách administrace (např. neexistující článek).
// Vykreslí se uvnitř layoutu administrace, tedy jen přihlášenému.
export default function AdminNotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Nenalezeno</h1>
      <p className="text-text-secondary">
        Záznam neexistuje, nebo byl smazaný.
      </p>
      <Link href="/admin" className="text-sm font-semibold text-accent-ink underline">
        Zpět na přehled
      </Link>
    </div>
  );
}
