"use client";

import { FormEvent, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const inputClass = "h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] text-ink outline-none transition focus:border-brand";

export function CouponAccess({
  open,
  onOpenChange,
  onReady,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReady: () => void;
}) {
  const [mode, setMode] = useState<"join" | "password" | "phone">("join");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: "join" | "password" | "phone") {
    setMode(next);
    setError(null);
    setBusy(false);
  }

  function changeOpen(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setBusy(false);
      setError(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const path = mode === "join" ? "/api/auth/register" : "/api/auth/login";
    const body =
      mode === "join"
        ? { name, email, phone }
        : mode === "phone"
          ? { email, phone }
          : { email, password };
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not continue.");
      setBusy(false);
      onReady();
    } catch (problem) {
      setError((problem as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-bg p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-[20px] font-semibold tracking-[-0.02em] text-ink">View the coupon code</Dialog.Title>
            <Dialog.Close className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-band" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-[14px] leading-relaxed text-muted">
            {mode === "join"
              ? "Create a free account with your name, email, and phone. Then the code is visible and you can copy it."
              : "Sign in with the account you already have."}
          </Dialog.Description>
          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "join" && (
              <label className="block">
                <span className="mb-1.5 block text-[14px] font-medium text-ink">Name</span>
                <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-medium text-ink">Email</span>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={inputClass} />
            </label>
            {mode !== "password" && (
              <label className="block">
                <span className="mb-1.5 block text-[14px] font-medium text-ink">Phone number</span>
                <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="01XXXXXXXXX" className={inputClass} />
              </label>
            )}
            {mode === "password" && (
              <label className="block">
                <span className="mb-1.5 block text-[14px] font-medium text-ink">Password</span>
                <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className={inputClass} />
              </label>
            )}
            {error && <p className="text-[14px] text-danger">{error}</p>}
            <button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60">
              {busy ? "Please wait…" : mode === "join" ? "Create account and view code" : "Sign in and view code"}
            </button>
          </form>
          <div className="mt-4 space-y-1 text-[14px] text-muted">
            {mode === "join" ? (
              <>
                <button type="button" onClick={() => switchMode("password")} className="block font-medium text-brand-text">
                  I already have an account
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => switchMode("join")} className="block font-medium text-brand-text">
                  Create an account
                </button>
                <button type="button" onClick={() => switchMode(mode === "password" ? "phone" : "password")} className="block font-medium text-brand-text">
                  {mode === "password" ? "I signed up with my phone" : "I use a password"}
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
