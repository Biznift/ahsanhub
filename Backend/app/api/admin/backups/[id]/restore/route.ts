import { z } from "zod";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { restoreBackup } from "@/lib/backup";
import { alert } from "@/lib/telegram";

type Context = { params: Promise<{ id: string }> };

export const POST = route<Context>(async (request, { params }) => {
  const admin = await requireAdmin();
  const input = z.object({ confirm: z.literal("RESTORE") }).parse(await readJson(request));
  if (input.confirm !== "RESTORE") throw new HttpError(400, "Type RESTORE to confirm.");
  await restoreBackup((await params).id, admin.id);
  alert("backup.restored", `${admin.email} restored a database backup.`);
  return ok({ ok: true });
});
