import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  // bcrypt bere jen prvních 72 bajtů, delší vstup je jen zbytečná práce.
  password: z.string().min(1).max(200),
});

// Hash náhodného řetězce. Když e-mail neexistuje, porovná se heslo s ním,
// aby odpověď trvala stejně dlouho a nešlo podle času zjistit, které
// e-maily v administraci jsou.
const DUMMY_HASH =
  "$2b$12$OcXInbmwdyjVWrVb1A0E3ub3iWXYI80SxVS8Y.PR061DOLnCdvFbG";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, email))
          .limit(1);

        const valid = await bcrypt.compare(
          password,
          user?.passwordHash ?? DUMMY_HASH,
        );

        if (!user || !valid) return null;

        await db
          .update(adminUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(adminUsers.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    // Výchozí session id uživatele nenese. requireAdmin() podle něj ověřuje,
    // že účet v admin_users pořád existuje.
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
});
