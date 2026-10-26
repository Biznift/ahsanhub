import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { personalize } from "@/lib/crm";
import { deliverEmail, emailEnabled } from "@/lib/mailer";
import { alert } from "@/lib/telegram";
import { loadPeople } from "@/lib/people";

const schema = z.object({
  userIds: z.array(z.string()).min(1).max(200),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = schema.parse(await readJson(request));
  if (!(await emailEnabled())) throw new HttpError(400, "Turn on email and save the email settings before sending.");
  const { people } = await loadPeople();
  const targets = people.filter((person) => input.userIds.includes(person.id) && person.accountStatus === "active");
  if (targets.length === 0) throw new HttpError(400, "No active people to email.");
  let sent = 0;
  for (const person of targets) {
    const subject = personalize(input.subject, person);
    const body = personalize(input.body, person);
    try {
      await deliverEmail(person.email, subject, body);
      await db.mail.create({ data: { userId: person.id, subject, body } });
      sent += 1;
    } catch (error) {
      console.error(error);
      alert("email.failed", `Could not email ${person.email}.`);
    }
  }
  if (sent === 0) throw new HttpError(400, "No emails were sent. Check the email settings.");
  return ok({ sent });
});
