import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { slugify } from "@/lib/slug";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(300).optional(),
  body: z.string().max(100000).optional(),
  tags: z.string().trim().max(200).optional(),
  cover: z.string().trim().max(300).optional(),
  status: z.enum(["draft", "published"]).optional(),
  publishedAt: z.string().optional(),
});

function present(row: { publishedAt: Date | null; updatedAt: Date; [key: string]: unknown }) {
  return { ...row, publishedAt: row.publishedAt ? row.publishedAt.toISOString().slice(0, 16) : "", updatedAt: row.updatedAt.toISOString() };
}

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const existing = await db.post.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Post not found.");
  const input = schema.parse(await readJson(request));
  let slug = existing.slug;
  if (input.slug !== undefined || input.title) {
    slug = slugify(input.slug || input.title || existing.title);
    const clash = await db.post.findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
    if (clash) throw new HttpError(400, "That slug is already used.");
  }
  const status = input.status ?? existing.status;
  let publishedAt = existing.publishedAt;
  if (input.publishedAt) {
    publishedAt = new Date(input.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) throw new HttpError(400, "Publish date is not valid.");
  } else if (status === "published" && !publishedAt) publishedAt = new Date();
  else if (status === "draft" && input.status === "draft") publishedAt = null;
  const row = await db.post.update({
    where: { id },
    data: { title: input.title, slug, excerpt: input.excerpt, body: input.body, tags: input.tags, cover: input.cover, status, publishedAt },
  });
  revalidate("posts");
  return ok(present(row));
});

export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  await db.post.delete({ where: { id: (await params).id } });
  revalidate("posts");
  return ok({ ok: true });
});
