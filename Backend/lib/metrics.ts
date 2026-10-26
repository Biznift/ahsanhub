import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const EVENT_KINDS = ["view", "impression", "click", "coupon"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type WeekTotals = { views: number; impressions: number; clicks: number; couponClicks: number };

export const EMPTY_WEEK: WeekTotals = { views: 0, impressions: 0, clicks: 0, couponClicks: 0 };

export function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isUnique(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Counts a visitor once per day. Returns false when this visitor was already counted. */
export async function recordListingEvent(listingId: string, visitorKey: string, kind: EventKind) {
  const day = startOfUtcDay();
  const listingData =
    kind === "view"
      ? { viewCount: { increment: 1 } }
      : kind === "impression"
        ? { promoImpressions: { increment: 1 } }
        : kind === "click"
          ? { promoClicks: { increment: 1 } }
          : { couponClicks: { increment: 1 } };
  const metricCreate =
    kind === "view"
      ? { views: 1 }
      : kind === "impression"
        ? { impressions: 1 }
        : kind === "click"
          ? { clicks: 1 }
          : { couponClicks: 1 };
  const metricUpdate =
    kind === "view"
      ? { views: { increment: 1 } }
      : kind === "impression"
        ? { impressions: { increment: 1 } }
        : kind === "click"
          ? { clicks: { increment: 1 } }
          : { couponClicks: { increment: 1 } };
  try {
    await db.$transaction(async (tx) => {
      await tx.listingEvent.create({ data: { listingId, visitorKey, day, kind } });
      await tx.listing.update({ where: { id: listingId }, data: listingData });
      await tx.listingMetric.upsert({
        where: { listingId_day: { listingId, day } },
        create: { listingId, day, ...metricCreate },
        update: metricUpdate,
      });
    });
    return true;
  } catch (error) {
    if (isUnique(error)) return false;
    throw error;
  }
}

/** Last 7 UTC days, including today. */
export async function weekTotals(listingIds: string[]) {
  const totals = new Map<string, WeekTotals>();
  if (listingIds.length === 0) return totals;
  const since = startOfUtcDay();
  since.setUTCDate(since.getUTCDate() - 6);
  const rows = await db.listingMetric.groupBy({
    by: ["listingId"],
    where: { listingId: { in: listingIds }, day: { gte: since } },
    _sum: { views: true, impressions: true, clicks: true, couponClicks: true },
  });
  for (const row of rows) {
    totals.set(row.listingId, {
      views: row._sum.views ?? 0,
      impressions: row._sum.impressions ?? 0,
      clicks: row._sum.clicks ?? 0,
      couponClicks: row._sum.couponClicks ?? 0,
    });
  }
  return totals;
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse/i;

export function isBot(request: Request) {
  const agent = request.headers.get("user-agent") ?? "";
  if (agent.length < 8 || BOT.test(agent)) return true;
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`;
  return /prefetch/i.test(purpose);
}
