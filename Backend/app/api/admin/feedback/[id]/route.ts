import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { deliverEmail, emailEnabled } from "@/lib/mailer";
import { alert } from "@/lib/telegram";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const input = z.object({ status: z.enum(["OPEN", "REPLIED", "CLOSED"]) }).parse(await readJson(request));
  await db.feedbackThread.update({ where: { id: (await params).id }, data: { status: input.status } });
  return ok({ ok: true });
});

export const POST = route<Context>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = z.object({ body: z.string().trim().min(1).max(4000) }).parse(await readJson(request));
  const thread = await db.feedbackThread.findUnique({ where: { id } });
  if (!thread) throw new HttpError(404, "Feedback not found.");
  const message = await db.feedbackMessage.create({
    data: { threadId: id, author: admin.name, role: "ADMIN", body: input.body },
  });
  await db.feedbackThread.update({ where: { id }, data: { status: "REPLIED" } });
  if (await emailEnabled("feedback_reply")) {
    try {
      await deliverEmail(thread.email, `Re: ${thread.title}`, `${input.body}\n\n— ${admin.name}\nAhsan Hub`);
    } catch (error) {
      console.error(error);
      alert("email.failed", `Could not email a feedback reply to ${thread.email}.`);
    }
  }
  return ok({
    id: message.id,
    author: message.author,
    role: message.role,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  });
});
