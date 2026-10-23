import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, readJson, route } from "@/lib/http";
import { uniqueSlug } from "@/lib/slug";

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  slug: z.string().trim().max(80).optional(),
});

const select = { id: true, name: true, slug: true } as const;

/** Suggestions for the alternative-tool dropdown. `slug` returns one saved tool. */
export const GET = route(async (request) => {
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  if (query.slug) {
    const item = await db.alternativeTool.findUnique({ where: { slug: query.slug }, select });
    return ok({ item });
  }
  const items = await db.alternativeTool.findMany({
    where: query.q ? { name: { contains: query.q, mode: "insensitive" } } : {},
    select,
    orderBy: { name: "asc" },
    take: 8,
  });
  return ok({ items });
});

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60, "Keep the name under 60 characters"),
});

/** Saves a new alternative tool, or returns the existing one when the name already matches. */
export const POST = route(async (request) => {
  limitClient(request, "alternative", 40, 60 * 60 * 1000);
  const { name } = createSchema.parse(await readJson(request));
  const existing = await db.alternativeTool.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select,
  });
  if (existing) return ok(existing);
  const slug = await uniqueSlug(name, async (candidate) => (await db.alternativeTool.count({ where: { slug: candidate } })) > 0);
  try {
    const created = await db.alternativeTool.create({ data: { name, slug }, select });
    return ok(created, { status: 201 });
  } catch {
    const again = await db.alternativeTool.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select });
    if (again) return ok(again);
    throw new HttpError(400, "Could not save that alternative tool.");
  }
});
