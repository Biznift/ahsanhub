import { z } from "zod";
import { HttpError, ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { markInboxRead, replyToInbox } from "@/lib/inbox";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const input = z.object({ unread: z.boolean() }).parse(await readJson(request));
  const { id } = await params;
  if (input.unread) throw new HttpError(400, "Open the conversation to mark it read.");
  await markInboxRead(id);
  return ok({ ok: true });
});

export const POST = route<Context>(async (request, { params }) => {
  await requireAdmin();
  const input = z.object({ body: z.string().trim().min(1).max(8000) }).parse(await readJson(request));
  const { id } = await params;
  return ok(await replyToInbox(id, input.body));
});
