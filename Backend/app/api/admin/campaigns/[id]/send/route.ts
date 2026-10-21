import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { audiencePeople, personalize, type CampaignAudience } from "@/lib/crm";
import { deliverEmail, emailEnabled } from "@/lib/mailer";
import { alert } from "@/lib/telegram";
import { loadPeople } from "@/lib/people";
import { presentCampaign } from "@/lib/campaigns";

type Context = { params: Promise<{ id: string }> };

export const POST = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) throw new HttpError(404, "Campaign not found.");
  if (campaign.status === "sent") throw new HttpError(400, "This campaign was already sent.");
  if (!(await emailEnabled())) throw new HttpError(400, "Turn on email and save SMTP settings before sending.");
  const { people } = await loadPeople();
  const recipients = audiencePeople(people, campaign.audience as CampaignAudience).slice(0, 200);
  if (recipients.length === 0) throw new HttpError(400, "That audience has no active people.");
  const sent: string[] = [];
  for (const person of recipients) {
    const subject = personalize(campaign.subject, person);
    const body = personalize(campaign.body, person);
    try {
      await deliverEmail(person.email, subject, body);
      await db.mail.create({ data: { userId: person.id, campaignId: campaign.id, subject, body } });
      sent.push(person.id);
    } catch (error) {
      console.error(error);
      alert("email.failed", `Campaign “${campaign.name}” could not email ${person.email}.`);
    }
  }
  if (sent.length === 0) throw new HttpError(400, "No emails were sent. Check the SMTP settings.");
  const row = await db.campaign.update({
    where: { id },
    data: { status: "sent", sentAt: new Date(), recipientIds: sent },
  });
  return ok({ ...presentCampaign(row), sent: sent.length, failed: recipients.length - sent.length });
});
