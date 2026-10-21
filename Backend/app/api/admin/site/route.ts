import { db } from "@/lib/db";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { normalizeSocials } from "@/lib/directory";
import { readSite, siteSchema } from "@/lib/site";

export const GET = route(async () => {
  await requireAdmin();
  return ok(await readSite());
});

export const PUT = route(async (request) => {
  await requireAdmin();
  const parsed = siteSchema.parse(await readJson(request));
  const value = { ...parsed, socials: normalizeSocials(parsed.socials) };
  await db.setting.upsert({ where: { key: "site" }, create: { key: "site", value }, update: { value } });
  revalidate("site");
  return ok(value);
});
