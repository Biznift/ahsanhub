import { ok, readJson, route } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { publicStorage, readStorage, saveStorage, storageInputSchema } from "@/lib/ops";
import { seal } from "@/lib/secrets";

export const GET = route(async () => {
  await requireAdmin();
  return ok(publicStorage(await readStorage()));
});

export const PUT = route(async (request) => {
  await requireAdmin();
  const input = storageInputSchema.parse(await readJson(request));
  const current = await readStorage();
  const apiKey = input.apiKey?.trim();
  const apiSecret = input.apiSecret?.trim();
  const apiKeySeal = apiKey ? seal(apiKey) : current.apiKeySeal;
  const apiSecretSeal = apiSecret ? seal(apiSecret) : current.apiSecretSeal;
  if (input.enabled && (!input.cloudName || !apiKeySeal || !apiSecretSeal)) {
    throw new HttpError(400, "Add the cloud name, API key, and API secret before turning Cloudinary on.");
  }
  return ok(
    publicStorage(
      await saveStorage({
        enabled: input.enabled,
        cloudName: input.cloudName,
        apiKeySeal,
        apiSecretSeal,
      }),
    ),
  );
});
