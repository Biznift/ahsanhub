import { ok, route } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { readTelegram } from "@/lib/ops";
import { openSeal } from "@/lib/secrets";
import { telegramSend } from "@/lib/telegram";

export const POST = route(async () => {
  await requireAdmin();
  const settings = await readTelegram();
  const token = openSeal(settings.tokenSeal);
  if (!settings.enabled) throw new HttpError(400, "Turn notifications on before sending a test.");
  if (!token || !settings.chatId) throw new HttpError(400, "Save a bot token and chat ID first.");
  await telegramSend(token, settings.chatId, "Ahsan Hub test. Telegram alerts are connected.");
  return ok({ ok: true });
});
