import { z } from "zod";
import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";

const querySchema = z.object({ status: z.enum(["pending", "approved", "hidden"]).optional() });

export const GET = route(async (request) => {
  await requireAdmin();
  const { status } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await db.review.findMany({
    where: status ? { status } : {},
    include: { listing: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return ok({ items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) });
});
