import { db } from "@/lib/db";
import { cardInclude, toCard } from "@/lib/directory";

export type PromoOffer = { dealId: string; label: string };

type Deal = { id: string; note: string; fromListing: boolean };

type Candidate = {
  id: string;
  impressions: number;
  pinned: boolean;
  categorySlugs: string[];
  offer: PromoOffer | null;
  card: ReturnType<typeof toCard> & { offer: PromoOffer | null };
};

/** "20% off" when the note states a percent, otherwise a plain discount line. The code stays private. */
export function couponOffer(deal: Deal | null): PromoOffer | null {
  if (!deal) return null;
  const match = deal.note.match(/(\d{1,3})\s*%/);
  const percent = match ? Number(match[1]) : null;
  const label = percent && percent > 0 && percent <= 100 ? `${percent}% off` : "Discount available";
  return { dealId: deal.id, label };
}

function weight(item: Candidate, recent: Set<string>) {
  let score = 1 / (item.impressions + 1);
  if (item.offer) score *= 2.2;
  if (item.pinned) score *= 1.2;
  if (item.categorySlugs.some((slug) => recent.has(slug))) score *= 1.35;
  return score;
}

/** Weighted draw without replacement. A product with fewer impressions is more likely to be next. */
export function drawPromos(items: Candidate[], limit: number, recent: Set<string>) {
  const pool = [...items];
  const chosen: Candidate[] = [];
  while (pool.length > 0 && chosen.length < limit) {
    const weights = pool.map((item) => weight(item, recent));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let cursor = Math.random() * total;
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i += 1) {
      cursor -= weights[i];
      if (cursor <= 0) {
        index = i;
        break;
      }
    }
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}

function liveDeal(deals: Deal[]) {
  return deals.find((deal) => deal.fromListing) ?? deals[0] ?? null;
}

/**
 * Featured products, plus anything an admin pinned.
 * On a product page the same categories go first. Inside that group a coupon weighs more,
 * and impressions stay near each other because a rarely shown product gets a higher weight.
 * With no category match, the same rule runs across every featured and pinned product.
 */
export async function pickPromos(input: { limit: number; categories: string[]; exclude: string[]; recent: string[] }) {
  const exclude = new Set(input.exclude.filter(Boolean));
  const categories = new Set(input.categories);
  const recent = new Set(input.recent);
  const rows = await db.listing.findMany({
    where: {
      status: "published",
      OR: [{ featured: true }, { promoPin: { isNot: null } }],
      ...(exclude.size > 0 ? { id: { notIn: [...exclude] } } : {}),
    },
    include: {
      ...cardInclude,
      promoPin: { select: { id: true } },
      couponDeals: {
        where: { active: true },
        select: { id: true, note: true, fromListing: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    take: 200,
  });

  const candidates: Candidate[] = rows.map((row) => {
    const offer = couponOffer(liveDeal(row.couponDeals));
    return {
      id: row.id,
      impressions: row.promoImpressions,
      pinned: Boolean(row.promoPin),
      categorySlugs: row.categories.map((item) => item.category.slug),
      offer,
      card: { ...toCard(row, { includeHidden: false }), offer },
    };
  });

  const sameCategory = categories.size > 0 ? candidates.filter((item) => item.categorySlugs.some((slug) => categories.has(slug))) : [];
  const pool = sameCategory.length > 0 ? sameCategory : candidates;
  return drawPromos(pool, input.limit, recent).map((item) => item.card);
}
