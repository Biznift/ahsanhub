import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { LISTING_KINDS } from "@/lib/kinds";
import { uniqueSlug } from "@/lib/slug";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  hidden: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  kind: z.enum(LISTING_KINDS).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const input = schema.parse(await readJson(request));
  const current = await db.category.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, "Category not found.");
  const data: typeof input & { slug?: string } = { ...input };
  const kind = input.kind ?? current.kind;
  if (input.name && input.name !== current.name) {
    data.slug = await uniqueSlug(input.name, async (candidate) => (await db.category.count({ where: { slug: candidate, id: { not: id } } })) > 0);
    const clash = await db.category.findFirst({
      where: { id: { not: id }, kind, name: { equals: input.name, mode: "insensitive" } },
    });
    if (clash) throw new HttpError(400, "A category with that name already exists for this type.");
  }
  if (input.kind && input.kind !== current.kind) {
    const clash = await db.category.findFirst({
      where: { id: { not: id }, kind: input.kind, name: { equals: input.name ?? current.name, mode: "insensitive" } },
    });
    if (clash) throw new HttpError(400, "A category with that name already exists for this type.");
  }
  if (input.status === "approved" && input.hidden === undefined) data.hidden = false;
  const row = await db.category.update({ where: { id }, data });
  revalidate("categories", "listings");
  return ok(row);
});

/** Deleting removes the tag from listings; the listings themselves stay. */
export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  await db.category.delete({ where: { id: (await params).id } });
  revalidate("categories", "listings");
  return ok({ ok: true });
});
