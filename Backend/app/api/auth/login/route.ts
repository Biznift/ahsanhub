import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, rateLimit, readJson, route } from "@/lib/http";
import { passwordMatches, publicUser, startSession } from "@/lib/auth";
import { phonesMatch } from "@/lib/phone";

const schema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().max(200).optional(),
    phone: z.string().trim().max(30).optional(),
  })
  .refine((value) => Boolean(value.password?.trim() || value.phone?.trim()), "Enter your password or phone number.");

export const POST = route(async (request) => {
  limitClient(request, "login", 20, 15 * 60 * 1000);
  const { email, password, phone } = schema.parse(await readJson(request));
  rateLimit(`auth-email:${email}`, 10, 15 * 60 * 1000);
  const user = await db.user.findUnique({ where: { email } });
  const passwordText = password?.trim() ?? "";
  const phoneText = phone?.trim() ?? "";
  const matches = passwordText
    ? await passwordMatches(passwordText, user?.passwordHash ?? null)
    : phonesMatch(user?.phone ?? "", phoneText);
  if (!passwordText) await passwordMatches("unused", null);
  if (!user || !matches) throw new HttpError(401, passwordText ? "Email or password is wrong." : "Email or phone number is wrong.");
  if (user.status !== "active") throw new HttpError(403, "This account is disabled.");
  await startSession(user);
  return ok({ user: publicUser(user) }, { headers: { "cache-control": "no-store" } });
});
