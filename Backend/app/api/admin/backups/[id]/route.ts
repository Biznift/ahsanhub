import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { deleteBackup } from "@/lib/backup";

type Context = { params: Promise<{ id: string }> };

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  await deleteBackup((await params).id);
  return ok({ ok: true });
});
