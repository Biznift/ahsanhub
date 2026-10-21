import { ok, readJson, route } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { publicTelegram, readTelegram, saveTelegram, telegramInputSchema } from "@/lib/ops";
import { seal } from "@/lib/secrets";
import { telegramIdentity } from "@/lib/telegram";

export const GET = route(async () => {
  await requireAdmin();
  return ok(publicTelegram(await readTelegram()));
});

export const PUT = route(async (request) => {
  await requireAdmin();
  const input = telegramInputSchema.parse(await readJson(request));
  const current = await readTelegram();
  const token = input.token?.trim();
  const tokenSeal = token ? seal(token) : current.tokenSeal;
  if (input.enabled && (!tokenSeal || !input.chatId)) throw new HttpError(400, "Add a bot token and chat ID before turning Telegram on.");
  let botUsername = current.botUsername;
  if (token) botUsername = await telegramIdentity(token);
  const saved = await saveTelegram({
    enabled: input.enabled,
    tokenSeal,
    chatId: input.chatId,
    botUsername,
    events: input.events,
  });
  return ok(publicTelegram(saved));
});
