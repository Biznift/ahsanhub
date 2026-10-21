"use client";

import { useEffect, useMemo, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, TextInput } from "@/components/ui";
import { api } from "@/components/admin-kit";

const GROUPS: { name: string; events: { key: string; label: string; description: string; enabled: boolean }[] }[] = [
  {
    name: "Orders & payments",
    events: [
      { key: "order.created", label: "New order", description: "A customer placed an order.", enabled: true },
      { key: "payment.paid", label: "Payment received", description: "A payment was confirmed.", enabled: true },
      { key: "payment.failed", label: "Payment failed", description: "A payment attempt failed.", enabled: true },
      { key: "review.created", label: "New review", description: "A customer left a review waiting for approval.", enabled: true },
    ],
  },
  {
    name: "Customers",
    events: [
      { key: "user.registered", label: "New customer signup", description: "Someone created an account.", enabled: true },
      { key: "inquiry.created", label: "New contact inquiry", description: "The contact form was submitted.", enabled: true },
      { key: "listing.submitted", label: "Listing submitted", description: "A product is waiting for review.", enabled: true },
      { key: "listing.published", label: "Listing published", description: "A product just went live.", enabled: true },
    ],
  },
  {
    name: "Security",
    events: [
      { key: "admin.login", label: "Admin signed in", description: "An admin account signed in.", enabled: true },
      { key: "admin.login_failed", label: "Failed admin sign-in", description: "Wrong password or a disabled account.", enabled: true },
      { key: "backup.restored", label: "Database restored", description: "An admin restored a backup.", enabled: true },
    ],
  },
  {
    name: "System",
    events: [
      { key: "system.error", label: "Server error", description: "Something failed on the server.", enabled: true },
      { key: "email.failed", label: "Email could not be sent", description: "SMTP rejected a customer email.", enabled: true },
      { key: "backup.auto_failed", label: "Automatic backup failed", description: "The daily backup did not finish.", enabled: false },
    ],
  },
];

export default function NotificationsPage() {
  const module = moduleBySlug("notifications");
  const { notify } = useStore();
  const [enabled, setEnabled] = useState(true);
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [chatId, setChatId] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [events, setEvents] = useState(() => GROUPS.map((group) => ({ ...group, events: group.events.map((event) => ({ ...event })) })));
  const [chats, setChats] = useState<{ id: string; title: string }[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const onCount = useMemo(() => events.reduce((sum, group) => sum + group.events.filter((event) => event.enabled).length, 0), [events]);

  useEffect(() => {
    api<{ enabled: boolean; hasToken: boolean; chatId: string; botUsername: string; events: Record<string, boolean> }>("/api/admin/notifications/telegram")
      .then((saved) => {
        setEnabled(saved.enabled);
        setHasToken(saved.hasToken);
        setChatId(saved.chatId);
        setBotUsername(saved.botUsername);
        setEvents((current) =>
          current.map((group) => ({
            ...group,
            events: group.events.map((event) => ({ ...event, enabled: saved.events[event.key] ?? event.enabled })),
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  function eventMap() {
    return Object.fromEntries(events.flatMap((group) => group.events.map((event) => [event.key, event.enabled])));
  }

  function toggle(key: string) {
    setEvents((current) =>
      current.map((group) => ({
        ...group,
        events: group.events.map((event) => (event.key === key ? { ...event, enabled: !event.enabled } : event)),
      }))
    );
  }

  function setGroup(name: string, on: boolean) {
    setEvents((current) =>
      current.map((group) => (group.name === name ? { ...group, events: group.events.map((event) => ({ ...event, enabled: on })) } : group))
    );
  }

  return (
    <ModuleFrame module={module}>
      <div className="max-w-3xl space-y-4">
        <section className="rounded-md border border-[#e6e8ef] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Telegram bot</h2>
              <p className="mt-1 text-sm text-[#667085]">
                {botUsername ? (
                  <>
                    Connected bot: <span className="font-medium text-[#1d2939]">@{botUsername}</span>
                  </>
                ) : (
                  "Messages go to your chat, group, or channel."
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((value) => !value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${enabled ? "bg-[#0b6e4f] text-white" : "bg-[#f2f4f7] text-[#667085]"}`}
            >
              {enabled ? "On" : "Off"}
            </button>
          </div>
          <details className="mt-4 rounded-md border border-[#e6e8ef] bg-[#f8f9fc] px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">How to get a bot token and chat ID</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[#667085]">
              <li>Open @BotFather, send /newbot, and copy the token.</li>
              <li>Message your bot, or add it to a group.</li>
              <li>Use Find my chat ID, then pick the chat.</li>
            </ol>
          </details>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Bot token">
              <TextInput
                type="password"
                value={token}
                placeholder={hasToken ? "Saved. Leave blank to keep." : "123456:ABC…"}
                onChange={(event) => setToken(event.target.value)}
              />
            </Field>
            <Field label="Chat ID">
              <TextInput value={chatId} onChange={(event) => setChatId(event.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              tone="ghost"
              onClick={async () => {
                try {
                  const result = await api<{ chats: { id: string; title: string }[] }>("/api/admin/notifications/telegram/detect-chat", { method: "POST" });
                  setChats(result.chats);
                  setNote("Pick a chat that recently messaged the bot.");
                } catch (problem) {
                  setNote((problem as Error).message);
                }
              }}
            >
              Find my chat ID
            </Button>
            <Button
              type="button"
              tone="ghost"
              onClick={async () => {
                try {
                  await api("/api/admin/notifications/telegram/test", { method: "POST" });
                  notify("Test notification sent");
                  setNote(`Test message sent to chat ${chatId}.`);
                } catch (problem) {
                  setNote((problem as Error).message);
                }
              }}
            >
              Send test message
            </Button>
            <Button
              type="button"
              onClick={async () => {
                try {
                  const saved = await api<{ hasToken: boolean; botUsername: string; enabled: boolean }>("/api/admin/notifications/telegram", {
                    method: "PUT",
                    body: JSON.stringify({ enabled, token, chatId, events: eventMap() }),
                  });
                  setHasToken(saved.hasToken);
                  setBotUsername(saved.botUsername);
                  setToken("");
                  notify("Notification settings saved");
                  setNote(saved.enabled ? `${onCount} events will send.` : "Saved. Telegram is off, so nothing will send.");
                } catch (problem) {
                  setNote((problem as Error).message);
                }
              }}
            >
              Save
            </Button>
          </div>
          {chats && (
            <ul className="mt-3 space-y-2">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setChatId(chat.id);
                      setNote(`Chat set to ${chat.title}`);
                    }}
                    className="w-full rounded-md border border-[#e6e8ef] px-3 py-2 text-left text-sm hover:border-[#0b6e4f]"
                  >
                    <span className="font-medium">{chat.title}</span>
                    <span className="ml-2 font-mono text-xs text-[#98a2b3]">{chat.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {note && <p className="mt-3 text-sm text-[#12b76a]">{note}</p>}
        </section>

        {events.map((group) => (
          <section key={group.name} className="rounded-md border border-[#e6e8ef] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{group.name}</h2>
              <div className="flex gap-2 text-xs">
                <button type="button" className="text-[#0b6e4f]" onClick={() => setGroup(group.name, true)}>All on</button>
                <button type="button" className="text-[#667085]" onClick={() => setGroup(group.name, false)}>All off</button>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-[#f2f4f7]">
              {group.events.map((event) => (
                <li key={event.key} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block text-sm font-medium">{event.label}</span>
                    <span className="block text-xs text-[#667085]">{event.description}</span>
                    <span className="mono mt-1 block text-[11px] text-[#98a2b3]">{event.key}</span>
                  </span>
                  <button
                    type="button"
                    aria-pressed={event.enabled}
                    onClick={() => toggle(event.key)}
                    className={`h-6 w-11 rounded-full p-0.5 ${event.enabled ? "bg-[#0b6e4f]" : "bg-[#d0d5dd]"}`}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-white transition ${event.enabled ? "translate-x-5" : ""}`} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ModuleFrame>
  );
}
