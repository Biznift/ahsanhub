import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { AD_PLACEMENTS, NATIVE_PLACEMENTS, cardInclude, isPlacement, toCard } from "@/lib/directory";

/**
 * Creatives for one placement plus sponsored free listings as the fallback.
 * The site picks one to show; an empty response means the slot is not rendered.
 */
export const GET = route(async (request) => {
  const placement = new URL(request.url).searchParams.get("placement") ?? "";
  const native = (NATIVE_PLACEMENTS as readonly string[]).includes(placement);
  if (!native && !isPlacement(placement)) throw new HttpError(400, "Unknown placement.");

  const [ads, sponsored] = await Promise.all([
    native
      ? []
      : db.ad.findMany({
          where: { placement, active: true },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, kind: true, file: true, url: true },
        }),
    db.listing.findMany({
      where: { status: "published", sponsored: true, pricing: { in: ["free", "freemium"] } },
      include: cardInclude,
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
  ]);
  return ok({
    placement,
    size: native ? null : AD_PLACEMENTS[placement as keyof typeof AD_PLACEMENTS],
    ads,
    sponsored: sponsored.map((row) => toCard(row, { includeHidden: false })),
  });
});
