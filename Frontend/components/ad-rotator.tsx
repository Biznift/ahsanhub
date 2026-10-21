"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { AdCreative, ListingCard } from "@/lib/types";
import { ListingLogo } from "@/components/listing-logo";
import { cn } from "@/lib/format";

type Size = { width: number; height: number };

function safeHttp(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "#";
  } catch {
    return "#";
  }
}

function AdLabel({ text = "Ad" }: { text?: string }) {
  return <span className="absolute right-2 top-2 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">{text}</span>;
}

export function AdRotator({ size, ads, sponsored }: { size: Size; ads: AdCreative[]; sponsored: ListingCard[] }) {
  const [pick, setPick] = useState(0);
  const pool = ads.length > 0 ? ads.length : sponsored.length;
  useEffect(() => setPick(Math.floor(Math.random() * pool)), [pool]);

  const ratio = `${size.width} / ${size.height}`;
  const wide = size.width / size.height >= 2.5;

  if (ads.length > 0) {
    const ad = ads[pick % ads.length];
    const href = safeHttp(ad.url);
    return (
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener"
        className="relative mx-auto block overflow-hidden rounded-xl border border-line bg-band"
        style={{ aspectRatio: ratio, maxWidth: size.width }}
        title={ad.title}
      >
        <AdLabel />
        {ad.kind === "video" ? (
          <video src={ad.file} autoPlay muted loop playsInline preload="metadata" aria-label={ad.title} className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.file} alt={ad.title} width={size.width} height={size.height} loading="lazy" className="h-full w-full object-cover" />
        )}
      </a>
    );
  }

  const tall = size.height > size.width * 1.5;
  const shown = tall ? rotate(sponsored, pick).slice(0, 3) : [sponsored[pick % sponsored.length]];

  return (
    <div className={cn("relative mx-auto rounded-xl border border-line bg-surface", wide ? "p-4" : "p-5")} style={{ maxWidth: wide ? size.width : size.width }}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Sponsored</p>
      <div className={cn(tall ? "space-y-5" : "")}>
        {shown.map((listing) => (
          <div key={listing.id} className={cn("relative flex gap-3.5", wide ? "items-center" : "flex-col")}>
            <div className="flex items-center gap-3">
              <ListingLogo src={listing.logo} name={listing.name} size={wide ? 44 : 40} />
              {!wide && <p className="text-[15px] font-semibold leading-snug text-ink">{listing.name}</p>}
            </div>
            <div className="min-w-0 flex-1">
              {wide && <p className="text-[15px] font-semibold text-ink">{listing.name}</p>}
              <p className={cn("text-[13.5px] leading-[1.5] text-muted", wide ? "truncate" : "line-clamp-3")}>{listing.overview}</p>
            </div>
            <Link
              href={`/product/${listing.slug}`}
              className={cn(
                "inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-line px-3 text-[13px] font-semibold text-ink transition hover:border-brand hover:text-brand-text",
                !wide && "w-full",
              )}
            >
              View {listing.name.length < 16 ? listing.name : "product"} <ArrowUpRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function rotate<T>(items: T[], by: number) {
  const start = by % Math.max(1, items.length);
  return [...items.slice(start), ...items.slice(0, start)];
}
