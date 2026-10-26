import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { detailInclude, parseListingForm, prepareListing, revalidate, toEditable, writeRelations } from "@/lib/directory";
import { syncListingCoupon } from "@/lib/deals";

type Context = { params: Promise<{ id: string }> };

async function ownListing(id: string) {
  const user = await requireUser();
  const row = await db.listing.findFirst({ where: { id, ownerId: user.id }, include: detailInclude });
  if (!row) throw new HttpError(404, "Listing not found in your account.");
  return row;
}

export const GET = route<Context>(async (_request, { params }) => {
  return ok(toEditable(await ownListing((await params).id)));
});

/** Owners edit content only. Status, featured and sponsored stay with the admin. */
export const PATCH = route<Context>(async (request, { params }) => {
  const existing = await ownListing((await params).id);
  const form = await request.formData();
  const input = parseListingForm(form);
  const prepared = await prepareListing(form, input, existing);
  const returnedToReview = existing.status === "published";
  await db.listing.update({
    where: { id: existing.id },
    data: { ...prepared.columns, ...(returnedToReview ? { status: "pending" as const } : {}) },
  });
  await writeRelations(existing.id, prepared);
  await syncListingCoupon(existing.id, prepared.coupon);
  revalidate("listings", `listing:${existing.slug}`, "ads", "coupon-codes");
  const row = await db.listing.findUniqueOrThrow({ where: { id: existing.id }, include: detailInclude });
  return ok({ ...toEditable(row), returnedToReview });
});
