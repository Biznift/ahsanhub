import { z } from "zod";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { generalSchema, readGeneral, saveGeneral, saveHiddenSlugs } from "@/lib/ops";

export const GET = route(async () => {
  await requireAdmin();
  return ok(await readGeneral());
});

export const PUT = route(async (request) => {
  await requireAdmin();
  const saved = await saveGeneral(generalSchema.parse(await readJson(request)));
  revalidate("site");
  return ok(saved);
});

export const PATCH = route(async (request) => {
  await requireAdmin();
  const input = z.object({ hiddenSlugs: z.array(z.string()) }).parse(await readJson(request));
  return ok({ hiddenSlugs: await saveHiddenSlugs(input.hiddenSlugs) });
});
