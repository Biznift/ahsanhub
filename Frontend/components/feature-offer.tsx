"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";

export function trackPromo(kind: "impression" | "click" | "coupon", listingId: string) {
  const body = JSON.stringify({ kind, listingId });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/public/promos/events", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/public/promos/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

export function FeatureOffer({ dealId, label, listingId }: { dealId: string; label: string; listingId: string }) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function open(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy || code) return;
    trackPromo("coupon", listingId);
    setBusy(true);
    try {
      const response = await fetch("/api/account/coupon-codes", { cache: "no-store" });
      if (response.status === 401) {
        const next = window.location.pathname + window.location.search;
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!response.ok) return;
      const body = (await response.json()) as { items?: { id: string; code: string }[] };
      setCode(body.items?.find((item) => item.id === dealId)?.code ?? "");
    } finally {
      setBusy(false);
    }
  }

  async function copy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      data-promo-coupon
      onClick={code ? copy : open}
      className="relative z-20 mt-3 flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-brand-line bg-brand-soft px-3 py-2 text-left"
    >
      <span className="text-[13px] font-semibold text-brand-text">{label}</span>
      {code ? (
        <span className="inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold text-ink">
          {code || "No code"}
          {code && (copied ? <Check size={13} /> : <Copy size={13} />)}
        </span>
      ) : (
        <span className="text-[13px] font-semibold text-ink">{busy ? "Opening…" : "View coupon code"}</span>
      )}
    </button>
  );
}
