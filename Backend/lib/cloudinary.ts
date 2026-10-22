import { createHash } from "node:crypto";
import { HttpError } from "@/lib/http";
import { readStorage } from "@/lib/ops";
import { openSeal } from "@/lib/secrets";

export type CloudinaryCreds = { cloudName: string; apiKey: string; apiSecret: string };

type UploadResult = {
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
};

function sign(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + apiSecret).digest("hex");
}

function authHeader(creds: CloudinaryCreds) {
  return `Basic ${Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64")}`;
}

function endpoint(cloudName: string, resourceType: string, method: "upload" | "destroy") {
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/${method}`;
}

async function readCloudinary(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const json = (await response.json().catch(() => null)) as { error?: { message?: string }; status?: string } | null;
  if (!response.ok) {
    throw new HttpError(400, json?.error?.message || "Cloudinary rejected that request. Check the cloud name, API key, and API secret.");
  }
  return json as Record<string, unknown>;
}

export async function cloudinaryCreds(): Promise<CloudinaryCreds | null> {
  const stored = await readStorage();
  const apiKey = openSeal(stored.apiKeySeal);
  const apiSecret = openSeal(stored.apiSecretSeal);
  if (!stored.cloudName || !apiKey || !apiSecret) return null;
  return { cloudName: stored.cloudName, apiKey, apiSecret };
}

export async function cloudinaryPing(creds: CloudinaryCreds) {
  const json = await readCloudinary(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/ping`, {
    headers: { authorization: authHeader(creds) },
    signal: AbortSignal.timeout(8000),
  });
  if (json.status !== "ok") throw new HttpError(400, "Cloudinary did not confirm the connection.");
}

export async function cloudinaryUpload(
  creds: CloudinaryCreds,
  buffer: Buffer,
  input: { folder: string; publicId: string; mime: string },
): Promise<UploadResult> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = `ahsanhub/${input.folder}`;
  const params = { folder, public_id: input.publicId, timestamp };
  const body = new FormData();
  body.set("file", `data:${input.mime};base64,${buffer.toString("base64")}`);
  body.set("api_key", creds.apiKey);
  body.set("timestamp", timestamp);
  body.set("folder", folder);
  body.set("public_id", input.publicId);
  body.set("signature", sign(params, creds.apiSecret));
  const json = await readCloudinary(endpoint(creds.cloudName, "auto", "upload"), {
    method: "POST",
    body,
    signal: AbortSignal.timeout(60000),
  });
  const url = typeof json.secure_url === "string" ? json.secure_url : "";
  const publicId = typeof json.public_id === "string" ? json.public_id : input.publicId;
  const resourceType = typeof json.resource_type === "string" ? json.resource_type : "image";
  if (!url) throw new HttpError(502, "Cloudinary accepted the file but did not return a URL.");
  return {
    url,
    publicId,
    resourceType,
    bytes: typeof json.bytes === "number" ? json.bytes : buffer.length,
    width: typeof json.width === "number" ? json.width : undefined,
    height: typeof json.height === "number" ? json.height : undefined,
  };
}

/** Best-effort delete. A missing asset must not block removing the library row. */
export async function cloudinaryDestroy(creds: CloudinaryCreds, publicUrl: string) {
  const parsed = parseCloudinaryUrl(publicUrl);
  if (!parsed) return;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { public_id: parsed.publicId, timestamp };
  const body = new FormData();
  body.set("api_key", creds.apiKey);
  body.set("public_id", parsed.publicId);
  body.set("timestamp", timestamp);
  body.set("signature", sign(params, creds.apiSecret));
  await readCloudinary(endpoint(creds.cloudName, parsed.resourceType, "destroy"), {
    method: "POST",
    body,
    signal: AbortSignal.timeout(8000),
  }).catch(() => undefined);
}

export function isCloudinaryUrl(value: string) {
  return /^https:\/\/res\.cloudinary\.com\//.test(value);
}

export function parseCloudinaryUrl(url: string) {
  const match = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/.exec(url);
  if (!match) return null;
  const resourceType = match[1];
  let publicId = match[2];
  if (resourceType !== "raw") publicId = publicId.replace(/\.[^./]+$/, "");
  return { resourceType, publicId };
}
