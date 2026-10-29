"use client";

import { FormEvent, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Flag, X } from "lucide-react";
import { cn } from "@/lib/format";

const REASONS = [
  { id: "not_halal", label: "Not halal" },
  { id: "halal_claim", label: "Halal claim looks wrong" },
  { id: "wrong_info", label: "Wrong or outdated info" },
  { id: "broken_link", label: "Broken or misleading link" },
  { id: "spam", label: "Spam or scam" },
  { id: "other", label: "Something else" },
] as const;

type Reason = (typeof REASONS)[number]["id"];

export function ReportListing({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next && state === "done") {
      setState("idle");
      setReason("");
      setBody("");
      setEmail("");
      setError(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason) return setError("Choose what is wrong.");
    setState("sending");
    setError(null);
    try {
      const response = await fetch(`/api/public/listings/${slug}/reports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, body, email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send the report.");
      setState("done");
    } catch (problem) {
      setError((problem as Error).message);
      setState("idle");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition hover:border-line-strong">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-band text-muted">
          <Flag size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink">Report this listing</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-muted">Not halal, wrong details, or anything else we should check.</span>
        </span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(90vh,760px)] w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Report {name}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-muted">
                This stays private. It does not appear on the listing, and we read it before changing anything.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-band hover:text-ink" aria-label="Close">
              <X size={16} />
            </Dialog.Close>
          </div>

          {state === "done" ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-brand-line bg-brand-soft p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-white">
                <Check size={15} strokeWidth={2.6} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">Thank you, we received it</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-ink-soft">We will look at this listing and fix what needs fixing.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5">
              <fieldset>
                <legend className="text-[13px] font-medium text-ink-soft">What is wrong?</legend>
                <div className="mt-2 grid gap-1.5">
                  {REASONS.map((item) => (
                    <label key={item.id} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[14px]", reason === item.id ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-soft hover:border-line-strong")}>
                      <input type="radio" name="reason" value={item.id} checked={reason === item.id} onChange={() => setReason(item.id)} className="accent-[var(--brand)]" />
                      {item.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">What should we look at?</span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={4}
                  placeholder="Tell us what you noticed, and where you saw it."
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-muted focus:border-brand"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">Email, if we should reply</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={160}
                  autoComplete="email"
                  placeholder="Optional"
                  className="h-10 w-full rounded-lg border border-line bg-bg px-3 text-[14px] outline-none placeholder:text-muted focus:border-brand"
                />
              </label>
              {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
              <button type="submit" disabled={state === "sending"} className="mt-4 h-10 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60">
                {state === "sending" ? "Sending…" : "Send report"}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
