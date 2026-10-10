import "next-auth";

// Verze přihlášení (admin_users.session_version), viz src/lib/auth.ts
// a getAdmin() v src/lib/admin-guard.ts.
declare module "next-auth" {
  interface User {
    sessionVersion?: number;
  }
  interface Session {
    sessionVersion?: number;
  }
}
