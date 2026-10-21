import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { RULES, fileField, saveUpload } from "@/lib/upload";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.media.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return ok({ items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) });
});

export const POST = route(async (request) => {
  await requireAdmin();
  const file = fileField(await request.formData(), "file");
  if (!file) throw new HttpError(400, "Attach a file.");
  const saved = await saveUpload(file, RULES.media, "library");
  return ok(saved, { status: 201 });
});
