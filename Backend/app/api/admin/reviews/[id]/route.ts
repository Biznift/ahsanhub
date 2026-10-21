import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({ status: z.enum(["pending", "approved", "hidden"]) });

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const { status } = schema.parse(await readJson(request));
  const row = await db.review.update({ where: { id: (await params).id }, data: { status }, include: { listing: { select: { slug: true } } } });
  revalidate(`listing:${row.listing.slug}`, "listings");
  return ok(row);
});

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const row = await db.review.delete({ where: { id: (await params).id }, include: { listing: { select: { slug: true } } } });
  revalidate(`listing:${row.listing.slug}`, "listings");
  return ok({ ok: true });
});
