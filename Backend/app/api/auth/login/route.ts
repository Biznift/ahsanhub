import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, rateLimit, readJson, route } from "@/lib/http";
import { passwordMatches, publicUser, startSession } from "@/lib/auth";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const POST = route(async (request) => {
  limitClient(request, "login", 20, 15 * 60 * 1000);
  const { email, password } = schema.parse(await readJson(request));
  rateLimit(`auth-email:${email}`, 10, 15 * 60 * 1000);
  const user = await db.user.findUnique({ where: { email } });
  const matches = await passwordMatches(password, user?.passwordHash ?? null);
  if (!user || !matches) throw new HttpError(401, "Email or password is wrong.");
  if (user.status !== "active") throw new HttpError(403, "This account is disabled.");
  await startSession(user);
  return ok({ user: publicUser(user) }, { headers: { "cache-control": "no-store" } });
});
