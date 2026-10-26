import type { ListingKind, Pricing } from "@/lib/types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const KIND_LABEL: Record<ListingKind, string> = {
  software: "Software / SaaS",
  service: "Service",
  ecommerce: "E-commerce",
};

export const LISTING_KINDS = Object.keys(KIND_LABEL) as ListingKind[];

/** Listings and categories created before types existed are software. */
export function categoryKind(category: { kind?: ListingKind | null }): ListingKind {
  return category.kind && category.kind in KIND_LABEL ? category.kind : "software";
}

export const PRICING_LABEL: Record<Pricing, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open source",
};

export const PLATFORM_LABEL: Record<string, string> = {
  web: "Web",
  ios: "iOS",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  chrome: "Chrome extension",
};

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function compactCount(value: number | null | undefined) {
  const count = value ?? 0;
  if (count < 1000) return String(count);
  if (count < 10_000) {
    const scaled = count / 1000;
    return `${scaled.toFixed(1).replace(/\.0$/, "")}k`;
  }
  if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function absolute(path: string) {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

export function compactNumber(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);
}
