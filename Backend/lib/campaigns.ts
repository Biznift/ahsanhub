import { z } from "zod";
import type { CampaignAudience } from "@/lib/crm";

export const campaignSchema = z.object({
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
  audience: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("all") }),
    z.object({ kind: z.literal("packages"), packages: z.array(z.string().max(80)).max(20) }),
    z.object({ kind: z.literal("stages"), stages: z.array(z.enum(["free", "pending", "paid", "disabled"])).max(4) }),
    z.object({ kind: z.literal("users"), userIds: z.array(z.string()).max(500) }),
  ]),
});

export function presentCampaign(row: {
  audience: unknown;
  sentAt: Date | null;
  createdAt: Date;
  status: string;
  id: string;
  name: string;
  subject: string;
  body: string;
  recipientIds: string[];
}) {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    audience: row.audience as CampaignAudience,
    status: row.status === "sent" ? ("sent" as const) : ("draft" as const),
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    recipientIds: row.recipientIds,
  };
}
