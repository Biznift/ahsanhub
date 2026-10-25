import { readFile, unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { STORAGE_DIR } from "@/lib/upload";

const DIR = path.join(STORAGE_DIR, "backups");

const snapshotSchema = z.object({
  users: z.array(z.object({ id: z.string(), email: z.string(), passwordHash: z.string(), role: z.enum(["admin", "owner"]), status: z.enum(["active", "disabled"]) }).passthrough()),
  categories: z.array(z.record(z.string(), z.unknown())),
  listings: z.array(z.record(z.string(), z.unknown())),
  listingCategories: z.array(z.record(z.string(), z.unknown())),
  founders: z.array(z.record(z.string(), z.unknown())),
  votes: z.array(z.record(z.string(), z.unknown())),
  reviews: z.array(z.record(z.string(), z.unknown())),
  ads: z.array(z.record(z.string(), z.unknown())),
  media: z.array(z.record(z.string(), z.unknown())),
  settings: z.array(z.record(z.string(), z.unknown())),
  posts: z.array(z.record(z.string(), z.unknown())),
  feedbackThreads: z.array(z.record(z.string(), z.unknown())),
  feedbackMessages: z.array(z.record(z.string(), z.unknown())),
  campaigns: z.array(z.record(z.string(), z.unknown())),
  mails: z.array(z.record(z.string(), z.unknown())),
  socialEvents: z.array(z.record(z.string(), z.unknown())),
  couponDeals: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

function fileFor(id: string) {
  if (!/^[a-z0-9]+$/i.test(id)) throw new HttpError(400, "Unknown backup.");
  return path.join(DIR, `${id}.json`);
}

export async function createBackup(automatic = false) {
  const [
    users,
    categories,
    listings,
    listingCategories,
    founders,
    votes,
    reviews,
    ads,
    media,
    settings,
    posts,
    feedbackThreads,
    feedbackMessages,
    campaigns,
    mails,
    socialEvents,
    couponDeals,
  ] = await Promise.all([
    db.user.findMany(),
    db.category.findMany(),
    db.listing.findMany(),
    db.listingCategory.findMany(),
    db.founder.findMany(),
    db.vote.findMany(),
    db.review.findMany(),
    db.ad.findMany(),
    db.media.findMany(),
    db.setting.findMany(),
    db.post.findMany(),
    db.feedbackThread.findMany(),
    db.feedbackMessage.findMany(),
    db.campaign.findMany(),
    db.mail.findMany(),
    db.socialEvent.findMany(),
    db.couponDeal.findMany(),
  ]);
  const body = JSON.stringify({
    createdAt: new Date().toISOString(),
    users,
    categories,
    listings,
    listingCategories,
    founders,
    votes,
    reviews,
    ads,
    media,
    settings,
    posts,
    feedbackThreads,
    feedbackMessages,
    campaigns,
    mails,
    socialEvents,
    couponDeals,
  });
  const row = await db.backupFile.create({
    data: { name: `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, size: Buffer.byteLength(body), automatic },
  });
  await mkdir(DIR, { recursive: true });
  await writeFile(fileFor(row.id), body);
  return row;
}

export async function readBackupFile(id: string) {
  const row = await db.backupFile.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, "Backup not found.");
  const full = fileFor(id);
  if (!full.startsWith(path.resolve(DIR) + path.sep)) throw new HttpError(404, "Backup not found.");
  const body = await readFile(full);
  return { row, body };
}

export async function deleteBackup(id: string) {
  await db.backupFile.delete({ where: { id } });
  await unlink(fileFor(id)).catch(() => undefined);
}

export async function restoreBackup(id: string, adminId: string) {
  const { body } = await readBackupFile(id);
  let json: unknown;
  try {
    json = JSON.parse(body.toString("utf8"));
  } catch {
    throw new HttpError(400, "This backup file is not valid JSON.");
  }
  const snapshot = snapshotSchema.parse(json);
  if (!snapshot.users.some((user) => user.id === adminId && user.role === "admin" && user.status === "active")) {
    throw new HttpError(400, "This backup does not include your admin account, so it was not restored.");
  }

  const dates = (row: Record<string, unknown>) => {
    const next = { ...row };
    for (const key of ["createdAt", "updatedAt", "publishedAt", "sentAt", "occurredAt", "expiresAt"]) {
      if (typeof next[key] === "string") next[key] = new Date(next[key] as string);
    }
    return next;
  };

  await db.$transaction(async (tx) => {
    await tx.couponDeal.deleteMany();
    await tx.loginToken.deleteMany();
    await tx.mail.deleteMany();
    await tx.feedbackMessage.deleteMany();
    await tx.feedbackThread.deleteMany();
    await tx.vote.deleteMany();
    await tx.review.deleteMany();
    await tx.founder.deleteMany();
    await tx.listingCategory.deleteMany();
    await tx.listing.deleteMany();
    await tx.user.deleteMany();
    await tx.category.deleteMany();
    await tx.ad.deleteMany();
    await tx.media.deleteMany();
    await tx.setting.deleteMany();
    await tx.post.deleteMany();
    await tx.campaign.deleteMany();
    await tx.socialEvent.deleteMany();

    if (snapshot.users.length) await tx.user.createMany({ data: snapshot.users.map((row) => dates(row)) as never });
    if (snapshot.categories.length) await tx.category.createMany({ data: snapshot.categories.map(dates) as never });
    if (snapshot.listings.length) await tx.listing.createMany({ data: snapshot.listings.map(dates) as never });
    if (snapshot.listingCategories.length) await tx.listingCategory.createMany({ data: snapshot.listingCategories as never });
    if (snapshot.founders.length) await tx.founder.createMany({ data: snapshot.founders as never });
    if (snapshot.votes.length) await tx.vote.createMany({ data: snapshot.votes.map(dates) as never });
    if (snapshot.reviews.length) await tx.review.createMany({ data: snapshot.reviews.map(dates) as never });
    if (snapshot.ads.length) await tx.ad.createMany({ data: snapshot.ads.map(dates) as never });
    if (snapshot.media.length) await tx.media.createMany({ data: snapshot.media.map(dates) as never });
    if (snapshot.settings.length) await tx.setting.createMany({ data: snapshot.settings as never });
    if (snapshot.posts.length) await tx.post.createMany({ data: snapshot.posts.map(dates) as never });
    if (snapshot.feedbackThreads.length) await tx.feedbackThread.createMany({ data: snapshot.feedbackThreads.map(dates) as never });
    if (snapshot.feedbackMessages.length) await tx.feedbackMessage.createMany({ data: snapshot.feedbackMessages.map(dates) as never });
    if (snapshot.campaigns.length) await tx.campaign.createMany({ data: snapshot.campaigns.map(dates) as never });
    if (snapshot.mails.length) await tx.mail.createMany({ data: snapshot.mails.map(dates) as never });
    if (snapshot.socialEvents.length) await tx.socialEvent.createMany({ data: snapshot.socialEvents.map(dates) as never });
    const listingIds = new Set(snapshot.listings.map((row) => String(row.id ?? "")));
    const couponDeals = snapshot.couponDeals.filter((row) => listingIds.has(String(row.listingId ?? "")));
    if (couponDeals.length) await tx.couponDeal.createMany({ data: couponDeals.map(dates) as never });
  });
}
