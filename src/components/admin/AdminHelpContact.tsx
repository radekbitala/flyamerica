/**
 * Kontakt na Radka pro zapomenuté heslo a potíže s administrací (rozhodnutí
 * R11 z auditu 14. 10. 2026): osobní e-mail, ne pracovní, FLY America je
 * Radkův osobní projekt. Heslo mění Radek skriptem scripts/create-admin.mjs.
 */
export const ADMIN_HELP_EMAIL = "radek.bitala@gmail.com";

export function AdminHelpContact({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm text-text-secondary ${className}`}>
      Zapomenuté heslo nebo problém? Napište Radkovi:{" "}
      <a
        href={`mailto:${ADMIN_HELP_EMAIL}`}
        className="font-semibold break-all text-foreground underline underline-offset-2"
      >
        {ADMIN_HELP_EMAIL}
      </a>
    </p>
  );
}
