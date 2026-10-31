"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useOpenedCoupon } from "@/components/use-opened-coupon";

export function trackPromo(kind: "impression" | "click" | "coupon", listingId: string) {
  const body = JSON.stringify({ kind, listingId });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/public/promos/events", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/public/promos/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

export function FeatureOffer({ dealId, label, listingId }: { dealId: string; label: string; listingId: string }) {
  const { opened, busy, view } = useOpenedCoupon(dealId);
  const [copied, setCopied] = useState(false);

  function open(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy || opened) return;
    trackPromo("coupon", listingId);
    view();
  }

  async function copy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!opened?.code) return;
    try {
      await navigator.clipboard.writeText(opened.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div data-promo-coupon className="relative z-20 mt-3">
      <button
        type="button"
        onClick={opened ? copy : open}
        className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-brand-line bg-brand-soft px-3 py-2 text-left"
      >
        <span className="text-[13px] font-semibold text-brand-text">{label}</span>
        {opened ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold text-ink">
            {opened.code || "No code"}
            {opened.code && (copied ? <Check size={13} /> : <Copy size={13} />)}
          </span>
        ) : (
          <span className="text-[13px] font-semibold text-ink">{busy ? "Opening…" : "View coupon code"}</span>
        )}
      </button>
      {opened && (
        <p className="mt-2 whitespace-pre-line rounded-xl border border-line bg-bg px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
          {opened.note.trim() || "No extra instructions for this code."}
        </p>
      )}
    </div>
  );
}
