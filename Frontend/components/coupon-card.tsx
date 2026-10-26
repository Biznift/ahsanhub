"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import type { CouponDeal } from "@/lib/types";
import { hostOf } from "@/lib/format";
import { ListingLogo } from "@/components/listing-logo";
import { KindBadge, PricingBadge } from "@/components/badges";
import { CouponAccess } from "@/components/coupon-access";

export function CouponGrid({ items }: { items: CouponDeal[] }) {
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  async function loadCodes() {
    const response = await fetch("/api/account/coupon-codes", { cache: "no-store" });
    if (!response.ok) {
      setCodes({});
      return;
    }
    const body = (await response.json()) as { items?: { id: string; code: string }[] };
    const next: Record<string, string> = {};
    for (const item of body.items ?? []) next[item.id] = item.code;
    setCodes(next);
  }

  useEffect(() => {
    loadCodes().catch(() => setCodes({}));
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((deal) => (
          <CouponCard key={deal.id} deal={deal} code={codes[deal.id] ?? null} onUnlock={() => setOpen(true)} />
        ))}
      </div>
      <CouponAccess
        open={open}
        onOpenChange={setOpen}
        onReady={() => {
          loadCodes()
            .catch(() => setCodes({}))
            .finally(() => setOpen(false));
        }}
      />
    </>
  );
}

function CouponCard({ deal, code, onUnlock }: { deal: CouponDeal; code: string | null; onUnlock: () => void }) {
  const [copied, setCopied] = useState(false);
  const listing = deal.listing;

  async function copy() {
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
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start gap-4">
        <ListingLogo src={listing.logo} name={listing.name} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            <Link href={`/product/${listing.slug}`} className="hover:text-brand-text">
              {listing.name}
            </Link>
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <KindBadge kind={listing.kind} />
            <PricingBadge pricing={listing.pricing} />
          </div>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-[14px] leading-[1.55] text-muted">{listing.overview}</p>
      {deal.note && <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{deal.note}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand-line bg-brand-soft px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-text">Coupon code</p>
          {code ? (
            <p className="truncate font-mono text-[16px] font-semibold tracking-[0.04em] text-ink">{code}</p>
          ) : (
            <p className="font-mono text-[16px] font-semibold tracking-[0.28em] text-muted" aria-hidden="true">
              ••••••••
            </p>
          )}
        </div>
        {code ? (
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition hover:border-line-strong"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onUnlock}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition hover:border-line-strong"
          >
            View code
          </button>
        )}
      </div>
      {!code && <p className="sr-only">The coupon code is hidden until you sign in.</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {deal.action ? (
          <a
            href={deal.action.url}
            target="_blank"
            rel={deal.action.kind === "offer" ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer"}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-[14px] font-semibold text-white transition hover:bg-brand-hover"
          >
            {deal.action.label}
            <ArrowUpRight size={15} />
          </a>
        ) : (
          <span className="text-[13px] text-muted">No link on this listing yet.</span>
        )}
        <Link href={`/product/${listing.slug}`} className="text-[13px] font-semibold text-brand-text">
          View listing
        </Link>
      </div>
      {deal.action && (
        <p className="mt-2 truncate text-[12px] text-muted">
          {deal.action.kind === "offer" ? "Offer link" : "Product website"} · {hostOf(deal.action.url)}
        </p>
      )}
    </article>
  );
}
