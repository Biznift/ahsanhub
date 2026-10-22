import { z } from "zod";
import { ok, readJson, route } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { cloudinaryPing } from "@/lib/cloudinary";
import { readStorage } from "@/lib/ops";
import { openSeal } from "@/lib/secrets";

export const POST = route(async (request) => {
  await requireAdmin();
  const input = z
    .object({
      cloudName: z.string().trim().max(80).optional(),
      apiKey: z.string().max(80).optional(),
      apiSecret: z.string().max(80).optional(),
    })
    .parse(await readJson(request));
  const stored = await readStorage();
  const cloudName = input.cloudName || stored.cloudName;
  const apiKey = input.apiKey?.trim() || openSeal(stored.apiKeySeal);
  const apiSecret = input.apiSecret?.trim() || openSeal(stored.apiSecretSeal);
  if (!cloudName || !apiKey || !apiSecret) throw new HttpError(400, "Add the cloud name, API key, and API secret first.");
  await cloudinaryPing({ cloudName, apiKey, apiSecret });
  return ok({ ok: true, cloudName });
});
