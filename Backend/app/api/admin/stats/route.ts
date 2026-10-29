import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";

export const GET = route(async () => {
  await requireAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [published, pending, rejected, pendingReviews, openReports, owners, votesThisWeek, newThisWeek, featuredLive, unreadMail, latest] = await Promise.all([
    db.listing.count({ where: { status: "published" } }),
    db.listing.count({ where: { status: "pending" } }),
    db.listing.count({ where: { status: "rejected" } }),
    db.review.count({ where: { status: "pending" } }),
    db.listingReport.count({ where: { status: "open" } }),
    db.user.count({ where: { role: "owner" } }),
    db.vote.count({ where: { createdAt: { gte: weekAgo } } }),
    db.listing.count({ where: { createdAt: { gte: weekAgo } } }),
    db.listing.count({ where: { status: "published", featured: true } }),
    db.supportThread.count({ where: { unread: true } }),
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
    openReports,
    owners,
    votesThisWeek,
    newThisWeek,
    featuredLive,
    unreadMail,
    latest: latest.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  });
});
