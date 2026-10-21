import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { normalizeUrl, revalidate } from "@/lib/directory";
import { removeUpload } from "@/lib/upload";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  url: z.string().trim().min(4).optional(),
  active: z.boolean().optional(),
});

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const input = schema.parse(await readJson(request));
  const row = await db.ad.update({
    where: { id: (await params).id },
    data: { ...input, url: input.url ? normalizeUrl(input.url) : undefined },
  });
  revalidate("ads");
  return ok(row);
});

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const row = await db.ad.delete({ where: { id: (await params).id } });
  await removeUpload(row.file);
  revalidate("ads");
  return ok({ ok: true });
});
