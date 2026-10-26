"use client";

import { useEffect, useRef } from "react";
import type { PromoListing } from "@/lib/types";
import { ProductCard, ProductRow } from "@/components/product-card";
import { trackPromo } from "@/components/feature-offer";

const seen = new Set<string>();

export function FeaturedPlacement({
  listing,
  layout,
  compact = false,
  caption = false,
}: {
  listing: PromoListing;
  layout: "grid" | "list";
  compact?: boolean;
  caption?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || seen.has(listing.id)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || seen.has(listing.id)) return;
        seen.add(listing.id);
        trackPromo("impression", listing.id);
        observer.disconnect();
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [listing.id]);

  function onClick(event: React.MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-promo-coupon], button")) return;
    const link = target.closest("a");
    if (link instanceof HTMLAnchorElement && !link.pathname.startsWith("/product/")) return;
    trackPromo("click", listing.id);
  }

  const offer = listing.offer;
  return (
    <div ref={ref} onClick={onClick} className={layout === "grid" ? "h-full" : undefined}>
      {caption && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Featured</p>}
      {layout === "grid" ? (
        <ProductCard listing={listing} featuredSlot offer={offer} />
      ) : (
        <ProductRow listing={listing} compact={compact} featuredSlot offer={offer} wrapOverview={!compact} />
      )}
    </div>
  );
}
