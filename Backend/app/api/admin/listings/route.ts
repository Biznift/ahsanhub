import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { cardInclude, toCard } from "@/lib/directory";

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["pending", "published", "rejected"]).optional(),
});

export const GET = route(async (request) => {
  await requireAdmin();
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const where: Prisma.ListingWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { contactEmail: { contains: query.q, mode: "insensitive" } },
      { website: { contains: query.q, mode: "insensitive" } },
    ];
  }
  const rows = await db.listing.findMany({
    where,
    include: { ...cardInclude, owner: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok({
    items: rows.map((row) => ({
      ...toCard(row),
      status: row.status,
      website: row.website,
      contactEmail: row.contactEmail,
      ownerEmail: row.owner?.email ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});
