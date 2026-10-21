"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store";
import { Button, Field, TextInput } from "@/components/ui";
import { BrandMark } from "@/components/admin-kit";

export default function LoginPage() {
  const { ready, session, login } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace("/admin");
  }, [ready, session, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const message = await login(email, password);
    setBusy(false);
    setError(message);
    if (!message) router.push("/admin");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f6fa] px-4 py-12">
      <div className="w-full max-w-sm">
        <BrandMark />
        <div className="mt-6 rounded-xl border border-[#e6e8ef] bg-white p-6">
          <h1 className="text-xl font-semibold text-[#1d2939]">Sign in to admin</h1>
          <p className="mt-1 text-sm text-[#667085]">Only admin accounts can open this panel.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            </Field>
            <Field label="Password">
              <TextInput type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </Field>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
