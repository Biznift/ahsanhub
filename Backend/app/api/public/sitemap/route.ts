import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const [listings, categories, posts] = await Promise.all([
    db.listing.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" } }),
    db.category.findMany({ where: { hidden: false }, select: { slug: true } }),
    db.post.findMany({ where: { status: "published" }, select: { slug: true, kind: true, updatedAt: true } }),
  ]);
  return ok({
    listings: listings.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt.toISOString() })),
    categories: categories.map((row) => row.slug),
    posts: posts.map((row) => ({ slug: row.slug, kind: row.kind, updatedAt: row.updatedAt.toISOString() })),
  });
});
