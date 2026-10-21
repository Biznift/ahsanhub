import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { STORAGE_DIR } from "@/lib/upload";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

type Context = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Context) {
  const parts = (await params).path;
  if (parts.some((part) => part === ".." || part === "." || part.includes("\0") || part.includes("/") || part.includes("\\"))) {
    return new Response("Not found", { status: 404 });
  }
  const full = path.resolve(STORAGE_DIR, ...parts);
  const type = TYPES[path.extname(full).toLowerCase()];
  const root = path.resolve(STORAGE_DIR);
  if (!full.startsWith(root + path.sep) || !type) return new Response("Not found", { status: 404 });
  try {
    const info = await stat(full);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const body = await readFile(full);
    return new Response(body, {
      headers: {
        "content-type": type,
        "content-length": String(info.size),
        "x-content-type-options": "nosniff",
        "content-disposition": type === "application/pdf" ? "attachment" : "inline",
        // Uploads get a fresh random name, so a path never changes content.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
