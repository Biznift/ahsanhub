import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const id = (await params).id;
  const pin = await db.promoPin.findUnique({ where: { id } });
  if (!pin) throw new HttpError(404, "Pin not found.");
  await db.promoPin.delete({ where: { id } });
  return ok({ ok: true });
});
