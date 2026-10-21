import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { slugify } from "@/lib/slug";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { listings: true } } },
  });
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      hidden: row.hidden,
      sortOrder: row.sortOrder,
      count: row._count.listings,
    })),
  });
});

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = schema.parse(await readJson(request));
  const slug = slugify(input.name);
  const clash = await db.category.findFirst({ where: { OR: [{ slug }, { name: { equals: input.name, mode: "insensitive" } }] } });
  if (clash) throw new HttpError(400, "A category with that name already exists.");
  const last = await db.category.aggregate({ _max: { sortOrder: true } });
  const row = await db.category.create({ data: { ...input, slug, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  revalidate("categories");
  return ok(row, { status: 201 });
});
