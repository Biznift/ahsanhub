import { z } from "zod";
import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";

export const GET = route(async (request) => {
  await requireAdmin();
  const status = z.enum(["OPEN", "REPLIED", "CLOSED"]).optional().safeParse(new URL(request.url).searchParams.get("status") ?? undefined);
  const rows = await db.feedbackThread.findMany({
    where: status.success ? { status: status.data } : {},
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      type: row.kind,
      title: row.title,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      messages: row.messages.map((message) => ({
        id: message.id,
        author: message.author,
        role: message.role,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    })),
  });
});
