import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireUser } from "@/lib/auth";

/** One code, and its instructions, after the visitor asks to view it. The public list never includes either. */
export const GET = route(async (request) => {
  await requireUser();
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) throw new HttpError(400, "Choose a coupon.");
  const row = await db.couponDeal.findFirst({
    where: { id, active: true, listing: { status: "published" } },
    select: { id: true, code: true, note: true },
  });
  if (!row) throw new HttpError(404, "That coupon is not available.");
  return ok(row, { headers: { "cache-control": "no-store" } });
});
