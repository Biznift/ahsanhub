import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { KIND_LABEL, PRICING_LABEL, cn } from "@/lib/format";
import type { CategoryRef, ListingKind, Pricing } from "@/lib/types";

export function KindBadge({ kind, className }: { kind?: ListingKind | null; className?: string }) {
  if (!kind || !(kind in KIND_LABEL)) return null;
  return <span className={cn("inline-flex h-6 items-center rounded-md bg-ink px-2 text-[12px] font-medium text-bg", className)}>{KIND_LABEL[kind]}</span>;
}

export function PricingBadge({ pricing, className }: { pricing: Pricing; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-md border border-line px-2 text-[12px] font-medium text-ink-soft", className)}>
      {PRICING_LABEL[pricing]}
    </span>
  );
}

export function HalalBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md bg-brand-soft font-semibold text-brand-text", compact ? "h-5 px-1.5 text-[11px]" : "h-6 px-2 text-[12px]")}
      title="Halal practices reviewed by Ahsan Hub"
    >
      <BadgeCheck size={compact ? 12 : 13} strokeWidth={2.4} />
      Halal verified
    </span>
  );
}

export function SponsoredBadge() {
  return <span className="inline-flex h-5 items-center rounded-md bg-band px-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Sponsored</span>;
}

export function FeaturedBadge() {
  return <span className="inline-flex h-5 items-center rounded-md bg-brand-soft px-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-text">Featured</span>;
}

export function AlternativeLinks({ items, limit = 3 }: { items: { id?: string; name: string; slug: string }[]; limit?: number }) {
  const shown = items.slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <p className="relative z-10 flex flex-wrap items-baseline gap-x-1 text-[12.5px] leading-snug text-muted">
      <span className="shrink-0">Alternative to</span>
      {shown.map((item, index) => (
        <span key={item.id ?? item.slug} className="inline-flex min-w-0 items-baseline">
          <Link href={`/explore?alternative=${item.slug}`} className="break-words font-semibold text-brand-text hover:underline">
            {item.name}
          </Link>
          {index < shown.length - 1 && <span aria-hidden="true">,</span>}
        </span>
      ))}
    </p>
  );
}

export function CategoryChip({ category, link = true }: { category: CategoryRef; link?: boolean }) {
  const className = "inline-flex h-6 items-center rounded-md bg-band px-2 text-[12px] font-medium text-ink-soft";
  return link ? (
    <Link href={`/category/${category.slug}`} className={cn(className, "transition hover:text-ink")}>
      {category.name}
    </Link>
  ) : (
    <span className={className}>{category.name}</span>
  );
}
