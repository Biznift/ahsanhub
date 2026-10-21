import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, readJson, route } from "@/lib/http";

export const POST = route(async (request) => {
  limitClient(request, "verify", 10, 15 * 60 * 1000);
  const input = z.object({ token: z.string().min(20).max(200) }).parse(await readJson(request));
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const row = await db.loginToken.findUnique({ where: { tokenHash } });
  if (!row || row.expiresAt.getTime() < Date.now()) throw new HttpError(400, "This confirmation link is invalid or expired.");
  await db.user.update({ where: { id: row.userId }, data: { emailVerified: true } });
  await db.loginToken.delete({ where: { id: row.id } });
  return ok({ ok: true });
});
