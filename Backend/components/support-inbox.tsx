"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { api, useApi } from "@/components/admin-kit";
import { useStore } from "@/components/store";

type Message = {
  id: string;
  direction: "in" | "out";
  fromName: string;
  fromEmail: string;
  body: string;
  createdAt: string;
};

type Item = {
  id: string;
  subject: string;
  peerName: string;
  peerEmail: string;
  status: string;
  unread: boolean;
  lastMessageAt: string;
  messages: Message[];
};

type Inbox = {
  configured: boolean;
  sending: boolean;
  inboxName: string;
  address: string;
  items: Item[];
};

export function SupportInbox() {
  const { notify } = useStore();
  const { data, error, reload } = useApi<Inbox>("/api/admin/inbox");
  const items = data?.items ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"sync" | "reply" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  async function refresh() {
    setBusy("sync");
    setNote(null);
    try {
      const result = await api<{ imported: number; scanned: number }>("/api/admin/inbox", { method: "POST" });
      notify(result.imported ? `${result.imported} new message${result.imported === 1 ? "" : "s"}` : "Inbox is up to date");
      setNote(result.imported ? `${result.imported} new message${result.imported === 1 ? "" : "s"} from ${data?.inboxName || "the inbox"}.` : "No new mail.");
      await reload();
    } catch (problem) {
      setNote((problem as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function openThread(id: string) {
    setSelectedId(id);
    setReply("");
    const item = items.find((row) => row.id === id);
    if (!item?.unread) return;
    try {
      await api(`/api/admin/inbox/${id}`, { method: "PATCH", body: JSON.stringify({ unread: false }) });
      await reload();
    } catch {
      // The thread still opens. The unread mark can be cleared on the next visit.
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy("reply");
    setNote(null);
    try {
      await api(`/api/admin/inbox/${selected.id}`, { method: "POST", body: JSON.stringify({ body: reply.trim() }) });
      setReply("");
      notify("Reply sent");
      setNote(`Reply sent to ${selected.peerEmail}.`);
      await reload();
    } catch (problem) {
      setNote((problem as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-md border border-[#e6e8ef] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Support inbox</h2>
          <p className="mt-1 text-sm text-[#667085]">
            {data?.address
              ? `Mail to ${data.address}, and replies to messages sent from it, show up from the ${data.inboxName} mailbox.`
              : "Save a from address and turn on IMAP. Mail to that address can be answered here."}
          </p>
        </div>
        <Button type="button" tone="ghost" disabled={busy !== null || !data?.configured} onClick={refresh}>
          {busy === "sync" ? "Checking…" : "Check for new mail"}
        </Button>
      </div>
      {data && !data.configured && (
        <p className="mt-3 text-sm text-[#667085]">Turn on IMAP, name the inbox, and save. Then new mail can be read here.</p>
      )}
      {data?.configured && !data.sending && (
        <p className="mt-3 text-sm text-[#9a5b00]">Sending is off, so replies stay here until you turn sending on and save.</p>
      )}
      {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}
      {note && <p className={`mt-3 text-sm ${note.startsWith("Reply") || note.startsWith("No new") || /^\d/.test(note) ? "text-[#12b76a]" : "text-[#b42318]"}`}>{note}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-[#e6e8ef]">
          <table className="w-full text-left">
            <thead className="text-sm text-[#667085]">
              <tr>
                <th className="px-4 py-2 font-medium">From</th>
                <th className="px-4 py-2 font-medium">Subject</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openThread(item.id)}
                  className={`cursor-pointer border-t border-[#eef0f4] ${selectedId === item.id ? "bg-[#f3f9f6]" : "hover:bg-[#f5f6fa]"}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1d2939]">{item.peerName || item.peerEmail}</p>
                    <p className="text-sm text-[#667085]">{item.peerEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1d2939]">
                      {item.unread && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#0b6e4f]" />}
                      {item.subject}
                    </p>
                    <p className="text-sm text-[#667085]">
                      <Badge tone={item.status === "REPLIED" ? "ok" : "warn"}>{item.status === "REPLIED" ? "Replied" : "Open"}</Badge>
                      <span className="ml-2">{new Date(item.lastMessageAt).toLocaleString()}</span>
                    </p>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-[#667085]">
                    No mail in the support inbox yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-[#e6e8ef] p-4">
          <h3 className="font-semibold">Conversation</h3>
          {!selected && <p className="mt-3 text-sm text-[#667085]">Select a message to read it and reply.</p>}
          {selected && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-medium text-[#1d2939]">{selected.subject}</p>
                <p className="text-sm text-[#667085]">
                  {selected.peerName ? `${selected.peerName} · ` : ""}
                  {selected.peerEmail}
                </p>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {selected.messages.map((message) => (
                  <div key={message.id} className={`rounded-lg px-3 py-2 ${message.direction === "out" ? "border border-[#cfe5db] bg-[#f3f9f6]" : "bg-[#f5f6fa]"}`}>
                    <p className="text-sm font-medium text-[#667085]">
                      {message.direction === "out" ? "You" : message.fromName || message.fromEmail} · {new Date(message.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[#1d2939]">{message.body}</p>
                  </div>
                ))}
              </div>
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={4}
                placeholder={`Reply to ${selected.peerEmail}`}
                className="w-full rounded-lg border border-[#e6e8ef] px-3 py-2.5 text-base outline-none ring-[#0b6e4f] focus:ring-2"
              />
              <Button type="button" disabled={!reply.trim() || busy !== null} onClick={sendReply}>
                {busy === "reply" ? "Sending…" : "Send reply"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
