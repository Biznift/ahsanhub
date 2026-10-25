import { ok, readJson, route } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { normalizeSecret } from "@/lib/mailer";
import { assertMailHost, emailInputSchema, publicEmail, readEmail, saveEmail } from "@/lib/ops";
import { seal } from "@/lib/secrets";

export const GET = route(async () => {
  await requireAdmin();
  return ok(publicEmail(await readEmail()));
});

export const PUT = route(async (request) => {
  await requireAdmin();
  const input = emailInputSchema.parse(await readJson(request));
  assertMailHost(input.host);
  assertMailHost(input.imapHost);
  const current = await readEmail();
  const password = input.password?.trim();
  if (input.enabled && !current.passwordSeal && !password) throw new HttpError(400, "Add an SMTP password before turning sending on.");
  if (input.imapEnabled && !input.imapHost) throw new HttpError(400, "Add the IMAP host before turning the inbox on.");
  if (input.imapEnabled && !input.username) throw new HttpError(400, "IMAP uses the SMTP username. Add it before turning the inbox on.");
  if (input.imapEnabled && !current.passwordSeal && !password) throw new HttpError(400, "Add the mailbox password before turning the inbox on.");
  const passwordSeal = password ? seal(normalizeSecret(password, input.host)) : current.passwordSeal;
  return ok(publicEmail(await saveEmail(input, passwordSeal)));
});
