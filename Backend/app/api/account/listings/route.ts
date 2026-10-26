import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { cardInclude, toCard } from "@/lib/directory";
import { EMPTY_WEEK, weekTotals } from "@/lib/metrics";

export const GET = route(async () => {
  const user = await requireUser();
  const rows = await db.listing.findMany({ where: { ownerId: user.id }, include: cardInclude, orderBy: { createdAt: "desc" } });
  const weeks = await weekTotals(rows.map((row) => row.id));
  return ok({
    items: rows.map((row) => ({
      ...toCard(row),
      status: row.status,
      rejectNote: row.status === "rejected" ? row.rejectNote : "",
      rejectImage: row.status === "rejected" ? row.rejectImage : null,
      promoImpressions: row.promoImpressions,
      promoClicks: row.promoClicks,
      couponClicks: row.couponClicks,
      week: weeks.get(row.id) ?? EMPTY_WEEK,
    })),
  });
});
