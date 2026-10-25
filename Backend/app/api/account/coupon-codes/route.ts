import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireUser } from "@/lib/auth";

/** Codes only. The public list never includes them. */
export const GET = route(async () => {
  await requireUser();
  const rows = await db.couponDeal.findMany({
    where: { active: true, listing: { status: "published" } },
    select: { id: true, code: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return ok({ items: rows }, { headers: { "cache-control": "no-store" } });
});
