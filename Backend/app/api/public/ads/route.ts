import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { PROMO_PLACEMENTS, isPlacement } from "@/lib/directory";
import { pickPromos } from "@/lib/promos";

const querySchema = z.object({
  placement: z.string(),
  category: z.string().max(400).optional(),
  exclude: z.string().max(400).optional(),
  recent: z.string().max(400).optional(),
  limit: z.coerce.number().int().min(1).max(8).optional(),
});

function slugs(value: string | undefined) {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const slug = part.trim().toLowerCase();
    if (!/^[a-z0-9-]{1,80}$/.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    if (seen.size >= 8) break;
  }
  return [...seen];
}

function ids(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^[a-z0-9]{8,40}$/i.test(part))
    .slice(0, 24);
}

/** Featured and pinned products for one placement. Not cached: each response is a fresh fair draw. */
export const GET = route(async (request) => {
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  if (!isPlacement(query.placement)) throw new HttpError(400, "Unknown placement.");
  const placement = PROMO_PLACEMENTS[query.placement];
  const items = await pickPromos({
    limit: query.limit ?? placement.limit,
    categories: slugs(query.category),
    exclude: ids(query.exclude),
    recent: slugs(query.recent),
  });
  return ok({ placement: query.placement, items }, { headers: { "cache-control": "no-store" } });
});
