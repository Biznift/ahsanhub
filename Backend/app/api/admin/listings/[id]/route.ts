import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { detailInclude, parseListingForm, prepareListing, revalidate, toEditable, writeRelations } from "@/lib/directory";
import { removeUpload } from "@/lib/upload";
import { recordActivity } from "@/lib/activity";
import { alert } from "@/lib/telegram";

type Context = { params: Promise<{ id: string }> };

async function load(id: string) {
  const row = await db.listing.findUnique({ where: { id }, include: detailInclude });
  if (!row) throw new HttpError(404, "Listing not found.");
  return row;
}

export const GET = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  return ok(toEditable(await load((await params).id)));
});

const flagsSchema = z.object({
  status: z.enum(["pending", "published", "rejected"]).optional(),
  featured: z.boolean().optional(),
  sponsored: z.boolean().optional(),
  halalVerified: z.boolean().optional(),
});

/** Moderation flags. Publishing for the first time stamps publishedAt. */
export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const existing = await load((await params).id);
  const flags = flagsSchema.parse(await readJson(request));
  const publishedAt = flags.status === "published" && !existing.publishedAt ? new Date() : undefined;
  await db.listing.update({ where: { id: existing.id }, data: { ...flags, publishedAt } });
  if (flags.status === "published" && existing.status !== "published") {
    await recordActivity("listing", `${existing.name} was just published`);
    alert("listing.published", `${existing.name} is now live.`);
  }
  revalidate("listings", `listing:${existing.slug}`, "ads");
  return ok(toEditable(await load(existing.id)));
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
  revalidate("listings", `listing:${existing.slug}`);
  return ok(toEditable(await load(existing.id)));
});

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const existing = await load((await params).id);
  await db.listing.delete({ where: { id: existing.id } });
  await Promise.all([existing.logo, existing.banner, ...existing.founders.map((item) => item.photo)].map((item) => removeUpload(item)));
  revalidate("listings", `listing:${existing.slug}`, "categories");
  return ok({ ok: true });
});
