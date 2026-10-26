import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, route } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { voterId } from "@/lib/voter";
import { isBot, recordListingEvent } from "@/lib/metrics";

const schema = z.object({
  kind: z.enum(["impression", "click", "coupon"]),
  listingId: z.string().regex(/^[a-z0-9]{8,40}$/i),
});

/** One impression, click, or coupon open per visitor per day. Owners are not counted. */
export const POST = route(async (request) => {
  if (isBot(request)) return ok({ counted: false });
  limitClient(request, "promo", 80, 60 * 1000);
  const input = schema.parse(await request.json().catch(() => ({})));
  const listing = await db.listing.findUnique({
    where: { id: input.listingId },
    select: { id: true, status: true, ownerId: true, featured: true, promoPin: { select: { id: true } } },
  });
  if (!listing || listing.status !== "published") throw new HttpError(404, "Listing not found.");
  if (!listing.featured && !listing.promoPin) throw new HttpError(400, "This product is not in the rotation.");
  const user = await currentUser();
  if (user && user.id === listing.ownerId) return ok({ counted: false });
  const visitor = await voterId(true);
  if (!visitor) throw new HttpError(500, "Could not start a visitor session.");
  const counted = await recordListingEvent(listing.id, visitor, input.kind);
  return ok({ counted }, { headers: { "cache-control": "no-store" } });
});
