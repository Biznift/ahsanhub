import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { slugify } from "@/lib/slug";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  hidden: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const input = schema.parse(await readJson(request));
  const data: typeof input & { slug?: string } = { ...input };
  if (input.name) {
    data.slug = slugify(input.name);
    const clash = await db.category.findFirst({ where: { id: { not: id }, OR: [{ slug: data.slug }, { name: { equals: input.name, mode: "insensitive" } }] } });
    if (clash) throw new HttpError(400, "A category with that name already exists.");
  }
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
