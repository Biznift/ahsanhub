import { z } from "zod";
import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { REPORT_STATUSES } from "@/lib/reports";

const querySchema = z.object({ status: z.enum(REPORT_STATUSES).optional() });

export const GET = route(async (request) => {
  await requireAdmin();
  const { status } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await db.listingReport.findMany({
    where: status ? { status } : {},
    include: { listing: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const listingIds = [...new Set(rows.map((row) => row.listingId))];
  const openGroups = listingIds.length
    ? await db.listingReport.groupBy({
        by: ["listingId"],
        where: { status: "open", listingId: { in: listingIds } },
        _count: { _all: true },
      })
    : [];
  const openCount = new Map(openGroups.map((group) => [group.listingId, group._count._all]));
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      reason: row.reason,
      body: row.body,
      email: row.email,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      openCount: openCount.get(row.listingId) ?? 0,
      listing: row.listing,
    })),
  });
});
