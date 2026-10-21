import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { cardInclude, toCard } from "@/lib/directory";

export const GET = route(async () => {
  const user = await requireUser();
  const rows = await db.listing.findMany({ where: { ownerId: user.id }, include: cardInclude, orderBy: { createdAt: "desc" } });
  return ok({ items: rows.map((row) => ({ ...toCard(row), status: row.status })) });
});
