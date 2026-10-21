import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { campaignSchema, presentCampaign } from "@/lib/campaigns";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const existing = await db.campaign.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Campaign not found.");
  if (existing.status === "sent") throw new HttpError(400, "A sent campaign cannot be edited.");
  const input = campaignSchema.parse(await readJson(request));
  return ok(presentCampaign(await db.campaign.update({ where: { id }, data: input })));
});

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  await db.campaign.delete({ where: { id: (await params).id } });
  return ok({ ok: true });
});
