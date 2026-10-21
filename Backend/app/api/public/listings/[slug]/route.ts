import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { cardInclude, detailInclude, ratingsFor, toCard, toDetail } from "@/lib/directory";

type Context = { params: Promise<{ slug: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const { slug } = await params;
  const row = await db.listing.findFirst({ where: { slug, status: "published" }, include: detailInclude });
  if (!row) throw new HttpError(404, "Listing not found.");

  const categoryIds = row.categories.map((item) => item.categoryId);
  const related = await db.listing.findMany({
    where: { status: "published", id: { not: row.id }, categories: { some: { categoryId: { in: categoryIds } } } },
    include: cardInclude,
    orderBy: [{ voteCount: "desc" }, { publishedAt: "desc" }],
    take: 4,
  });
  const ratings = await ratingsFor([row.id]);
  return ok({
    ...toDetail(row, { includeHidden: false }),
    rating: ratings.get(row.id) ?? null,
    related: related.map((item) => toCard(item, { includeHidden: false })),
  });
});
