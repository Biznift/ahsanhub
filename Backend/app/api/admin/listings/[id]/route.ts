import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { detailInclude, parseListingForm, prepareListing, revalidate, toEditable, writeRelations } from "@/lib/directory";
import { syncListingCoupon } from "@/lib/deals";
import { fileField, removeUpload, RULES, saveUpload } from "@/lib/upload";
import { recordActivity } from "@/lib/activity";
import { alert } from "@/lib/telegram";
import { notifyListingRejected } from "@/lib/listing-reject";
import { EMPTY_WEEK, weekTotals } from "@/lib/metrics";

type Context = { params: Promise<{ id: string }> };

async function load(id: string) {
  const row = await db.listing.findUnique({ where: { id }, include: detailInclude });
  if (!row) throw new HttpError(404, "Listing not found.");
  return row;
}

export const GET = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  return ok(await presentWithStats(await load((await params).id)));
});

const flagsSchema = z.object({
  status: z.enum(["pending", "published", "rejected"]).optional(),
  featured: z.boolean().optional(),
  sponsored: z.boolean().optional(),
  halalVerified: z.boolean().optional(),
  socialPosted: z.boolean().optional(),
});

const rejectNoteSchema = z.string().trim().min(1, "Add a reason before rejecting.").max(4000);

function formFlags(form: FormData) {
  const data: Record<string, unknown> = {};
  const status = form.get("status");
  if (typeof status === "string" && status) data.status = status;
  for (const key of ["featured", "sponsored", "halalVerified", "socialPosted"] as const) {
    const value = form.get(key);
    if (value === "true") data[key] = true;
    if (value === "false") data[key] = false;
  }
  return flagsSchema.parse(data);
}

async function readPatch(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const note = form.get("rejectNote");
    return { flags: formFlags(form), rejectNote: typeof note === "string" ? note : undefined, image: fileField(form, "rejectImage") };
  }
  const body = await readJson(request);
  const note = z.object({ rejectNote: z.string().max(4000).optional() }).parse(body).rejectNote;
  return { flags: flagsSchema.parse(body), rejectNote: note, image: null as File | null };
}

function present(row: Awaited<ReturnType<typeof load>>) {
  return {
    ...toEditable(row),
    socialPosted: row.socialPosted,
    promoImpressions: row.promoImpressions,
    promoClicks: row.promoClicks,
    couponClicks: row.couponClicks,
  };
}

async function presentWithStats(row: Awaited<ReturnType<typeof load>>) {
  const weeks = await weekTotals([row.id]);
  return { ...present(row), week: weeks.get(row.id) ?? EMPTY_WEEK };
}

/** Moderation flags. Publishing for the first time stamps publishedAt. Rejecting stores a reason and optional image. */
export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const existing = await load((await params).id);
  const { flags, rejectNote, image } = await readPatch(request);
  const publishedAt = flags.status === "published" && !existing.publishedAt ? new Date() : undefined;
  const rejecting = flags.status === "rejected";
  const leavingRejection = Boolean(flags.status && flags.status !== "rejected" && (existing.rejectNote || existing.rejectImage));
  const note = rejecting ? rejectNoteSchema.parse(rejectNote ?? "") : undefined;

  let nextImage = existing.rejectImage;
  if (rejecting && image) {
    const saved = await saveUpload(image, RULES.rejection, "rejections");
    nextImage = saved.path;
  }

  await db.listing.update({
    where: { id: existing.id },
    data: {
      ...flags,
      publishedAt,
      ...(rejecting ? { rejectNote: note, rejectImage: nextImage } : {}),
      ...(leavingRejection ? { rejectNote: "", rejectImage: null } : {}),
    },
  });

  if (rejecting && image && existing.rejectImage && existing.rejectImage !== nextImage) {
    await removeUpload(existing.rejectImage).catch((error) => console.error("Rejection image cleanup failed", error));
  }
  if (leavingRejection && existing.rejectImage) {
    await removeUpload(existing.rejectImage).catch((error) => console.error("Rejection image cleanup failed", error));
  }

  if (flags.status === "published" && existing.status !== "published") {
    await recordActivity("listing", `${existing.name} was just published`);
    alert("listing.published", `${existing.name} is now live.`);
  }
  revalidate("listings", `listing:${existing.slug}`, "ads", "coupon-codes");

  const notice = rejecting ? await notifyListingRejected(existing.id) : undefined;
  return ok({ ...(await presentWithStats(await load(existing.id))), ...(notice ? { notice } : {}) });
});

/** Full content edit by the admin, used for listings submitted without an account. */
export const PUT = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const existing = await load((await params).id);
  const form = await request.formData();
  const input = parseListingForm(form);
  const prepared = await prepareListing(form, input, existing);
  const contactEmail = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  await db.listing.update({
    where: { id: existing.id },
    data: { ...prepared.columns, ...(contactEmail.success ? { contactEmail: contactEmail.data } : {}) },
  });
  await writeRelations(existing.id, prepared);
  await syncListingCoupon(existing.id, prepared.coupon);
  revalidate("listings", `listing:${existing.slug}`, "coupon-codes");
  return ok(await presentWithStats(await load(existing.id)));
});

/** Removes the listing and everything that belongs to it. File cleanup must not undo a successful delete. */
export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const existing = await load((await params).id);
  await db.$transaction([
    db.review.deleteMany({ where: { listingId: existing.id } }),
    db.vote.deleteMany({ where: { listingId: existing.id } }),
    db.founder.deleteMany({ where: { listingId: existing.id } }),
    db.listingCategory.deleteMany({ where: { listingId: existing.id } }),
    db.couponDeal.deleteMany({ where: { listingId: existing.id } }),
    db.listingEvent.deleteMany({ where: { listingId: existing.id } }),
    db.listingMetric.deleteMany({ where: { listingId: existing.id } }),
    db.promoPin.deleteMany({ where: { listingId: existing.id } }),
    db.listing.delete({ where: { id: existing.id } }),
  ]);
  await Promise.all(
    [existing.logo, existing.banner, existing.rejectImage, ...existing.founders.map((item) => item.photo)].map((item) =>
      removeUpload(item).catch((error) => console.error("Listing file cleanup failed", error)),
    ),
  );
  revalidate("listings", `listing:${existing.slug}`, "categories", "coupon-codes");
  return ok({ ok: true });
});
