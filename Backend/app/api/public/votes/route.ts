import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { voterId } from "@/lib/voter";

/** Which of these listing ids the current visitor has upvoted, plus live counts. */
export const GET = route(async (request) => {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 100);
  if (ids.length === 0) return ok({ voted: [], counts: {} });
  const voter = await voterId(false);
  const [votes, counts] = await Promise.all([
    voter
      ? db.vote.findMany({
          where: { voterId: voter, listingId: { in: ids }, listing: { status: "published" } },
          select: { listingId: true },
        })
      : [],
    db.listing.findMany({ where: { id: { in: ids }, status: "published" }, select: { id: true, voteCount: true } }),
  ]);
  return ok(
    { voted: votes.map((vote) => vote.listingId), counts: Object.fromEntries(counts.map((row) => [row.id, row.voteCount])) },
    { headers: { "cache-control": "no-store" } },
  );
});
