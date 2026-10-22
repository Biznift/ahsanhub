import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { cloudinaryCreds, cloudinaryDestroy, cloudinaryUpload, isCloudinaryUrl } from "@/lib/cloudinary";
import { readStorage } from "@/lib/ops";

export const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage"));
export const FILE_PREFIX = "/files/";

const MB = 1024 * 1024;

type Kind = "image" | "gif" | "video" | "audio" | "pdf" | "raw";
type Detected = { ext: string; mime: string; width?: number; height?: number; kind: Kind };

const IMAGE_TYPES: Record<string, { ext: string; mime: string }> = {
  png: { ext: "png", mime: "image/png" },
  jpg: { ext: "jpg", mime: "image/jpeg" },
  jpeg: { ext: "jpg", mime: "image/jpeg" },
  webp: { ext: "webp", mime: "image/webp" },
  gif: { ext: "gif", mime: "image/gif" },
  bmp: { ext: "bmp", mime: "image/bmp" },
  tiff: { ext: "tiff", mime: "image/tiff" },
  tif: { ext: "tiff", mime: "image/tiff" },
  avif: { ext: "avif", mime: "image/avif" },
  svg: { ext: "svg", mime: "image/svg+xml" },
  ico: { ext: "ico", mime: "image/x-icon" },
  heic: { ext: "heic", mime: "image/heic" },
  heif: { ext: "heif", mime: "image/heif" },
};

/** Cloudinary-supported files that we cannot always identify from magic bytes. */
const NAMED_TYPES: Record<string, Detected> = {
  ...Object.fromEntries(Object.entries(IMAGE_TYPES).map(([ext, value]) => [ext, { ...value, kind: (ext === "gif" ? "gif" : "image") as Kind }])),
  mp4: { ext: "mp4", mime: "video/mp4", kind: "video" },
  webm: { ext: "webm", mime: "video/webm", kind: "video" },
  mov: { ext: "mov", mime: "video/quicktime", kind: "video" },
  m4v: { ext: "m4v", mime: "video/x-m4v", kind: "video" },
  ogv: { ext: "ogv", mime: "video/ogg", kind: "video" },
  mp3: { ext: "mp3", mime: "audio/mpeg", kind: "audio" },
  wav: { ext: "wav", mime: "audio/wav", kind: "audio" },
  ogg: { ext: "ogg", mime: "audio/ogg", kind: "audio" },
  aac: { ext: "aac", mime: "audio/aac", kind: "audio" },
  m4a: { ext: "m4a", mime: "audio/mp4", kind: "audio" },
  flac: { ext: "flac", mime: "audio/flac", kind: "audio" },
  pdf: { ext: "pdf", mime: "application/pdf", kind: "pdf" },
  zip: { ext: "zip", mime: "application/zip", kind: "raw" },
  "7z": { ext: "7z", mime: "application/x-7z-compressed", kind: "raw" },
  gz: { ext: "gz", mime: "application/gzip", kind: "raw" },
  tar: { ext: "tar", mime: "application/x-tar", kind: "raw" },
  csv: { ext: "csv", mime: "text/csv", kind: "raw" },
  txt: { ext: "txt", mime: "text/plain", kind: "raw" },
  rtf: { ext: "rtf", mime: "application/rtf", kind: "raw" },
  doc: { ext: "doc", mime: "application/msword", kind: "raw" },
  docx: { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "raw" },
  xls: { ext: "xls", mime: "application/vnd.ms-excel", kind: "raw" },
  xlsx: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "raw" },
  ppt: { ext: "ppt", mime: "application/vnd.ms-powerpoint", kind: "raw" },
  pptx: { ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "raw" },
  odt: { ext: "odt", mime: "application/vnd.oasis.opendocument.text", kind: "raw" },
  json: { ext: "json", mime: "application/json", kind: "raw" },
};

function ascii(buffer: Buffer, start: number, length: number) {
  return buffer.subarray(start, start + length).toString("ascii");
}

function detect(buffer: Buffer, filename: string): Detected | null {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return NAMED_TYPES.pdf;
  if (buffer.length > 4 && buffer.readUInt32BE(0) === 0x1a45dfa3) return NAMED_TYPES.webm;
  if (buffer.length > 12 && ascii(buffer, 4, 4) === "ftyp") {
    const brand = ascii(buffer, 8, 4).replace(/\0/g, "").toLowerCase();
    if (brand.startsWith("avif") || brand === "avis" || brand === "avio") return { ...IMAGE_TYPES.avif, kind: "image" };
    if (["heic", "heif", "mif1", "msf1"].includes(brand)) return { ...IMAGE_TYPES.heic, kind: "image" };
    if (brand.startsWith("qt") || brand === "m4v") return NAMED_TYPES.mov;
    if (brand === "m4a" || brand === "mp4a") return NAMED_TYPES.m4a;
    return NAMED_TYPES.mp4;
  }
  if (buffer.length > 12 && ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WAVE") return NAMED_TYPES.wav;
  if (ascii(buffer, 0, 3) === "ID3" || (buffer.length > 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return NAMED_TYPES.mp3;
  if (ascii(buffer, 0, 4) === "OggS") return NAMED_TYPES.ogg;
  if (ascii(buffer, 0, 4) === "fLaC") return NAMED_TYPES.flac;
  if (buffer.length > 4 && buffer[0] === 0x37 && buffer[1] === 0x7a && buffer[2] === 0xbc && buffer[3] === 0xaf) return NAMED_TYPES["7z"];
  if (ascii(buffer, 0, 2) === "PK") {
    const ext = path.extname(filename).slice(1).toLowerCase();
    return NAMED_TYPES[ext] && NAMED_TYPES[ext].kind === "raw" ? NAMED_TYPES[ext] : NAMED_TYPES.zip;
  }
  const head = buffer.subarray(0, 2048).toString("utf8").replace(/^\uFEFF/, "").trim();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && /<svg[\s>]/i.test(head))) {
    return { ...IMAGE_TYPES.svg, kind: "image" };
  }
  try {
    const info = imageSize(buffer);
    const known = info.type ? IMAGE_TYPES[info.type] : undefined;
    if (known && info.width && info.height) {
      return { ...known, width: info.width, height: info.height, kind: known.ext === "gif" ? "gif" : "image" };
    }
  } catch {
    // Fall through to the filename map when Cloudinary is on.
  }
  return null;
}

function fromName(filename: string): Detected | null {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return NAMED_TYPES[ext] ?? null;
}

function allowedLabel(kinds: Kind[]) {
  if (kinds.includes("raw")) return "an image, video, audio, PDF, or another file Cloudinary supports";
  return kinds.map((kind) => (kind === "image" ? "PNG, JPG or WebP" : kind.toUpperCase())).join(", ");
}

export type UploadRule = {
  label: string;
  kinds: Kind[];
  maxBytes: number | Partial<Record<Kind, number>>;
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
    kinds: ["image", "gif", "video", "audio", "pdf", "raw"],
    maxBytes: { image: 10 * MB, gif: 10 * MB, video: 40 * MB, audio: 15 * MB, pdf: 10 * MB, raw: 10 * MB },
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

export type Saved = { path: string; kind: Kind; width?: number; height?: number };

export async function saveUpload(file: File, rule: UploadRule, folder: string): Promise<Saved> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = await readStorage();
  const found = detect(buffer, file.name) ?? (storage.enabled ? fromName(file.name) : null);
  if (!found || !rule.kinds.includes(found.kind)) {
    throw new HttpError(400, `${rule.label} must be ${allowedLabel(rule.kinds)}.`);
  }
  if (!storage.enabled && (found.kind === "raw" || found.kind === "audio")) {
    throw new HttpError(400, "Connect Cloudinary to upload audio, ZIP, or documents.");
  }
  const max = typeof rule.maxBytes === "number" ? rule.maxBytes : (rule.maxBytes[found.kind] ?? 0);
  if (buffer.length > max) throw new HttpError(400, `${rule.label} must be under ${Math.round(max / MB)} MB.`);
  const problem = rule.check?.(found);
  if (problem) throw new HttpError(400, `${rule.label} ${problem}`);

  const id = randomUUID();
  let publicPath: string;
  let width = found.width;
  let height = found.height;
  let size = buffer.length;

  if (storage.enabled) {
    const creds = await cloudinaryCreds();
    if (!creds) throw new HttpError(400, "Connect Cloudinary before uploading. Add the cloud name, API key, and API secret on Media.");
    const uploaded = await cloudinaryUpload(creds, buffer, {
      folder,
      publicId: found.kind === "raw" ? `${id}.${found.ext}` : id,
      mime: found.mime,
    });
    publicPath = uploaded.url;
    width = uploaded.width ?? width;
    height = uploaded.height ?? height;
    size = uploaded.bytes;
  } else {
    const dir = path.join(STORAGE_DIR, folder);
    await mkdir(dir, { recursive: true });
    const name = `${id}.${found.ext}`;
    await writeFile(path.join(dir, name), buffer);
    publicPath = `${FILE_PREFIX}${folder}/${name}`;
  }

  await db.media.create({
    data: {
      path: publicPath,
      name: file.name || `${id}.${found.ext}`,
      mime: found.mime,
      size,
      width: width ?? null,
      height: height ?? null,
    },
  });
  return { path: publicPath, kind: found.kind, width, height };
}

/** Removes a stored file and its library row. Unknown paths are ignored. */
export async function removeUpload(publicPath: string | null | undefined) {
  if (!publicPath) return;
  if (isCloudinaryUrl(publicPath)) {
    const creds = await cloudinaryCreds();
    if (creds) await cloudinaryDestroy(creds, publicPath);
    await db.media.deleteMany({ where: { path: publicPath } });
    return;
  }
  if (!publicPath.startsWith(FILE_PREFIX)) return;
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
