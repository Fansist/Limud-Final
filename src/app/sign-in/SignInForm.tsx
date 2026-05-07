"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";

export function SignInForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErr(null);
    setPending(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    setPending(false);
    if (!res || res.error) {
      setErr("That didn't work. Check your email and password.");
      return;
    }
    router.push(sp.get("callbackUrl") ?? "/");
  }

  return (
    <main className="min-h-screen grid place-items-center bg-paper">
      <div className="card w-full max-w-md p-8">
        <Brand size="md" />
        <h1 className="mt-6 text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Or{" "}
          <Link href="/demo" className="text-brand-600">try the demo</Link>
          {" "}— no account needed.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err ? <p className="text-sm text-signal-alert">{err}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
