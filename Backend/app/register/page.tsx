"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Desk } from "@/components/desk";
import { useStore } from "@/components/store";
import { BUYER_STORAGE_KEY, rememberReferralCode, sharePath } from "@/lib/referrals";
import { Button, Field, TextInput } from "@/components/ui";

function RegisterForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { registerCustomer } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);

  useEffect(() => {
    const code = rememberReferralCode(params.get("ref"));
    if (code) setRef(code);
  }, [params]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = registerCustomer({ name, email, savedRef: ref });
    if (!result.ok) {
      setError(result.error);
      setCreated(null);
      return;
    }
    sessionStorage.setItem(BUYER_STORAGE_KEY, result.id);
    setCreated({ id: result.id, code: result.code });
    setError(null);
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <Desk
      title="Create an account"
      lede="Every account is an affiliate. A code from the link is saved for checkout, and the referrer is attached on the first successful payment."
    >
      <div className="max-w-md rounded-2xl border border-[var(--line)] bg-white p-5">
        {created ? (
          <div className="space-y-3">
            <p className="text-sm text-[#475467]">Your code is ready.</p>
            <p className="mono text-2xl font-semibold text-[#1d2939]">{created.code}</p>
            <p className="break-all text-sm text-[#475467]">
              {origin}
              {sharePath(created.code)}
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={() => router.push("/dashboard/referrals")}>
                Open member desk
              </Button>
              <Button type="button" tone="ghost" onClick={() => router.push("/checkout")}>
                Checkout
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name">
              <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="Referral code">
              <TextInput value={ref} onChange={(event) => setRef(event.target.value)} placeholder="Optional" className="mono" />
            </Field>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <Button type="submit">Create account</Button>
          </form>
        )}
      </div>
    </Desk>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Opening register…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
