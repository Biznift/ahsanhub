import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, route } from "@/lib/http";
import { voterId } from "@/lib/voter";

type Context = { params: Promise<{ slug: string }> };

/** Toggles the visitor's upvote. No account needed. */
export const POST = route<Context>(async (request, { params }) => {
  limitClient(request, "vote", 30, 10 * 60 * 1000);
  const { slug } = await params;
  const listing = await db.listing.findFirst({ where: { slug, status: "published" }, select: { id: true } });
  if (!listing) throw new HttpError(404, "Listing not found.");
  const voter = (await voterId(true))!;

  let voted: boolean;
  try {
    await db.$transaction([
      db.vote.create({ data: { listingId: listing.id, voterId: voter } }),
      db.listing.update({ where: { id: listing.id }, data: { voteCount: { increment: 1 } } }),
    ]);
    voted = true;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    await db.$transaction([
      db.vote.delete({ where: { listingId_voterId: { listingId: listing.id, voterId: voter } } }),
      db.listing.updateMany({ where: { id: listing.id, voteCount: { gt: 0 } }, data: { voteCount: { decrement: 1 } } }),
    ]);
    voted = false;
  }
  const { voteCount } = await db.listing.findUniqueOrThrow({ where: { id: listing.id }, select: { voteCount: true } });
  return ok({ voted, voteCount });
});
