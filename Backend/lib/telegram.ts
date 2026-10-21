import { HttpError } from "@/lib/http";
import { readTelegram } from "@/lib/ops";
import { openSeal } from "@/lib/secrets";

async function callTelegram(token: string, method: string, body?: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(8000),
  });
  const json = (await response.json().catch(() => null)) as { ok?: boolean; result?: unknown } | null;
  if (!response.ok || !json?.ok) throw new HttpError(400, "Telegram did not accept that. Check the token and chat.");
  return json.result;
}

export async function telegramIdentity(token: string) {
  const result = (await callTelegram(token, "getMe")) as { username?: string };
  return result.username ?? "";
}

export async function telegramChats(token: string) {
  const result = (await callTelegram(token, "getUpdates", { limit: 20 })) as { message?: { chat?: { id?: number; title?: string; username?: string; first_name?: string } } }[];
  const chats = new Map<string, string>();
  for (const update of result ?? []) {
    const chat = update.message?.chat;
    if (!chat?.id) continue;
    const title = chat.title || chat.username || chat.first_name || "Chat";
    chats.set(String(chat.id), title);
  }
  return [...chats.entries()].map(([id, title]) => ({ id, title }));
}

export async function telegramSend(token: string, chatId: string, text: string) {
  await callTelegram(token, "sendMessage", { chat_id: chatId, text: text.slice(0, 3500) });
}

/** Best-effort alert. A Telegram failure must not break the action that triggered it. */
export function alert(event: string, text: string) {
  void (async () => {
    const settings = await readTelegram();
    if (!settings.enabled || !settings.tokenSeal || !settings.chatId || settings.events[event] === false) return;
    const token = openSeal(settings.tokenSeal);
    if (!token) return;
    await telegramSend(token, settings.chatId, text);
  })().catch((error) => {
    console.error("Telegram alert failed", error instanceof Error ? error.message : "unknown");
  });
}
