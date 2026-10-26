"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not create the account.");
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
        <span className="mb-2 block text-[14px] font-medium text-ink">Name</span>
        <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={input} />
      </label>
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium text-ink">Email</span>
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={input} />
      </label>
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium text-ink">Phone number</span>
        <input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="01XXXXXXXXX" className={input} />
      </label>
      <label className="block">
        <span className="mb-2 block text-[14px] font-medium text-ink">Password</span>
        <input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" className={input} />
      </label>
      <p className="text-[13px] leading-relaxed text-muted">Your email and phone number are not publicly visible.</p>
      {error && <p className="text-[14px] text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60">
        {busy ? "Creating account…" : "Create account"}
      </button>
      <p className="pt-2 text-[14px] text-muted">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-brand-text">
          Sign in
        </Link>
      </p>
    </form>
  );
}
