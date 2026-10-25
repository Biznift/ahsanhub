import { z } from "zod";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { probeSmtp } from "@/lib/mailer";
import { alert } from "@/lib/telegram";

export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = z.object({ to: z.string().trim().email().optional() }).parse(await readJson(request));
  const to = input.to || admin.email;
  try {
    await probeSmtp({}, to, true);
  } catch (error) {
    alert("email.failed", "The SMTP test email could not be sent.");
    throw error;
  }
  return ok({ ok: true, to });
});
