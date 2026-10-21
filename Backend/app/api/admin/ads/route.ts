import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { AD_PLACEMENTS, isPlacement, normalizeUrl, revalidate } from "@/lib/directory";
import { adRule, fileField, saveUpload } from "@/lib/upload";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.ad.findMany({ orderBy: { createdAt: "desc" } });
  return ok({
    placements: AD_PLACEMENTS,
    items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  });
});

const schema = z.object({
  placement: z.string(),
  title: z.string().trim().min(2).max(80),
  url: z.string().trim().min(4),
});

export const POST = route(async (request) => {
  await requireAdmin();
  const form = await request.formData();
  const input = schema.parse({ placement: form.get("placement"), title: form.get("title"), url: form.get("url") });
  if (!isPlacement(input.placement)) throw new HttpError(400, "Unknown placement.");
  const file = fileField(form, "file");
  if (!file) throw new HttpError(400, "Attach a banner, GIF, or video.");
  const size = AD_PLACEMENTS[input.placement];
  const saved = await saveUpload(file, adRule(size.width, size.height), "ads");
  const row = await db.ad.create({
    data: { placement: input.placement, title: input.title, url: normalizeUrl(input.url), kind: saved.kind as "image" | "gif" | "video", file: saved.path },
  });
  revalidate("ads");
  return ok(row, { status: 201 });
});
