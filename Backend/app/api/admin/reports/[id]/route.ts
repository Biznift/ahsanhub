import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { REPORT_STATUSES } from "@/lib/reports";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({ status: z.enum(REPORT_STATUSES) });

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const { status } = schema.parse(await readJson(request));
  const existing = await db.listingReport.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Report not found.");
  const row = await db.listingReport.update({ where: { id }, data: { status } });
  return ok({ id: row.id, status: row.status });
});

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const existing = await db.listingReport.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Report not found.");
  await db.listingReport.delete({ where: { id } });
  return ok({ ok: true });
});
