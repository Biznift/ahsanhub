import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, rateLimit, readJson, route } from "@/lib/http";
import { hashPassword, publicUser, startSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { recordActivity } from "@/lib/activity";
import { alert } from "@/lib/telegram";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().min(8).max(30),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

/** A public account. Name, email, phone, and password are all required. */
export const POST = route(async (request) => {
  limitClient(request, "register", 10, 15 * 60 * 1000);
  const input = schema.parse(await readJson(request));
  rateLimit(`auth-email:${input.email}`, 8, 15 * 60 * 1000);
  const phone = normalizePhone(input.phone);
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new HttpError(409, "This email already has an account. Sign in.");

  try {
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone,
        passwordHash: await hashPassword(input.password),
        role: "owner",
        emailVerified: true,
      },
    });
    await startSession(user);
    await recordActivity("signup", `${input.name.split(" ")[0]} just joined the directory`);
    alert("user.registered", `${user.name} created an account.`);
    return ok({ user: publicUser(user) }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "This email already has an account. Sign in.");
    }
    throw error;
  }
});
