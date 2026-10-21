import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { markdownToHtml } from "@/lib/markdown";

type Context = { params: Promise<{ slug: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const row = await db.post.findFirst({ where: { slug: (await params).slug, status: "published" } });
  if (!row) throw new HttpError(404, "Not found.");
  return ok({
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover: row.cover,
    tags: row.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    html: markdownToHtml(row.body),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  });
});
