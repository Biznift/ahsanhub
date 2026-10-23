import Link from "next/link";
import { Star } from "lucide-react";
import type { ListingCard } from "@/lib/types";
import { ListingLogo } from "@/components/listing-logo";
import { UpvoteButton } from "@/components/upvote-button";
import { AlternativeLinks, CategoryChip, HalalBadge, KindBadge, PricingBadge, SponsoredBadge } from "@/components/badges";
import { cn } from "@/lib/format";

/** Grid card. The whole card links to the product; chips and the vote button sit above the link. */
export function ProductCard({ listing, showSponsored = false }: { listing: ListingCard; showSponsored?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong">
      <div className="flex items-start gap-4">
        <ListingLogo src={listing.logo} name={listing.name} size={52} />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="flex min-w-0 items-center gap-2 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            <Link href={`/product/${listing.slug}`} className="min-w-0 truncate after:absolute after:inset-0 after:rounded-2xl">
              {listing.name}
            </Link>
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showSponsored && listing.sponsored && <SponsoredBadge />}
            {listing.halalVerified && <HalalBadge compact />}
            {listing.rating && listing.rating.count > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted">
                <Star size={12} className="fill-star text-star" />
                {listing.rating.average.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <UpvoteButton id={listing.id} slug={listing.slug} count={listing.voteCount} name={listing.name} />
      </div>
      <p className="mt-4 line-clamp-2 text-[14px] leading-[1.55] text-muted">{listing.overview}</p>
      {(listing.alternatives ?? []).length > 0 && (
        <div className="mt-3">
          <AlternativeLinks items={listing.alternatives} />
        </div>
      )}
      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        <KindBadge kind={listing.kind} />
        <PricingBadge pricing={listing.pricing} />
        {listing.categories.slice(0, 2).map((category) => (
          <CategoryChip key={category.slug} category={category} />
        ))}
      </div>
    </article>
  );
}

/** Compact list row, used for "Recently added", rankings, and the explore list view. */
export function ProductRow({ listing, rank, compact = false, showSponsored = false, wrapOverview = false, className }: { listing: ListingCard; rank?: number; compact?: boolean; showSponsored?: boolean; wrapOverview?: boolean; className?: string }) {
  return (
    <article className={cn("group relative flex min-w-0 rounded-xl px-3 transition hover:bg-band", wrapOverview ? "items-start" : "items-center", compact ? "gap-3 py-2.5" : "gap-3 py-3.5 sm:gap-4", className)}>
      {rank !== undefined && <span className="w-5 shrink-0 pt-1 text-center text-[13px] font-semibold tabular-nums text-muted">{rank}</span>}
      <ListingLogo src={listing.logo} name={listing.name} size={compact ? 40 : 48} />
      <div className="min-w-0 flex-1">
        <h3 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold leading-snug text-ink">
          <Link href={`/product/${listing.slug}`} className="min-w-0 max-w-full truncate after:absolute after:inset-0 after:rounded-xl">
            {listing.name}
          </Link>
          {showSponsored && listing.sponsored && <SponsoredBadge />}
          {listing.halalVerified && !compact && <HalalBadge compact />}
          {listing.rating && listing.rating.count > 0 && !compact && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-muted">
              <Star size={12} className="fill-star text-star" />
              {listing.rating.average.toFixed(1)}
            </span>
          )}
        </h3>
        <p className={cn("mt-0.5 text-muted", compact ? "line-clamp-2 text-[13px] leading-snug" : wrapOverview ? "text-[14px] leading-[1.45]" : "truncate text-[14px]")}>{listing.overview}</p>
        {!compact && (listing.alternatives ?? []).length > 0 && (
          <div className="mt-1.5">
            <AlternativeLinks items={listing.alternatives} />
          </div>
        )}
        <div className={cn("relative z-10 mt-1.5 flex-wrap items-center gap-1.5", compact ? "hidden" : "hidden sm:flex")}>
          <KindBadge kind={listing.kind} className="h-5 text-[11px]" />
          <PricingBadge pricing={listing.pricing} className="h-5 text-[11px]" />
          {listing.categories.slice(0, 2).map((category) => (
            <CategoryChip key={category.slug} category={category} />
          ))}
        </div>
      </div>
      <UpvoteButton id={listing.id} slug={listing.slug} count={listing.voteCount} name={listing.name} />
    </article>
  );
}
