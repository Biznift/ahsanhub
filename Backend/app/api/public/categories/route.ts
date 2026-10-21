import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";

export const GET = route(async () => {
  const rows = await db.category.findMany({
    where: { hidden: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { listings: { where: { listing: { status: "published" } } } } } },
  });
  return ok({
    items: rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug, description: row.description, count: row._count.listings })),
  });
});
