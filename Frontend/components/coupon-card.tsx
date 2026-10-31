"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Ticket } from "lucide-react";
import type { CouponDeal } from "@/lib/types";
import { hostOf, compactCount } from "@/lib/format";
import { ListingLogo } from "@/components/listing-logo";
import { KindBadge, PricingBadge } from "@/components/badges";
import { useOpenedCoupon, type OpenedCoupon } from "@/components/use-opened-coupon";

export function CouponGrid({ items }: { items: CouponDeal[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((deal) => (
        <CouponCard key={deal.id} deal={deal} />
      ))}
    </div>
  );
}

function CouponCard({ deal }: { deal: CouponDeal }) {
  const listing = deal.listing;
  const { opened, busy, view } = useOpenedCoupon(deal.id);

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
            <span className="text-[12px] font-medium tabular-nums text-muted">{compactCount(listing.viewCount)} views</span>
          </div>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-[14px] leading-[1.55] text-muted">{listing.overview}</p>
      <div className="mt-4">
        <CouponBoxes title={deal.title} opened={opened} busy={busy} onView={view} />
      </div>
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

export function ProductCoupon({ dealId, title }: { dealId: string; title: string }) {
  const { opened, busy, view } = useOpenedCoupon(dealId);
  return (
    <div className="rounded-2xl border border-brand-line bg-brand-soft p-5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-text">
        <Ticket size={15} /> Coupon code
      </p>
      <div className="mt-3">
        <CouponBoxes title={title} opened={opened} busy={busy} onView={view} />
      </div>
    </div>
  );
}

function CouponBoxes({
  title,
  opened,
  busy,
  onView,
}: {
  title: string;
  opened: OpenedCoupon | null;
  busy: boolean;
  onView: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!opened?.code) return;
    try {
      await navigator.clipboard.writeText(opened.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  const offer = title?.trim() ?? "";
  const instructions = opened?.note?.trim() ?? "";

  return (
    <div className="flex flex-col gap-3">
      {offer && (
        <p className="rounded-xl border border-line bg-bg px-3 py-2.5 text-[15px] font-semibold leading-snug text-ink">{offer}</p>
      )}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand-line bg-brand-soft px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-text">Coupon code</p>
          {opened ? (
            <p className="truncate font-mono text-[16px] font-semibold tracking-[0.04em] text-ink">{opened.code || "No code"}</p>
          ) : (
            <p className="font-mono text-[16px] font-semibold tracking-[0.28em] text-muted" aria-hidden="true">
              ••••••••
            </p>
          )}
        </div>
        {opened ? (
          <button
            type="button"
            onClick={copy}
            disabled={!opened.code}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition hover:border-line-strong disabled:opacity-50"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onView}
            disabled={busy}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition hover:border-line-strong disabled:opacity-60"
          >
            {busy ? "Opening…" : "View coupon code"}
          </button>
        )}
      </div>
      {opened ? (
        <div className="rounded-xl border border-line bg-bg px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">How to use it</p>
          <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
            {instructions || "No extra instructions for this code."}
          </p>
        </div>
      ) : (
        <p className="sr-only">The coupon code and instructions stay hidden until you view the coupon.</p>
      )}
    </div>
  );
}
