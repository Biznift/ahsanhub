import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { hashPassword, requireAdmin } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  role: z.enum(["admin", "owner"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200).optional(),
});

export const PATCH = route<Context>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = schema.parse(await readJson(request));
  if (id === admin.id && (input.role === "owner" || input.status === "disabled")) {
    throw new HttpError(400, "You cannot remove your own admin access.");
  }
  await db.user.update({
    where: { id },
    data: {
      role: input.role,
      status: input.status,
      passwordHash: input.password ? await hashPassword(input.password) : undefined,
    },
  });
  return ok({ ok: true });
});

/** Listings owned by the account stay; they lose their owner and become admin-edited. */
export const DELETE = route<Context>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  if (id === admin.id) throw new HttpError(400, "You cannot delete your own account.");
  await db.user.delete({ where: { id } });
  return ok({ ok: true });
});
