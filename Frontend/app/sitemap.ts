import type { MetadataRoute } from "next";
import { getSitemap } from "@/lib/api";
import { SITE_URL } from "@/lib/format";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemap();
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/coupons`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.5 },
    ...(data?.categories ?? []).map((slug) => ({ url: `${SITE_URL}/category/${slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...(data?.listings ?? []).map((item) => ({ url: `${SITE_URL}/product/${item.slug}`, lastModified: new Date(item.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    ...(data?.posts ?? []).map((item) => ({
      url: `${SITE_URL}${item.kind === "page" ? "/p" : "/blog"}/${item.slug}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly" as const,
      priority: item.kind === "page" ? 0.4 : 0.6,
    })),
  ];
}
