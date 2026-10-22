import "server-only";
import type { AdPlacementData, Category, ListingCard, ListingDetail, Page, PublicPost, Review, Site } from "@/lib/types";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3020";

/** Cached server-side read from the backend. A failed read returns null so pages degrade instead of crashing. */
async function read<T>(path: string, tags: string[], revalidate = 300): Promise<T | null> {
  try {
    const response = await fetch(`${BACKEND}${path}`, { next: { tags, revalidate } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const DEFAULT_SITE: Site = {
  name: "Ahsan Hub",
  tagline: "The directory of halal software and businesses",
  seoTitle: "Ahsan Hub: Discover halal software, SaaS and businesses",
  seoDescription: "A curated directory of halal software, SaaS products and businesses.",
  keywords: [],
  contactEmail: "hello@ahsanhub.com",
  socials: {},
  announcement: "",
  logo: "",
  favicon: "",
  appleTouchIcon: "",
  ogImage: "",
  showBismillah: false,
};

export async function getSite() {
  return (await read<Site>("/api/public/site", ["site"], 3600)) ?? DEFAULT_SITE;
}

export async function getCategories() {
  return (await read<{ items: Category[] }>("/api/public/categories", ["categories"], 600))?.items ?? [];
}

export type ListingQuery = {
  q?: string;
  category?: string;
  pricing?: string;
  sort?: "new" | "top" | "featured";
  featured?: boolean;
  page?: number;
  limit?: number;
};

export async function getListings(query: ListingQuery = {}): Promise<Page<ListingCard>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "" || value === false) continue;
    params.set(key, value === true ? "1" : String(value));
  }
  return (await read<Page<ListingCard>>(`/api/public/listings?${params}`, ["listings"], 120)) ?? { items: [], total: 0, page: 1, pages: 1 };
}

export async function getListing(slug: string) {
  return read<ListingDetail>(`/api/public/listings/${encodeURIComponent(slug)}`, ["listings", `listing:${slug}`], 300);
}

export async function getReviews(slug: string) {
  return (await read<{ items: Review[] }>(`/api/public/listings/${encodeURIComponent(slug)}/reviews`, [`listing:${slug}`], 300))?.items ?? [];
}

export async function getAds(placement: string) {
  return read<AdPlacementData>(`/api/public/ads?placement=${placement}`, ["ads", "listings"], 300);
}

export async function getSitemap() {
  return read<{ listings: { slug: string; updatedAt: string }[]; categories: string[]; posts?: { slug: string; kind: "blog" | "page"; updatedAt: string }[] }>("/api/public/sitemap", ["listings", "categories", "posts"], 3600);
}

export async function getPosts(kind: "blog" | "page" = "blog") {
  return (await read<{ items: PublicPost[] }>(`/api/public/posts?kind=${kind}`, ["posts"], 300))?.items ?? [];
}

export async function getPost(slug: string) {
  return read<PublicPost>(`/api/public/posts/${encodeURIComponent(slug)}`, ["posts", `post:${slug}`], 300);
}
