import type { CrmPerson, CrmStage } from "@/lib/crm";
import { db } from "@/lib/db";

const PACKAGES = {
  admin: "Admin",
  live: "Published maker",
  owner: "Owner",
} as const;

export async function loadPeople(): Promise<{ people: CrmPerson[]; mails: { id: string; userId: string; subject: string; body: string; sentAt: string; campaignId: string | null }[] }> {
  const [users, mails] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        listings: { select: { name: true, status: true } },
        mails: { orderBy: { sentAt: "desc" }, take: 1 },
      },
    }),
    db.mail.findMany({ orderBy: { sentAt: "desc" }, take: 30 }),
  ]);

  const people = users.map((user): CrmPerson => {
    const published = user.listings.filter((item) => item.status === "published");
    const pending = user.listings.filter((item) => item.status === "pending");
    let stage: CrmStage = "free";
    if (user.status === "disabled") stage = "disabled";
    else if (published.length > 0) stage = "paid";
    else if (pending.length > 0) stage = "pending";
    const packageName = user.plan || (user.role === "admin" ? PACKAGES.admin : published.length > 0 ? PACKAGES.live : PACKAGES.owner);
    const features = user.listings.map((item) => item.name).slice(0, 6);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role === "admin" ? "admin" : "owner",
      accountStatus: user.status,
      plan: user.plan || null,
      packageName,
      paid: packageName !== PACKAGES.owner,
      features: features.length > 0 ? features : ["No listing yet"],
      stage,
      payments: published.length,
      pendingItem: pending[0]?.name ?? null,
      lastMailAt: user.mails[0]?.sentAt.toISOString() ?? null,
    };
  });

  return {
    people,
    mails: mails.map((mail) => ({
      id: mail.id,
      userId: mail.userId,
      campaignId: mail.campaignId,
      subject: mail.subject,
      body: mail.body,
      sentAt: mail.sentAt.toISOString(),
    })),
  };
}
