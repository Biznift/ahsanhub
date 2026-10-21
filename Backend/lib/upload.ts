import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";

export const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage"));
export const FILE_PREFIX = "/files/";

const MB = 1024 * 1024;

type Detected = { ext: string; mime: string; width?: number; height?: number; kind: "image" | "gif" | "video" | "pdf" };

const IMAGE_TYPES: Record<string, { ext: string; mime: string }> = {
  png: { ext: "png", mime: "image/png" },
  jpg: { ext: "jpg", mime: "image/jpeg" },
  webp: { ext: "webp", mime: "image/webp" },
  gif: { ext: "gif", mime: "image/gif" },
};

function detect(buffer: Buffer): Detected | null {
  if (buffer.length > 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") return { ext: "mp4", mime: "video/mp4", kind: "video" };
  if (buffer.length > 4 && buffer.readUInt32BE(0) === 0x1a45dfa3) return { ext: "webm", mime: "video/webm", kind: "video" };
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return { ext: "pdf", mime: "application/pdf", kind: "pdf" };
  try {
    const info = imageSize(buffer);
    const known = info.type ? IMAGE_TYPES[info.type] : undefined;
    if (!known || !info.width || !info.height) return null;
    return { ...known, width: info.width, height: info.height, kind: known.ext === "gif" ? "gif" : "image" };
  } catch {
    return null;
  }
}

export type UploadRule = {
  label: string;
  kinds: Detected["kind"][];
  maxBytes: number | Partial<Record<Detected["kind"], number>>;
  check?: (file: Detected) => string | null;
};

export const RULES = {
  logo: {
    label: "Logo",
    kinds: ["image"],
    maxBytes: 2 * MB,
    check: ({ width = 0, height = 0 }) =>
      Math.abs(width - height) > Math.max(width, height) * 0.02
        ? "must be square (for example 512 × 512)."
        : width < 128
          ? "must be at least 128 × 128."
          : null,
  },
  banner: {
    label: "Banner",
    kinds: ["image"],
    maxBytes: 5 * MB,
    check: ({ width = 0, height = 0 }) =>
      Math.abs(width / height - 16 / 9) > 0.03
        ? "must be 16:9 landscape (for example 1600 × 900)."
        : width < 1280
          ? "must be at least 1280 px wide."
          : null,
  },
  founder: {
    label: "Founder photo",
    kinds: ["image"],
    maxBytes: 2 * MB,
    check: ({ width = 0, height = 0 }) => (Math.min(width, height) < 128 ? "must be at least 128 px on each side." : null),
  },
  media: {
    label: "File",
    kinds: ["image", "gif", "pdf"],
    maxBytes: 8 * MB,
  },
} satisfies Record<string, UploadRule>;

export function adRule(width: number, height: number): UploadRule {
  return {
    label: "Ad creative",
    kinds: ["image", "gif", "video"],
    maxBytes: { image: 2 * MB, gif: 8 * MB, video: 12 * MB },
    check: (file) => {
      if (file.kind === "video") return null;
      const exact = file.width === width && file.height === height;
      const retina = file.width === width * 2 && file.height === height * 2;
      return exact || retina ? null : `must be exactly ${width} × ${height} (or ${width * 2} × ${height * 2}). This one is ${file.width} × ${file.height}.`;
    },
  };
}

export type Saved = { path: string; kind: Detected["kind"]; width?: number; height?: number };

export async function saveUpload(file: File, rule: UploadRule, folder: string): Promise<Saved> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const found = detect(buffer);
  if (!found || !rule.kinds.includes(found.kind)) {
    const allowed = rule.kinds.map((kind) => (kind === "image" ? "PNG, JPG or WebP" : kind.toUpperCase())).join(", ");
    throw new HttpError(400, `${rule.label} must be ${allowed}.`);
  }
  const max = typeof rule.maxBytes === "number" ? rule.maxBytes : (rule.maxBytes[found.kind] ?? 0);
  if (buffer.length > max) throw new HttpError(400, `${rule.label} must be under ${Math.round(max / MB)} MB.`);
  const problem = rule.check?.(found);
  if (problem) throw new HttpError(400, `${rule.label} ${problem}`);

  const dir = path.join(STORAGE_DIR, folder);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${found.ext}`;
  await writeFile(path.join(dir, name), buffer);
  const publicPath = `${FILE_PREFIX}${folder}/${name}`;
  await db.media.create({
    data: {
      path: publicPath,
      name: file.name || name,
      mime: found.mime,
      size: buffer.length,
      width: found.width,
      height: found.height,
    },
  });
  return { path: publicPath, kind: found.kind, width: found.width, height: found.height };
}

/** Removes a stored file and its library row. Unknown paths are ignored. */
export async function removeUpload(publicPath: string | null | undefined) {
  if (!publicPath?.startsWith(FILE_PREFIX)) return;
  const relative = publicPath.slice(FILE_PREFIX.length);
  const full = path.resolve(STORAGE_DIR, relative);
  if (!full.startsWith(STORAGE_DIR + path.sep)) return;
  await unlink(full).catch(() => undefined);
  await db.media.deleteMany({ where: { path: publicPath } });
}

export function fileField(form: FormData, key: string) {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}
