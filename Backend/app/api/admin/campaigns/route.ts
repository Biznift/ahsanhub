import { db } from "@/lib/db";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { campaignSchema, presentCampaign } from "@/lib/campaigns";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return ok({ items: rows.map(presentCampaign) });
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = campaignSchema.parse(await readJson(request));
  const row = await db.campaign.create({ data: input });
  return ok(presentCampaign(row), { status: 201 });
});
