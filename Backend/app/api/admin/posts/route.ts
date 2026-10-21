import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { revalidate } from "@/lib/directory";
import { uniqueSlug } from "@/lib/slug";

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["draft", "published"]).optional(),
  kind: z.enum(["blog", "page"]).optional(),
});

function present(row: { id: string; kind: string; title: string; slug: string; excerpt: string; body: string; tags: string; cover: string; status: string; publishedAt: Date | null; updatedAt: Date }) {
  return {
    ...row,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString().slice(0, 16) : "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const GET = route(async (request) => {
  await requireAdmin();
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await db.post.findMany({
    where: {
      kind: query.kind,
      status: query.status,
      title: query.q ? { contains: query.q, mode: "insensitive" } : undefined,
    },
    orderBy: { updatedAt: "desc" },
  });
  return ok({ items: rows.map(present) });
});

const createSchema = z.object({
  kind: z.enum(["blog", "page"]).default("blog"),
  title: z.string().trim().min(2).max(140),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(300).default(""),
  body: z.string().max(100000).default(""),
  tags: z.string().trim().max(200).default(""),
  cover: z.string().trim().max(300).default(""),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.string().optional(),
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = createSchema.parse(await readJson(request));
  const slug = await uniqueSlug(input.slug || input.title, async (candidate) => (await db.post.count({ where: { slug: candidate } })) > 0);
  const publishedAt = input.status === "published" ? (input.publishedAt ? new Date(input.publishedAt) : new Date()) : null;
  if (publishedAt && Number.isNaN(publishedAt.getTime())) throw new HttpError(400, "Publish date is not valid.");
  const row = await db.post.create({
    data: { kind: input.kind, title: input.title, slug, excerpt: input.excerpt, body: input.body, tags: input.tags, cover: input.cover, status: input.status, publishedAt },
  });
  revalidate("posts");
  return ok(present(row), { status: 201 });
});
