import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { dealInclude, patchDealSchema, prepareDeal, toAdminDeal } from "@/lib/deals";

type Context = { params: Promise<{ id: string }> };

async function load(id: string) {
  const row = await db.couponDeal.findUnique({ where: { id }, include: dealInclude });
  if (!row) throw new HttpError(404, "Deal not found.");
  return row;
}

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const existing = await load((await params).id);
  const input = patchDealSchema.parse(await readJson(request));
  const data = await prepareDeal(input, existing);
  const row = await db.couponDeal.update({ where: { id: existing.id }, data, include: dealInclude });
  revalidate("coupon-codes");
  return ok(toAdminDeal(row));
});

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const existing = await load((await params).id);
  await db.couponDeal.delete({ where: { id: existing.id } });
  revalidate("coupon-codes");
  return ok({ ok: true });
});
