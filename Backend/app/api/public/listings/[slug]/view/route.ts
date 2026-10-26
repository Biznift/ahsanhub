import { db } from "@/lib/db";
import { HttpError, limitClient, ok, route } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { voterId } from "@/lib/voter";
import { isBot, recordListingEvent } from "@/lib/metrics";

type Context = { params: Promise<{ slug: string }> };

const SLUG = /^[a-z0-9-]{1,80}$/;

function remember(existing: string | undefined, slugs: string[]) {
  const next: string[] = [];
  for (const slug of [...slugs, ...(existing ?? "").split(",")]) {
    const value = slug.trim().toLowerCase();
    if (!SLUG.test(value) || next.includes(value)) continue;
    next.push(value);
    if (next.length >= 8) break;
  }
  return next.join(",");
}

/** Counts one product-page view per visitor per day and remembers the categories they looked at. */
export const POST = route<Context>(async (request, { params }) => {
  const slug = (await params).slug;
  if (isBot(request)) return ok({ counted: false });
  limitClient(request, "view", 60, 60 * 1000);
  const listing = await db.listing.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      ownerId: true,
      categories: { select: { category: { select: { slug: true, hidden: true, status: true } } } },
    },
  });
  if (!listing || listing.status !== "published") throw new HttpError(404, "Listing not found.");

  const user = await currentUser();
  const skip = Boolean(user && user.id === listing.ownerId);
  let counted = false;
  if (!skip) {
    const visitor = await voterId(true);
    if (!visitor) throw new HttpError(500, "Could not start a visitor session.");
    counted = await recordListingEvent(listing.id, visitor, "view");
  }
  const slugs = listing.categories
    .filter((item) => !item.category.hidden && item.category.status === "approved")
    .map((item) => item.category.slug);
  const match = request.headers.get("cookie")?.match(/(?:^|;\s*)ah_interest=([^;]+)/)?.[1];
  let current = "";
  try {
    current = decodeURIComponent(match ?? "");
  } catch {
    current = "";
  }
  const interest = remember(current, slugs);
  const response = ok({ counted }, { headers: { "cache-control": "no-store" } });
  if (interest) {
    response.cookies.set("ah_interest", interest, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  return response;
});
