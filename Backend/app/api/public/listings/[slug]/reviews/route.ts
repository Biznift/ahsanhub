import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, readJson, route } from "@/lib/http";
import { alert } from "@/lib/telegram";

type Context = { params: Promise<{ slug: string }> };

async function publishedId(slug: string) {
  const listing = await db.listing.findFirst({ where: { slug, status: "published" }, select: { id: true } });
  if (!listing) throw new HttpError(404, "Listing not found.");
  return listing.id;
}

export const GET = route<Context>(async (_request, { params }) => {
  const listingId = await publishedId((await params).slug);
  const rows = await db.review.findMany({
    where: { listingId, status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, rating: true, body: true, createdAt: true },
  });
  return ok({ items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) });
});

const reviewSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(20, "Write at least 20 characters").max(2000),
});

/** Anyone can review. Reviews stay hidden until an admin approves them. */
export const POST = route<Context>(async (request, { params }) => {
  limitClient(request, "review", 5, 60 * 60 * 1000);
  const listingId = await publishedId((await params).slug);
  const input = reviewSchema.parse(await readJson(request));
  await db.review.create({ data: { ...input, listingId } });
  alert("review.created", `New review on ${(await params).slug} is waiting for approval.`);
  return ok({ status: "pending" }, { status: 201 });
});
