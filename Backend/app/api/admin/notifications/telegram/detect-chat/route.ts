import { ok, route } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { readTelegram } from "@/lib/ops";
import { openSeal } from "@/lib/secrets";
import { telegramChats } from "@/lib/telegram";

export const POST = route(async () => {
  await requireAdmin();
  const token = openSeal((await readTelegram()).tokenSeal);
  if (!token) throw new HttpError(400, "Save a bot token first, then message the bot and try again.");
  const chats = await telegramChats(token);
  if (chats.length === 0) throw new HttpError(400, "No recent chats. Message the bot, or add it to a group, then try again.");
  return ok({ chats });
});
