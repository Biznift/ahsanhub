import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

/** Sets the CRM label only. It does not change the account role. */
export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const input = z.object({ plan: z.string().trim().max(80) }).parse(await readJson(request));
  await db.user.update({ where: { id: (await params).id }, data: { plan: input.plan } });
  return ok({ ok: true });
});
