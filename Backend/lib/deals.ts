import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { cardInclude, normalizeUrl, toCard } from "@/lib/directory";

export const dealInclude = {
  listing: { include: cardInclude },
} satisfies Prisma.CouponDealInclude;

type DealRow = Prisma.CouponDealGetPayload<{ include: typeof dealInclude }>;

const code = z.string().trim().min(2, "Coupon code is too short.").max(40, "Coupon code is too long.");
const note = z.string().trim().max(500);

export const createDealSchema = z.object({
  listingId: z.string().trim().min(1, "Pick a product."),
  code,
  note: note.optional(),
  ctaEnabled: z.boolean().optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaUrl: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const patchDealSchema = z
  .object({
    listingId: z.string().trim().min(1, "Pick a product."),
    code,
    note,
    ctaEnabled: z.boolean(),
    ctaLabel: z.string().trim().max(40),
    ctaUrl: z.string().trim().max(500),
    active: z.boolean(),
    sortOrder: z.number().int().min(-100000).max(9999),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update.");

type DealInput = z.infer<typeof patchDealSchema>;

function httpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Checks the chosen listing and the optional offer link before a write. */
export async function prepareDeal(
  input: DealInput,
  existing?: { listingId: string; ctaEnabled: boolean; ctaUrl: string },
) {
  const listingId = input.listingId ?? existing?.listingId;
  if (!listingId) throw new HttpError(400, "Pick a product.");
  if (!existing || input.listingId) {
    const listing = await db.listing.findUnique({ where: { id: listingId }, select: { status: true } });
    if (!listing) throw new HttpError(400, "That product is not on the site.");
    if (listing.status !== "published") {
      throw new HttpError(400, "Pick a published listing. Pending and rejected products stay off this page.");
    }
  }

  const ctaEnabled = input.ctaEnabled ?? existing?.ctaEnabled ?? false;
  const rawUrl = input.ctaUrl !== undefined ? input.ctaUrl : (existing?.ctaUrl ?? "");
  const ctaUrl = rawUrl ? normalizeUrl(rawUrl) : "";
  if (ctaEnabled && !ctaUrl) throw new HttpError(400, "Add the offer link, or turn the special call to action off.");

  return {
    ...(input.listingId ? { listingId } : existing ? {} : { listingId }),
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    ...(input.ctaEnabled !== undefined || input.ctaUrl !== undefined || !existing ? { ctaEnabled, ctaUrl } : {}),
    ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
  };
}

export function toAdminDeal(row: DealRow) {
  return {
    id: row.id,
    code: row.code,
    note: row.note,
    ctaEnabled: row.ctaEnabled,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    active: row.active,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    listing: {
      id: row.listing.id,
      name: row.listing.name,
      slug: row.listing.slug,
      logo: row.listing.logo,
      website: row.listing.website,
      status: row.listing.status,
    },
  };
}

/** Creates, updates, or removes the coupon that was submitted with the listing. Other deals on the same product stay. */
export async function syncListingCoupon(listingId: string, coupon: { code: string; note: string } | null) {
  const existing = await db.couponDeal.findFirst({ where: { listingId, fromListing: true }, orderBy: { createdAt: "asc" } });
  if (!coupon) {
    if (existing) await db.couponDeal.delete({ where: { id: existing.id } });
    return;
  }
  if (existing) {
    await db.couponDeal.update({ where: { id: existing.id }, data: { code: coupon.code, note: coupon.note } });
    return;
  }
  const last = await db.couponDeal.aggregate({ _max: { sortOrder: true } });
  await db.couponDeal.create({
    data: {
      listingId,
      code: coupon.code,
      note: coupon.note,
      fromListing: true,
      active: true,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
  });
}

/** Public card. The button uses the offer link only when that option is on. */
export function toPublicDeal(row: DealRow) {
  const website = httpUrl(row.listing.website);
  const offer = row.ctaEnabled ? httpUrl(row.ctaUrl) : "";
  const action = offer
    ? { label: row.ctaLabel.trim() || "Get this deal", url: offer, kind: "offer" as const }
    : website
      ? { label: "Visit website", url: website, kind: "website" as const }
      : null;
  return {
    id: row.id,
    note: row.note,
    action,
    listing: toCard(row.listing, { includeHidden: false }),
  };
}
