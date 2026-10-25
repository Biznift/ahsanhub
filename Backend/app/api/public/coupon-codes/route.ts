import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { dealInclude, toPublicDeal } from "@/lib/deals";

/** Live coupon deals. Hidden deals and unpublished listings are left out. */
export const GET = route(async (request) => {
  const raw = Number(new URL(request.url).searchParams.get("limit") ?? "100");
  const limit = Number.isInteger(raw) ? Math.min(100, Math.max(1, raw)) : 100;
  const rows = await db.couponDeal.findMany({
    where: { active: true, listing: { status: "published" } },
    include: dealInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  return ok({ items: rows.map(toPublicDeal) });
});
