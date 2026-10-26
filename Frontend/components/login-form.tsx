"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not sign in.");
      router.push(next);
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
      setBusy(false);
    }
  }

  const input = "h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] text-ink outline-none transition focus:border-brand";
  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium text-ink">Email</span>
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={input} />
      </label>
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium text-ink">Password</span>
        <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className={input} />
      </label>
      {error && <p className="text-[14px] text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <div className="pt-2">
        <p className="mb-3 text-[14px] text-muted">No account yet?</p>
        <Link href={signupHref} className="flex h-11 w-full items-center justify-center rounded-xl border border-line text-[15px] font-semibold text-ink transition hover:border-line-strong">
          Sign up
        </Link>
      </div>
    </form>
  );
}
