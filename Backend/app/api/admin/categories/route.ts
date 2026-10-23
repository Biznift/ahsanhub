import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { LISTING_KINDS } from "@/lib/kinds";
import { uniqueSlug } from "@/lib/slug";

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
      kind: row.kind,
      status: row.status,
      count: row._count.listings,
    })),
  });
});

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
  kind: z.enum(LISTING_KINDS).default("software"),
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = schema.parse(await readJson(request));
  const clash = await db.category.findFirst({ where: { kind: input.kind, name: { equals: input.name, mode: "insensitive" } } });
  if (clash) throw new HttpError(400, "A category with that name already exists for this type.");
  const slug = await uniqueSlug(input.name, async (candidate) => (await db.category.count({ where: { slug: candidate } })) > 0);
  const last = await db.category.aggregate({ where: { kind: input.kind }, _max: { sortOrder: true } });
  const row = await db.category.create({ data: { name: input.name, description: input.description, kind: input.kind, slug, status: "approved", sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  revalidate("categories");
  return ok(row, { status: 201 });
});
