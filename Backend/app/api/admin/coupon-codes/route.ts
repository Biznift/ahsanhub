import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { createDealSchema, dealInclude, prepareDeal, toAdminDeal } from "@/lib/deals";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.couponDeal.findMany({
    include: dealInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return ok({ items: rows.map(toAdminDeal) });
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = createDealSchema.parse(await readJson(request));
  const data = await prepareDeal(input);
  if (!data.listingId || !input.code) throw new HttpError(400, "Pick a product and enter a coupon code.");
  const row = await db.$transaction(async (tx) => {
    if (input.sortOrder === undefined) {
      await tx.couponDeal.updateMany({ data: { sortOrder: { increment: 1 } } });
    }
    return tx.couponDeal.create({
      data: {
        listingId: data.listingId!,
        code: input.code,
        note: input.note ?? "",
        ctaEnabled: data.ctaEnabled ?? false,
        ctaLabel: input.ctaLabel ?? "",
        ctaUrl: data.ctaUrl ?? "",
        active: input.active ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
      include: dealInclude,
    });
  });
  revalidate("coupon-codes");
  return ok(toAdminDeal(row), { status: 201 });
});
