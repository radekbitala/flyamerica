import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { clearLoginAttempts, startLoginAttempt } from "@/lib/login-limit";

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

/** Kód jde v odpovědi do přihlašovacího formuláře (LoginForm), ten podle něj ukáže hlášku. */
const LOGIN_RATE_LIMITED = "rate_limited";

class LoginRateLimited extends CredentialsSignin {
  code = LOGIN_RATE_LIMITED;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const attempt = await startLoginAttempt(request.headers);
        if (attempt === "blocked") throw new LoginRateLimited();

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

        await clearLoginAttempts(attempt.ipHash);
        await db
          .update(adminUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(adminUsers.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Jen při přihlášení. Verzi pak getAdmin() porovnává s databází.
      if (user) token.sessionVersion = user.sessionVersion;
      return token;
    },
    // Výchozí session id uživatele nenese. requireAdmin() podle něj ověřuje,
    // že účet v admin_users pořád existuje.
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.sessionVersion =
        typeof token.sessionVersion === "number" ? token.sessionVersion : undefined;
      return session;
    },
  },
  logger: {
    // Špatné heslo není chyba serveru. Výchozí logger by u každého vypsal
    // [auth][error] i se stackem a v logu Vercelu by vypadalo jako výpadek.
    // Jeden řádek bez e-mailu zachová stopu po pokusech.
    error(error) {
      if (error instanceof CredentialsSignin) {
        console.warn(
          error.code === LOGIN_RATE_LIMITED
            ? "[auth] přihlášení zablokované, z adresy přišlo moc špatných hesel"
            : "[auth] neúspěšné přihlášení",
        );
        return;
      }
      console.error(error);
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
});
