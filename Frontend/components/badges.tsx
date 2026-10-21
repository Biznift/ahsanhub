import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { PRICING_LABEL, cn } from "@/lib/format";
import type { CategoryRef, Pricing } from "@/lib/types";

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
