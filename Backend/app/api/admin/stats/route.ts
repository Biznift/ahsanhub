import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";

export const GET = route(async () => {
  await requireAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [published, pending, rejected, pendingReviews, owners, votesThisWeek, newThisWeek, activeAds, latest] = await Promise.all([
    db.listing.count({ where: { status: "published" } }),
    db.listing.count({ where: { status: "pending" } }),
    db.listing.count({ where: { status: "rejected" } }),
    db.review.count({ where: { status: "pending" } }),
    db.user.count({ where: { role: "owner" } }),
    db.vote.count({ where: { createdAt: { gte: weekAgo } } }),
    db.listing.count({ where: { createdAt: { gte: weekAgo } } }),
    db.ad.count({ where: { active: true } }),
    db.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, slug: true, status: true, logo: true, createdAt: true, ownerId: true },
    }),
  ]);
  return ok({
    published,
    pending,
    rejected,
    pendingReviews,
    owners,
    votesThisWeek,
    newThisWeek,
    activeAds,
    latest: latest.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  });
});
