"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Loader2 } from "lucide-react";
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
    router.push(safeCallback(sp.get("callbackUrl")));
  }

  // Refuse anything that isn't a same-origin relative path so a phisher
  // can't seed `?callbackUrl=https://attacker.example/` and bounce a
  // freshly-signed-in user to a credential trap.
  function safeCallback(raw: string | null): string {
    if (!raw) return "/";
    if (!raw.startsWith("/")) return "/";
    if (raw.startsWith("//")) return "/";
    return raw;
  }

  return (
    <main className="mesh-gradient min-h-screen grid place-items-center px-4">
      <div className="card-glass w-full max-w-md shadow-lg animate-scale-in">
        <Brand size="md" />
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">
          Or{" "}
          <Link href="/demo" className="text-primary-600 hover:text-primary-700 font-medium">
            try the demo
          </Link>
          {" "}— no account needed.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input-field mt-1.5"
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
              autoComplete="current-password"
              className="input-field mt-1.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {err}
            </p>
          ) : null}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={16} strokeWidth={2} />
                Sign in
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
