import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { PROMO_PLACEMENTS } from "@/lib/directory";
import { EMPTY_WEEK, weekTotals } from "@/lib/metrics";

export const GET = route(async () => {
  await requireAdmin();
  const [pins, rows] = await Promise.all([
    db.promoPin.findMany({
      orderBy: { createdAt: "desc" },
      include: { listing: { select: { id: true, name: true, slug: true, logo: true, status: true, featured: true } } },
    }),
    db.listing.findMany({
      where: { status: "published", OR: [{ featured: true }, { promoPin: { isNot: null } }] },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        featured: true,
        viewCount: true,
        promoImpressions: true,
        promoClicks: true,
        couponClicks: true,
        promoPin: { select: { id: true } },
      },
      orderBy: [{ promoImpressions: "asc" }, { name: "asc" }],
    }),
  ]);
  const weeks = await weekTotals(rows.map((row) => row.id));
  return ok({
    placements: PROMO_PLACEMENTS,
    pins: pins.map((pin) => ({
      id: pin.id,
      createdAt: pin.createdAt.toISOString(),
      listing: pin.listing,
    })),
    performance: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo: row.logo,
      featured: row.featured,
      pinned: Boolean(row.promoPin),
      viewCount: row.viewCount,
      promoImpressions: row.promoImpressions,
      promoClicks: row.promoClicks,
      couponClicks: row.couponClicks,
      week: weeks.get(row.id) ?? EMPTY_WEEK,
    })),
  });
});

const schema = z.object({ listingId: z.string().min(1).max(40) });

/** Adds a published product to the rotation. Featured products are already included. */
export const POST = route(async (request) => {
  await requireAdmin();
  const input = schema.parse(await readJson(request));
  const listing = await db.listing.findUnique({ where: { id: input.listingId }, select: { id: true, status: true, name: true } });
  if (!listing || listing.status !== "published") throw new HttpError(400, "Choose a published product.");
  const pin = await db.promoPin.upsert({
    where: { listingId: listing.id },
    create: { listingId: listing.id },
    update: {},
  });
  return ok({ id: pin.id, listingId: listing.id, name: listing.name }, { status: 201 });
});
