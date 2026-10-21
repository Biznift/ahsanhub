import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { createBackup } from "@/lib/backup";

function present(row: { id: string; name: string; size: number; automatic: boolean; createdAt: Date }) {
  return {
    id: row.id,
    name: row.name,
    size: row.size < 1024 ? `${row.size} B` : `${Math.max(1, Math.round(row.size / 1024))} KB`,
    automatic: row.automatic,
    createdAt: row.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
  };
}

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.backupFile.findMany({ orderBy: { createdAt: "desc" } });
  return ok({ items: rows.map(present) });
});

export const POST = route(async () => {
  await requireAdmin();
  return ok(present(await createBackup(false)), { status: 201 });
});
