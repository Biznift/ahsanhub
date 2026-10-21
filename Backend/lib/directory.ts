import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { cleanDescription, plainText } from "@/lib/sanitize";
import { RULES, fileField, removeUpload, saveUpload } from "@/lib/upload";

export const SOCIAL_KEYS = ["x", "linkedin", "facebook", "instagram", "youtube", "github", "tiktok", "whatsapp"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type Socials = Partial<Record<SocialKey, string>>;

export const PRICING = ["free", "freemium", "paid", "open_source"] as const;
export const PLATFORMS = ["web", "ios", "android", "windows", "macos", "linux", "chrome"] as const;

/** Banner placements. Native placements show sponsored listings only and have no creative size. */
export const AD_PLACEMENTS = {
  "home-leaderboard": { label: "Home, between sections", width: 1200, height: 150 },
  "product-sidebar": { label: "Product page, sidebar top", width: 300, height: 250 },
  "product-sidebar-tall": { label: "Product page, sidebar tall", width: 300, height: 600 },
  "product-mobile": { label: "Product page, mobile", width: 600, height: 150 },
} as const;
export type AdPlacement = keyof typeof AD_PLACEMENTS;
export const NATIVE_PLACEMENTS = ["explore-inline"] as const;

export function isPlacement(value: string): value is AdPlacement {
  return value in AD_PLACEMENTS;
}

export function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    if (url.username || url.password) throw new Error();
    if (!url.hostname.includes(".")) throw new Error();
    return url.toString().replace(/\/$/, url.pathname === "/" ? "" : "/");
  } catch {
    throw new HttpError(400, `"${raw}" is not a valid link.`);
  }
}

export function normalizeSocials(input: Record<string, string | undefined> | undefined): Socials {
  const out: Socials = {};
  for (const key of SOCIAL_KEYS) {
    const raw = input?.[key]?.trim();
    if (!raw) continue;
    if (key === "whatsapp" && /^\+?[\d\s-]{6,}$/.test(raw)) {
      out.whatsapp = `https://wa.me/${raw.replace(/\D/g, "")}`;
    } else {
      out[key] = normalizeUrl(raw);
    }
  }
  return out;
}

/** Keeps only social links that normalize to http(s). Bad stored values are dropped. */
export function httpSocials(input: unknown): Socials {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const out: Socials = {};
  for (const key of SOCIAL_KEYS) {
    const value = source[key];
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      const url = normalizeSocials({ [key]: value })[key];
      if (url) out[key] = url;
    } catch {
      // Ignore a stored value that is not a real link.
    }
  }
  return out;
}

function safeHttp(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

const socialsSchema = z.record(z.string(), z.string().max(300)).optional();

const founderSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Founder name is too short").max(80),
  role: z.string().trim().max(80).default(""),
  bio: z.string().trim().max(600).default(""),
  socials: socialsSchema,
  removePhoto: z.boolean().optional(),
});

export const listingSchema = z.object({
  name: z.string().trim().min(2, "Company name is too short").max(80),
  overview: z.string().trim().min(10, "Write at least a sentence").max(180, "Keep the overview under 180 characters"),
  description: z.string().max(60000),
  website: z.string().trim().min(4, "Website is required"),
  pricing: z.enum(PRICING),
  categoryIds: z.array(z.string()).min(1, "Pick at least one category").max(5, "Pick up to 5 categories"),
  country: z.string().trim().max(60).default(""),
  platforms: z.array(z.enum(PLATFORMS)).default([]),
  halalNote: z.string().trim().max(300).default(""),
  socials: socialsSchema,
  founders: z.array(founderSchema).max(5, "Up to 5 founders").default([]),
  removeBanner: z.boolean().optional(),
});

export type ListingInput = z.infer<typeof listingSchema>;

export function parseListingForm(form: FormData) {
  const raw = form.get("data");
  if (typeof raw !== "string") throw new HttpError(400, "Missing listing data.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Listing data is not valid JSON.");
  }
  return listingSchema.parse(json);
}

type Existing = Prisma.ListingGetPayload<{ include: { founders: true } }>;

/**
 * Validates the form, stores uploads, and returns the Prisma data for the listing columns.
 * Founders and categories are written by `writeRelations` after the listing row exists.
 */
export async function prepareListing(form: FormData, input: ListingInput, existing: Existing | null) {
  const description = cleanDescription(input.description);
  const textLength = plainText(description).length;
  if (textLength < 80) throw new HttpError(400, "Description needs at least 80 characters of text.");

  const categories = await db.category.findMany({ where: { id: { in: input.categoryIds }, hidden: false }, select: { id: true } });
  if (categories.length !== new Set(input.categoryIds).size) throw new HttpError(400, "One of the categories no longer exists.");

  const logoFile = fileField(form, "logo");
  if (!logoFile && !existing?.logo) throw new HttpError(400, "Upload a logo.");
  const bannerFile = fileField(form, "banner");

  const logo = logoFile ? (await saveUpload(logoFile, RULES.logo, "logos")).path : existing!.logo;
  let banner = existing?.banner ?? null;
  if (bannerFile) banner = (await saveUpload(bannerFile, RULES.banner, "banners")).path;
  else if (input.removeBanner) banner = null;

  const founderPhotos: (string | null)[] = [];
  for (const [index, founder] of input.founders.entries()) {
    const file = fileField(form, `founderPhoto:${index}`);
    const previous = existing?.founders.find((item) => item.id === founder.id)?.photo ?? null;
    if (file) founderPhotos.push((await saveUpload(file, RULES.founder, "founders")).path);
    else founderPhotos.push(founder.removePhoto ? null : previous);
  }

  const kept = new Set<string>([logo ?? "", banner ?? "", ...founderPhotos.map((item) => item ?? "")]);
  const stale = existing ? [existing.logo, existing.banner, ...existing.founders.map((item) => item.photo)].filter((item) => item && !kept.has(item)) : [];

  return {
    columns: {
      name: input.name,
      overview: input.overview,
      description,
      website: normalizeUrl(input.website),
      logo,
      banner,
      pricing: input.pricing,
      country: input.country,
      platforms: input.platforms,
      halalNote: input.halalNote,
      socials: normalizeSocials(input.socials),
    },
    founders: input.founders.map((founder, index) => ({
      name: founder.name,
      role: founder.role,
      bio: founder.bio,
      photo: founderPhotos[index],
      socials: normalizeSocials(founder.socials),
      sortOrder: index,
    })),
    categoryIds: [...new Set(input.categoryIds)],
    stale: stale as string[],
  };
}

export async function writeRelations(listingId: string, prepared: Awaited<ReturnType<typeof prepareListing>>) {
  await db.$transaction([
    db.founder.deleteMany({ where: { listingId } }),
    db.listingCategory.deleteMany({ where: { listingId } }),
    db.founder.createMany({ data: prepared.founders.map((founder) => ({ ...founder, listingId })) }),
    db.listingCategory.createMany({ data: prepared.categoryIds.map((categoryId) => ({ listingId, categoryId })) }),
  ]);
  await Promise.all(prepared.stale.map((item) => removeUpload(item)));
}

export const cardInclude = {
  categories: { include: { category: { select: { name: true, slug: true, hidden: true } } } },
} satisfies Prisma.ListingInclude;

type CardRow = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export function toCard(row: CardRow, options?: { includeHidden?: boolean }) {
  const includeHidden = options?.includeHidden ?? true;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    overview: row.overview,
    logo: row.logo,
    pricing: row.pricing,
    featured: row.featured,
    sponsored: row.sponsored,
    halalVerified: row.halalVerified,
    voteCount: row.voteCount,
    categories: row.categories
      .filter((item) => includeHidden || !item.category.hidden)
      .map((item) => ({ name: item.category.name, slug: item.category.slug })),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

export const detailInclude = {
  ...cardInclude,
  founders: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ListingInclude;

type DetailRow = Prisma.ListingGetPayload<{ include: typeof detailInclude }>;

export function toDetail(row: DetailRow, options?: { includeHidden?: boolean }) {
  return {
    ...toCard(row, options),
    description: cleanDescription(row.description),
    website: safeHttp(row.website),
    banner: row.banner,
    country: row.country,
    platforms: row.platforms,
    halalNote: row.halalNote,
    socials: httpSocials(row.socials),
    founders: row.founders.map((founder) => ({
      id: founder.id,
      name: founder.name,
      role: founder.role,
      bio: founder.bio,
      photo: founder.photo,
      socials: httpSocials(founder.socials),
    })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Same as the detail shape plus the private fields an owner or admin edits. */
export function toEditable(row: DetailRow) {
  return {
    ...toDetail(row),
    status: row.status,
    contactEmail: row.contactEmail,
    ownerId: row.ownerId,
    categoryIds: row.categories.map((item) => item.categoryId),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function ratingsFor(listingIds: string[]) {
  if (listingIds.length === 0) return new Map<string, { average: number; count: number }>();
  const rows = await db.review.groupBy({
    by: ["listingId"],
    where: { listingId: { in: listingIds }, status: "approved" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.listingId, { average: Math.round((row._avg.rating ?? 0) * 10) / 10, count: row._count._all }]));
}

/** Tells the public site to drop cached pages for these tags. Failure only delays the update. */
export function revalidate(...tags: string[]) {
  const site = process.env.FRONTEND_URL;
  const key = process.env.REVALIDATE_SECRET;
  if (!site || !key) return;
  fetch(`${site}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": key },
    body: JSON.stringify({ tags }),
  }).catch(() => undefined);
}
