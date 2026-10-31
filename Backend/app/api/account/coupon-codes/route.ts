import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const headers = { "cache-control": "no-store" };

/** Code and instructions for a signed-in visitor. The public list never includes either. */
export const GET = route(async (request) => {
  await requireUser();
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (id) {
    const row = await db.couponDeal.findFirst({
      where: { id, active: true, listing: { status: "published" } },
      select: { id: true, code: true, note: true },
    });
    if (!row) throw new HttpError(404, "That coupon is not available.");
    return ok(row, { headers });
  }
  const rows = await db.couponDeal.findMany({
    where: { active: true, listing: { status: "published" } },
    select: { id: true, code: true, note: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return ok({ items: rows }, { headers });
});
