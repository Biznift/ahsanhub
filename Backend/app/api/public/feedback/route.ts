import { z } from "zod";
import { db } from "@/lib/db";
import { limitClient, ok, readJson, route } from "@/lib/http";
import { alert } from "@/lib/telegram";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  kind: z.enum(["BUG", "FEATURE", "FEEDBACK", "OTHER"]),
  title: z.string().trim().min(4).max(140),
  body: z.string().trim().min(10).max(4000),
});

export const POST = route(async (request) => {
  limitClient(request, "feedback", 5, 60 * 60 * 1000);
  const input = schema.parse(await readJson(request));
  const thread = await db.feedbackThread.create({
    data: {
      name: input.name,
      email: input.email,
      kind: input.kind,
      title: input.title,
      messages: { create: { author: input.name, role: "USER", body: input.body } },
    },
  });
  alert("inquiry.created", `New ${input.kind.toLowerCase()} from ${input.name}: ${input.title}`);
  return ok({ id: thread.id }, { status: 201 });
});
