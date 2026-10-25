import { ok, readJson, route, rateLimit } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { verifyImap } from "@/lib/inbox";
import { probeSmtp } from "@/lib/mailer";
import { emailProbeSchema } from "@/lib/ops";
import { alert } from "@/lib/telegram";

export const POST = route(async (request) => {
  const admin = await requireAdmin();
  rateLimit(`mail-probe:${admin.id}`, 30, 10 * 60 * 1000);
  const input = emailProbeSchema.parse(await readJson(request));
  try {
    if (input.kind === "imap") return ok(await verifyImap(input));
    return ok(await probeSmtp(input, input.to || admin.email, input.kind === "send"));
  } catch (error) {
    if (input.kind === "send") alert("email.failed", "The SMTP test email could not be sent.");
    throw error;
  }
});
