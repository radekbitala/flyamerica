"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Nesprávný e-mail nebo heslo.");
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="mb-1 block text-sm font-semibold text-foreground"
        >
          E-mail
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 w-full rounded-[10px] border border-field bg-white px-4 text-sm text-foreground focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1 block text-sm font-semibold text-foreground"
        >
          Heslo
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11 w-full rounded-[10px] border border-field bg-white px-4 text-sm text-foreground focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-salmon">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full cursor-pointer rounded-[10px] bg-accent font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? "Přihlašuji..." : "Přihlásit se"}
      </button>
    </form>
  );
}
