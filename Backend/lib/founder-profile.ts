import type { Prisma, User } from "@prisma/client";
import { db } from "@/lib/db";
import { httpSocials, revalidate, type Socials } from "@/lib/directory";
import { removeIfOrphan } from "@/lib/upload";

export type FounderProfile = {
  name: string;
  photo: string | null;
  bio: string;
  socials: Socials;
  role: string;
};

function samePerson(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function pickSource(
  user: User,
  listings: Prisma.ListingGetPayload<{ include: { founders: true } }>[],
) {
  const founders = listings.flatMap((listing) => listing.founders);
  const linked = founders.find((founder) => founder.userId === user.id);
  const named = founders.find((founder) => samePerson(founder.name, user.name));
  return linked ?? named ?? listings[0]?.founders[0] ?? null;
}

/** Name, photo, bio, and socials for the signed-in owner, plus the last role they used. */
export async function loadFounderProfile(user: User): Promise<FounderProfile> {
  const listings = await db.listing.findMany({
    where: { ownerId: user.id },
    include: { founders: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  const source = pickSource(user, listings);
  const storedSocials = httpSocials(user.socials);
  const saved = Boolean(user.photo || user.bio.trim() || Object.keys(storedSocials).length || listings.some((listing) => listing.founders.some((founder) => founder.userId === user.id)));
  return {
    name: user.name.trim() || source?.name || "",
    photo: saved ? user.photo : source?.photo ?? null,
    bio: saved ? user.bio : source?.bio || "",
    socials: saved ? storedSocials : httpSocials(source?.socials),
    role: source?.role || "Founder",
  };
}

type PreparedFounder = {
  name: string;
  bio: string;
  photo: string | null;
  socials: Socials;
  isSelf?: boolean;
  userId: string | null;
};

/**
 * Saves the owner's personal founder details on the account, copies them onto every
 * listing where they are the founder, and links older listings with the same name.
 * Role stays on each listing.
 */
export async function syncLinkedFounderProfile(ownerId: string | null | undefined, prepared: { founders: PreparedFounder[] }) {
  const self = prepared.founders.find((founder) => founder.isSelf) ?? prepared.founders.find((founder) => founder.userId);
  const userId = self?.isSelf ? ownerId ?? self.userId : self?.userId;
  if (!self || !userId) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const previousPhoto = user.photo;
  const previousName = user.name;
  const name = self.name;
  const photo = self.photo;
  const bio = self.bio;
  const socials = self.socials;

  await db.user.update({
    where: { id: userId },
    data: { name, photo, bio, socials: socials as Prisma.InputJsonValue },
  });
  await db.founder.updateMany({
    where: { userId },
    data: { name, photo, bio, socials: socials as Prisma.InputJsonValue },
  });

  const listings = await db.listing.findMany({
    where: { ownerId: userId },
    include: { founders: true },
  });
  const names = [previousName, name].map((value) => value.trim().toLowerCase()).filter(Boolean);
  for (const listing of listings) {
    if (listing.founders.some((founder) => founder.userId === userId)) continue;
    const match = listing.founders.find((founder) => names.includes(founder.name.trim().toLowerCase()));
    if (!match) continue;
    await db.founder.update({
      where: { id: match.id },
      data: { userId, name, photo, bio, socials: socials as Prisma.InputJsonValue },
    });
  }

  if (previousPhoto && previousPhoto !== photo) await removeIfOrphan(previousPhoto);

  const tagged = await db.listing.findMany({
    where: { founders: { some: { userId } }, status: "published" },
    select: { slug: true },
  });
  if (tagged.length) revalidate("listings", ...tagged.map((row) => `listing:${row.slug}`));
}
