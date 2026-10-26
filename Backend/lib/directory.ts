import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { LISTING_KINDS, type ListingKind } from "@/lib/kinds";
import { cleanDescription, plainText } from "@/lib/sanitize";
import { uniqueSlug } from "@/lib/slug";
import { alert } from "@/lib/telegram";
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

/** A stored upload (`/files/…`) or any http(s) image link. Empty is allowed. */
export function imageAddress(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("/files/")) {
    if (value.includes("..") || value.includes("\\") || value.includes("://")) throw new HttpError(400, "Image URL is not valid.");
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, "Enter a full image URL, starting with https://.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new HttpError(400, "Image URL must start with https://.");
  if (url.username || url.password) throw new HttpError(400, "Image URL is not valid.");
  return value;
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
  photoUrl: z.string().trim().max(2000).optional(),
});

export const listingSchema = z
  .object({
    name: z.string().trim().min(2, "Company name is too short").max(80),
    overview: z.string().trim().min(10, "Write at least a sentence").max(180, "Keep the overview under 180 characters"),
    description: z.string().max(60000),
    website: z.string().trim().min(4, "Website is required"),
    pricing: z.enum(PRICING),
    kind: z.enum(LISTING_KINDS).default("software"),
    categoryIds: z.array(z.string()).max(5).default([]),
    alternativeIds: z.array(z.string()).max(5, "Pick up to 5 alternative tools").default([]),
    proposedCategories: z.array(z.string().trim().min(2, "Category name is too short").max(60)).max(5).default([]),
    country: z.string().trim().max(60).default(""),
    platforms: z.array(z.enum(PLATFORMS)).default([]),
    halalNote: z.string().trim().max(300).default(""),
    socials: socialsSchema,
    founders: z.array(founderSchema).max(5, "Up to 5 founders").default([]),
    removeBanner: z.boolean().optional(),
    logoUrl: z.string().trim().max(2000).optional(),
    bannerUrl: z.string().trim().max(2000).optional(),
    hasCoupon: z.boolean().default(false),
    couponCode: z.string().trim().max(40).default(""),
    couponNote: z.string().trim().max(500).default(""),
  })
  .superRefine((value, ctx) => {
    const names = new Set(value.proposedCategories.map((name) => name.toLowerCase()));
    if (names.size !== value.proposedCategories.length) {
      ctx.addIssue({ code: "custom", message: "Each new category can be added once.", path: ["proposedCategories"] });
    }
    const total = value.categoryIds.length + value.proposedCategories.length;
    if (total < 1) ctx.addIssue({ code: "custom", message: "Pick at least one category.", path: ["categoryIds"] });
    if (total > 5) ctx.addIssue({ code: "custom", message: "Pick up to 5 categories.", path: ["categoryIds"] });
    if (!value.hasCoupon) return;
    if (value.couponCode.length < 2) ctx.addIssue({ code: "custom", message: "Enter the coupon code.", path: ["couponCode"] });
    if (value.couponNote.length < 10) {
      ctx.addIssue({ code: "custom", message: "Explain how and where to use this coupon code.", path: ["couponNote"] });
    }
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

/** Approved categories for this listing type, plus a pending category this listing already uses. New names become pending until an admin approves them. */
async function resolveCategoryIds(kind: ListingKind, categoryIds: string[], proposed: string[], listingId: string | null) {
  const uniqueIds = [...new Set(categoryIds)];
  const selected = uniqueIds.length ? await db.category.findMany({ where: { id: { in: uniqueIds } } }) : [];
  if (selected.length !== uniqueIds.length) throw new HttpError(400, "One of the categories no longer exists.");

  const attached = listingId
    ? new Set((await db.listingCategory.findMany({ where: { listingId }, select: { categoryId: true } })).map((row) => row.categoryId))
    : new Set<string>();

  const resolved: string[] = [];
  for (const category of selected) {
    if (category.kind !== kind) throw new HttpError(400, "Categories have to match the listing type.");
    const approved = category.status === "approved" && !category.hidden;
    const ownPending = category.status === "pending" && attached.has(category.id);
    if (!approved && !ownPending) throw new HttpError(400, "One of the categories is not available.");
    resolved.push(category.id);
  }

  const createdNames: string[] = [];
  for (const name of proposed) {
    const existing = await db.category.findFirst({ where: { kind, name: { equals: name, mode: "insensitive" } } });
    if (existing?.status === "rejected" || (existing?.status === "approved" && existing.hidden)) {
      throw new HttpError(400, `"${name}" is not available. Choose another category or suggest a different name.`);
    }
    if (existing) {
      if (!resolved.includes(existing.id)) resolved.push(existing.id);
      continue;
    }
    const slug = await uniqueSlug(name, async (candidate) => (await db.category.count({ where: { slug: candidate } })) > 0);
    try {
      const row = await db.category.create({ data: { name, slug, kind, status: "pending", description: "" } });
      resolved.push(row.id);
      createdNames.push(name);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const again = await db.category.findFirst({ where: { kind, name: { equals: name, mode: "insensitive" } } });
      if (!again || again.status === "rejected") throw new HttpError(400, `"${name}" is not available. Suggest a different name.`);
      if (!resolved.includes(again.id)) resolved.push(again.id);
    }
  }

  const ids = [...new Set(resolved)];
  if (ids.length < 1 || ids.length > 5) throw new HttpError(400, "Pick between 1 and 5 categories.");
  if (createdNames.length) alert("listing.submitted", `New ${createdNames.length === 1 ? "category" : "categories"} waiting for approval: ${createdNames.join(", ")}.`);
  return ids;
}

/** Saved alternative-tool ids. Unknown ids are rejected so a listing can only point at tools that exist. */
async function resolveAlternativeIds(alternativeIds: string[]) {
  const unique = [...new Set(alternativeIds.filter(Boolean))];
  if (unique.length > 5) throw new HttpError(400, "Pick up to 5 alternative tools.");
  if (unique.length === 0) return [];
  const rows = await db.alternativeTool.findMany({ where: { id: { in: unique } }, select: { id: true } });
  if (rows.length !== unique.length) throw new HttpError(400, "One of the alternative tools is not available.");
  return rows.map((row) => row.id);
}

/**
 * Validates the form, stores uploads, and returns the Prisma data for the listing columns.
 * Founders and categories are written by `writeRelations` after the listing row exists.
 */
export async function prepareListing(form: FormData, input: ListingInput, existing: Existing | null) {
  const description = cleanDescription(input.description);
  const textLength = plainText(description).length;
  if (textLength < 80) throw new HttpError(400, "Description needs at least 80 characters of text.");

  const logoFile = fileField(form, "logo");
  const logoFromUrl = input.logoUrl?.trim() ? imageAddress(input.logoUrl) : "";
  if (!logoFile && !logoFromUrl && !existing?.logo) throw new HttpError(400, "Upload a logo or paste an image URL.");
  const categoryIds = await resolveCategoryIds(input.kind, input.categoryIds, input.proposedCategories, existing?.id ?? null);
  const alternativeIds = await resolveAlternativeIds(input.alternativeIds);
  const bannerFile = fileField(form, "banner");

  const logo = logoFile ? (await saveUpload(logoFile, RULES.logo, "logos")).path : logoFromUrl || existing!.logo;
  let banner = existing?.banner ?? null;
  if (bannerFile) banner = (await saveUpload(bannerFile, RULES.banner, "banners")).path;
  else if (input.bannerUrl?.trim()) banner = imageAddress(input.bannerUrl);
  else if (input.removeBanner) banner = null;

  const founderPhotos: (string | null)[] = [];
  for (const [index, founder] of input.founders.entries()) {
    const file = fileField(form, `founderPhoto:${index}`);
    const previous = existing?.founders.find((item) => item.id === founder.id)?.photo ?? null;
    if (file) founderPhotos.push((await saveUpload(file, RULES.founder, "founders")).path);
    else if (founder.photoUrl?.trim()) founderPhotos.push(imageAddress(founder.photoUrl));
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
      kind: input.kind,
    },
    founders: input.founders.map((founder, index) => ({
      name: founder.name,
      role: founder.role,
      bio: founder.bio,
      photo: founderPhotos[index],
      socials: normalizeSocials(founder.socials),
      sortOrder: index,
    })),
    categoryIds,
    alternativeIds,
    coupon: input.hasCoupon ? { code: input.couponCode, note: input.couponNote } : null,
    stale: stale as string[],
  };
}

export async function writeRelations(listingId: string, prepared: Awaited<ReturnType<typeof prepareListing>>) {
  await db.$transaction([
    db.founder.deleteMany({ where: { listingId } }),
    db.listingCategory.deleteMany({ where: { listingId } }),
    db.listingAlternative.deleteMany({ where: { listingId } }),
    db.founder.createMany({ data: prepared.founders.map((founder) => ({ ...founder, listingId })) }),
    db.listingCategory.createMany({ data: prepared.categoryIds.map((categoryId) => ({ listingId, categoryId })) }),
    ...(prepared.alternativeIds.length
      ? [db.listingAlternative.createMany({ data: prepared.alternativeIds.map((toolId) => ({ listingId, toolId })) })]
      : []),
  ]);
  await Promise.all(prepared.stale.map((item) => removeUpload(item)));
}

export const cardInclude = {
  categories: { include: { category: { select: { name: true, slug: true, hidden: true, status: true } } } },
  alternatives: { include: { tool: { select: { id: true, name: true, slug: true } } } },
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
    kind: row.kind,
    categories: row.categories
      .filter((item) => item.category.status !== "rejected" && (includeHidden || (!item.category.hidden && item.category.status === "approved")))
      .map((item) => ({
        name: item.category.name,
        slug: item.category.slug,
        status: item.category.status === "pending" ? ("pending" as const) : ("approved" as const),
      })),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    alternatives: row.alternatives
      .map((item) => item.tool)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export const detailInclude = {
  ...cardInclude,
  founders: { orderBy: { sortOrder: "asc" as const } },
  couponDeals: { select: { code: true, note: true, active: true, fromListing: true }, orderBy: { sortOrder: "asc" as const } },
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
    coupon: publicCoupon(row.couponDeals),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Usage instructions for a live deal. The code itself stays off the public listing. */
function publicCoupon(deals: { note: string; active: boolean; fromListing: boolean }[]) {
  const live = deals.filter((deal) => deal.active);
  const deal = live.find((item) => item.fromListing) ?? live[0];
  return deal ? { note: deal.note } : null;
}

/** Same as the detail shape plus the private fields an owner or admin edits. */
export function toEditable(row: DetailRow) {
  return {
    ...toDetail(row),
    status: row.status,
    contactEmail: row.contactEmail,
    ownerId: row.ownerId,
    categoryIds: row.categories.filter((item) => item.category.status !== "rejected").map((item) => item.categoryId),
    couponCode: row.couponDeals.find((deal) => deal.fromListing)?.code ?? "",
    couponNote: row.couponDeals.find((deal) => deal.fromListing)?.note ?? "",
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
