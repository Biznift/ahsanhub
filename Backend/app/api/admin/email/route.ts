import { ok, readJson, route } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
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
  const current = await readEmail();
  const password = input.password?.trim();
  if (input.enabled && !current.passwordSeal && !password) throw new HttpError(400, "Add an SMTP password before turning sending on.");
  const passwordSeal = password ? seal(password) : current.passwordSeal;
  return ok(publicEmail(await saveEmail(input, passwordSeal)));
});
