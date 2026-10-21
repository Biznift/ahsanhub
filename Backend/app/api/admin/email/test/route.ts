import { z } from "zod";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { alert } from "@/lib/telegram";
import { deliverEmail } from "@/lib/mailer";

export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = z.object({ to: z.string().trim().email().optional() }).parse(await readJson(request));
  const to = input.to || admin.email;
  try {
    await deliverEmail(to, "Ahsan Hub test email", "This is a test from the Ahsan Hub admin. If you can read it, SMTP is working.");
  } catch (error) {
    alert("email.failed", "The SMTP test email could not be sent.");
    throw error;
  }
  return ok({ ok: true, to });
});
