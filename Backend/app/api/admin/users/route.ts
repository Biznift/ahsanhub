import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { hashPassword, requireAdmin } from "@/lib/auth";

export const GET = route(async (request) => {
  await requireAdmin();
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const rows = await db.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { listings: true } } },
    take: 300,
  });
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      listings: row._count.listings,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "owner"]),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = schema.parse(await readJson(request));
  if (await db.user.findUnique({ where: { email: input.email } })) throw new HttpError(400, "That email already has an account.");
  const row = await db.user.create({
    data: { name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) },
  });
  return ok({ id: row.id }, { status: 201 });
});
