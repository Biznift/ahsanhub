import { z } from "zod";
import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";

export const GET = route(async (request) => {
  const kind = z.enum(["blog", "page"]).parse(new URL(request.url).searchParams.get("kind") ?? "blog");
  const rows = await db.post.findMany({
    where: { kind, status: "published" },
    orderBy: [{ publishedAt: "desc" }],
    select: { slug: true, title: true, excerpt: true, cover: true, tags: true, publishedAt: true },
  });
  return ok({ items: rows.map((row) => ({ ...row, publishedAt: row.publishedAt?.toISOString() ?? null })) });
});
