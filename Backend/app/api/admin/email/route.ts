import { ok, readJson, route } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { normalizeSecret } from "@/lib/mailer";
import { SENDER_HOST } from "@/lib/mail-transport";
import { assertMailHost, emailInputSchema, publicEmail, readEmail, saveEmail } from "@/lib/ops";
import { seal } from "@/lib/secrets";

export const GET = route(async () => {
  await requireAdmin();
  return ok(publicEmail(await readEmail()));
});

export const PUT = route(async (request) => {
  await requireAdmin();
  const input = emailInputSchema.parse(await readJson(request));
  const sender = input.transport === "sender";
  const next = sender ? { ...input, transport: "sender" as const, host: SENDER_HOST, imapEnabled: false } : { ...input, transport: "smtp" as const };
  assertMailHost(next.host);
  assertMailHost(next.imapHost);
  const current = await readEmail();
  const password = input.password?.trim();
  if (sender && current.transport !== "sender" && current.passwordSeal && !password) {
    throw new HttpError(400, "Add the Sender API token. A saved mailbox password is not a Sender token.");
  }
  if (!sender && current.transport === "sender" && current.passwordSeal && !password) {
    throw new HttpError(400, "Add the mailbox password. The saved Sender token cannot log in to SMTP.");
  }
  if (next.enabled && !current.passwordSeal && !password) {
    throw new HttpError(400, sender ? "Add the Sender API token before turning sending on." : "Add an SMTP password before turning sending on.");
  }
  if (sender && next.enabled && !next.fromEmail) throw new HttpError(400, "Add a from email on a domain verified in Sender.");
  if (next.imapEnabled && !next.imapHost) throw new HttpError(400, "Add the IMAP host before turning the inbox on.");
  if (next.imapEnabled && !next.username) throw new HttpError(400, "IMAP uses the SMTP username. Add it before turning the inbox on.");
  if (next.imapEnabled && !current.passwordSeal && !password) throw new HttpError(400, "Add the mailbox password before turning the inbox on.");
  const passwordSeal = password ? seal(normalizeSecret(password, next.host)) : current.passwordSeal;
  return ok(publicEmail(await saveEmail(next, passwordSeal)));
});
