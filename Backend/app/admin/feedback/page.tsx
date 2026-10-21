"use client";

import { useMemo, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Badge, Button } from "@/components/ui";
import { api, useApi } from "@/components/admin-kit";

type Kind = "BUG" | "FEATURE" | "FEEDBACK" | "OTHER";
type Status = "OPEN" | "REPLIED" | "CLOSED";

type Message = {
  id: string;
  author: string;
  role: "USER" | "ADMIN";
  body: string;
  createdAt: string;
};

type Item = {
  id: string;
  name: string;
  email: string;
  type: Kind;
  title: string;
  status: Status;
  updatedAt: string;
  messages: Message[];
};

const TYPE_LABEL: Record<Kind, string> = {
  BUG: "Bug report",
  FEATURE: "Feature request",
  FEEDBACK: "General feedback",
  OTHER: "Other",
};

const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Open",
  REPLIED: "Replied",
  CLOSED: "Closed",
};

const FILTERS: Array<Status | ""> = ["", "OPEN", "REPLIED", "CLOSED"];

function tone(status: Status) {
  if (status === "OPEN") return "warn" as const;
  if (status === "REPLIED") return "ok" as const;
  return "muted" as const;
}

export default function FeedbackPage() {
  const module = moduleBySlug("feedback");
  const { notify } = useStore();
  const { data, reload } = useApi<{ items: Item[] }>("/api/admin/feedback");
  const items = data?.items ?? [];
  const [filter, setFilter] = useState<Status | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const shown = filter ? items.filter((item) => item.status === filter) : items;
  const activeId = selectedId ?? shown[0]?.id ?? null;
  const selected = items.find((item) => item.id === activeId) ?? null;
  const counts = useMemo(() => {
    return {
      "": items.length,
      OPEN: items.filter((item) => item.status === "OPEN").length,
      REPLIED: items.filter((item) => item.status === "REPLIED").length,
      CLOSED: items.filter((item) => item.status === "CLOSED").length,
    };
  }, [items]);

  async function setStatus(status: Status) {
    if (!selected) return;
    await api(`/api/admin/feedback/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    notify(status === "CLOSED" ? "Feedback closed" : `Marked ${STATUS_LABEL[status].toLowerCase()}`);
    reload();
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    try {
      await api(`/api/admin/feedback/${selected.id}`, { method: "POST", body: JSON.stringify({ body: reply.trim() }) });
      setReply("");
      notify("Reply sent");
      reload();
    } catch (problem) {
      notify((problem as Error).message);
    }
  }

  return (
    <ModuleFrame module={module}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((value) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                filter === value ? "border-[#0b6e4f] bg-[#e7f3ee] text-[#0b6e4f]" : "border-[#e6e8ef] bg-white text-[#344054]"
              }`}
            >
              {value ? STATUS_LABEL[value] : "All"} · {counts[value]}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-lg border border-[#e6e8ef] bg-white">
            <h2 className="px-4 pt-4">Inbox</h2>
            <table className="w-full text-left">
              <thead className="text-sm text-[#667085]">
                <tr>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setReply("");
                    }}
                    className={`cursor-pointer border-t border-[#eef0f4] ${activeId === item.id ? "bg-[#f3f9f6]" : "hover:bg-[#f5f6fa]"}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1d2939]">{item.name}</p>
                      <p className="text-sm text-[#667085]">{item.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1d2939]">{item.title}</p>
                      <p className="text-sm text-[#667085]">
                        {TYPE_LABEL[item.type]} · {new Date(item.updatedAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={tone(item.status)}>{STATUS_LABEL[item.status]}</Badge>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[#667085]">
                      No feedback in this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="rounded-lg border border-[#e6e8ef] bg-white p-4">
            <h2>Thread</h2>
            {!selected && <p className="mt-3 text-[#667085]">Select a feedback item to read it and reply.</p>}
            {selected && (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-lg font-semibold text-[#1d2939]">{selected.title}</p>
                  <p className="text-sm text-[#667085]">
                    {selected.name} ({selected.email}) · {TYPE_LABEL[selected.type]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["OPEN", "REPLIED", "CLOSED"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatus(status)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                        selected.status === status ? "border-[#0b6e4f] bg-[#0b6e4f] text-white" : "border-[#e6e8ef] bg-white"
                      }`}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {selected.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg px-3 py-2 ${message.role === "ADMIN" ? "border border-[#cfe5db] bg-[#f3f9f6]" : "bg-[#f5f6fa]"}`}
                    >
                      <p className="text-sm font-medium text-[#667085]">
                        {message.role === "ADMIN" ? "Admin" : message.author} · {new Date(message.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[#1d2939]">{message.body}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={4}
                    placeholder="Reply to the user…"
                    className="w-full rounded-lg border border-[#e6e8ef] px-3 py-2.5 text-base outline-none ring-[#0b6e4f] focus:ring-2"
                  />
                  <Button type="button" disabled={!reply.trim()} onClick={sendReply}>
                    Send reply
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </ModuleFrame>
  );
}
