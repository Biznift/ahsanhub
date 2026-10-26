import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { cardInclude, detailInclude, parseListingForm, prepareListing, revalidate, toCard, toEditable, writeRelations } from "@/lib/directory";
import { syncListingCoupon } from "@/lib/deals";
import { uniqueSlug } from "@/lib/slug";
import { recordActivity } from "@/lib/activity";
import { alert } from "@/lib/telegram";

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["pending", "published", "rejected"]).optional(),
});

export const GET = route(async (request) => {
  await requireAdmin();
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const where: Prisma.ListingWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { contactEmail: { contains: query.q, mode: "insensitive" } },
      { website: { contains: query.q, mode: "insensitive" } },
    ];
  }
  const rows = await db.listing.findMany({
    where,
    include: { ...cardInclude, owner: { select: { email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok({
    items: rows.map((row) => ({
      ...toCard(row),
      status: row.status,
      website: row.website,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone || row.owner?.phone || "",
      ownerEmail: row.owner?.email ?? null,
      rejectNote: row.rejectNote,
      rejectImage: row.rejectImage,
      socialPosted: row.socialPosted,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

/** An admin-created listing goes live immediately. Owners still submit through the public form. */
export const POST = route(async (request) => {
  await requireAdmin();
  const form = await request.formData();
  const input = parseListingForm(form);
  const contactEmail = z.string().trim().toLowerCase().email("Enter a contact email").parse(form.get("email"));
  const prepared = await prepareListing(form, input, null);
  const slug = await uniqueSlug(input.name, async (candidate) => (await db.listing.count({ where: { slug: candidate } })) > 0);
  const listing = await db.listing.create({
    data: { ...prepared.columns, slug, contactEmail, status: "published", publishedAt: new Date() },
  });
  await writeRelations(listing.id, prepared);
  await syncListingCoupon(listing.id, prepared.coupon);
  await recordActivity("listing", `${input.name} was just published`);
  alert("listing.published", `${input.name} was added by an admin and is now live.`);
  revalidate("listings", `listing:${slug}`, "categories", "ads", "coupon-codes");
  const row = await db.listing.findUniqueOrThrow({ where: { id: listing.id }, include: detailInclude });
  return ok({ ...toEditable(row), socialPosted: row.socialPosted }, { status: 201 });
});
