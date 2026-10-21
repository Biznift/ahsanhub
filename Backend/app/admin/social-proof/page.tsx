"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ShoppingBag, UserPlus } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, TextInput } from "@/components/ui";
import { api } from "@/components/admin-kit";

type ProofSettings = {
  enabled: boolean;
  showSeconds: number;
  gapSeconds: number;
  repeat: number;
  lookbackHours: number;
  types: Record<ProofType, boolean>;
};

type ProofType = "signup" | "listing";

type Log = {
  id: string;
  type: ProofType;
  message: string;
  occurredAt: string;
  enabled: boolean;
};

const TYPE_LABEL: Record<ProofType, string> = {
  signup: "Signups",
  listing: "Listings",
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
  const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function EventIcon({ type }: { type: ProofType }) {
  if (type === "listing") return <ShoppingBag size={16} />;
  return <UserPlus size={16} />;
}

export default function SocialProofPage() {
  const module = moduleBySlug("social-proof");
  const { notify } = useStore();
  const [enabled, setEnabled] = useState(true);
  const [showSeconds, setShowSeconds] = useState(5);
  const [gapSeconds, setGapSeconds] = useState(8);
  const [repeat, setRepeat] = useState(1);
  const [lookbackHours, setLookbackHours] = useState(72);
  const [types, setTypes] = useState<Record<ProofType, boolean>>({ signup: true, listing: true });
  const [logs, setLogs] = useState<Log[]>([]);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  const [card, setCard] = useState<Log | null>(null);
  const [visible, setVisible] = useState(false);
  const [playNote, setPlayNote] = useState("Press Play preview to run the cards with the current settings.");

  const queue = useMemo(() => {
    const since = Date.now() - lookbackHours * 60 * 60 * 1000;
    const fresh = logs
      .filter((log) => log.enabled && types[log.type] && new Date(log.occurredAt).getTime() >= since)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    const times = Math.min(5, Math.max(1, repeat || 1));
    return fresh.flatMap((log) => Array.from({ length: times }, () => log));
  }, [logs, types, lookbackHours, repeat]);

  useEffect(() => {
    if (!playing) return;
    if (!enabled || queue.length === 0) {
      setPlaying(false);
      setCard(null);
      setVisible(false);
      setPlayNote(!enabled ? "Social proof is off, so nothing is shown." : "No logs match the current filters.");
      return;
    }
    let index = 0;
    let cancelled = false;
    let timer = 0;
    const showMs = Math.max(1, showSeconds) * 1000;
    const gapMs = Math.max(0, gapSeconds) * 1000;

    const step = () => {
      if (cancelled) return;
      if (index >= queue.length) {
        setVisible(false);
        setCard(null);
        setPlaying(false);
        setPlayNote("Preview finished. Each included log was shown the number of times you set.");
        return;
      }
      setCard(queue[index]);
      setVisible(true);
      setPlayNote(`Showing ${index + 1} of ${queue.length}`);
      index += 1;
      timer = window.setTimeout(() => {
        setVisible(false);
        timer = window.setTimeout(step, gapMs);
      }, showMs);
    };

    step();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playing, run, enabled, queue, showSeconds, gapSeconds]);

  useEffect(() => {
    api<ProofSettings & { logs: Log[] }>("/api/admin/social-proof")
      .then((saved) => {
        setEnabled(saved.enabled);
        setShowSeconds(saved.showSeconds);
        setGapSeconds(saved.gapSeconds);
        setRepeat(saved.repeat);
        setLookbackHours(saved.lookbackHours);
        setTypes(saved.types);
        setLogs(saved.logs);
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/admin/social-proof", {
        method: "PUT",
        body: JSON.stringify({
          enabled,
          showSeconds,
          gapSeconds,
          repeat,
          lookbackHours,
          types,
          logs: logs.map((log) => ({ id: log.id, enabled: log.enabled })),
        }),
      });
      notify("Social proof settings saved");
    } catch (problem) {
      notify((problem as Error).message);
    }
  }

  return (
    <ModuleFrame module={module}>
      <form onSubmit={save} className="space-y-4">
        <section className="rounded-lg border border-[#e6e8ef] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2>Playback</h2>
              <p className="mt-1 text-[#667085]">How the public-site cards appear. Same idea as the activity toaster: one card, then a pause, then the next.</p>
            </div>
            <label className="flex items-center gap-2 font-medium text-[#1d2939]">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              {enabled ? "Social proof on" : "Social proof off"}
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Each card stays (seconds)">
              <TextInput type="number" min={1} max={30} value={showSeconds} onChange={(event) => setShowSeconds(Number(event.target.value))} />
            </Field>
            <Field label="Gap before the next (seconds)">
              <TextInput type="number" min={0} max={120} value={gapSeconds} onChange={(event) => setGapSeconds(Number(event.target.value))} />
            </Field>
            <Field label="Times each log shows">
              <TextInput type="number" min={1} max={5} value={repeat} onChange={(event) => setRepeat(Number(event.target.value))} />
            </Field>
            <Field label="Only logs from the last (hours)">
              <TextInput type="number" min={1} max={168} value={lookbackHours} onChange={(event) => setLookbackHours(Number(event.target.value))} />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-[#e6e8ef] bg-white p-5">
          <h2>What to show</h2>
          <p className="mt-1 text-[#667085]">Turn a kind of activity off and those logs stay out of the feed.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(TYPE_LABEL) as ProofType[]).map((type) => (
              <label key={type} className="flex items-center gap-2 rounded-lg border border-[#e6e8ef] px-3 py-3">
                <input
                  type="checkbox"
                  checked={types[type]}
                  onChange={(event) => setTypes((current) => ({ ...current, [type]: event.target.checked }))}
                />
                <span className="font-medium text-[#1d2939]">{TYPE_LABEL[type]}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#e6e8ef] bg-white p-5">
          <h2>Activity log</h2>
          <p className="mt-1 text-[#667085]">
            {queue.length} card{queue.length === 1 ? "" : "s"} will play with the current filters. New accounts and newly published listings show up here.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-[#667085]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Show</th>
                  <th className="py-2 pr-3 font-medium">Kind</th>
                  <th className="py-2 pr-3 font-medium">Message</th>
                  <th className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {logs
                  .slice()
                  .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
                  .map((log) => (
                    <tr key={log.id} className="border-t border-[#eef0f4]">
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={log.enabled}
                          aria-label={`Show ${log.message}`}
                          onChange={(event) =>
                            setLogs((current) => current.map((item) => (item.id === log.id ? { ...item, enabled: event.target.checked } : item)))
                          }
                        />
                      </td>
                      <td className="py-3 pr-3 text-[#344054]">{TYPE_LABEL[log.type]}</td>
                      <td className="py-3 pr-3 font-medium text-[#1d2939]">{log.message}</td>
                      <td className="py-3 text-sm text-[#667085]">{formatWhen(log.occurredAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-[#e6e8ef] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2>Preview</h2>
              <p className="mt-1 text-[#667085]">{playNote}</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  setPlaying(false);
                  setVisible(false);
                  setCard(null);
                  setPlayNote("Preview stopped.");
                }}
              >
                Stop
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setCard(null);
                  setVisible(false);
                  setPlaying(true);
                  setRun((current) => current + 1);
                }}
              >
                Play preview
              </Button>
            </div>
          </div>
          <div className="relative mt-4 h-36 rounded-lg border border-dashed border-[#cfe5db] bg-[#f3f9f6]">
            <div
              className={`absolute bottom-3 right-3 w-[min(100%,22rem)] max-w-[calc(100%-1.5rem)] rounded-xl border border-[#e6e8ef] bg-white p-3.5 shadow-lg transition-all duration-300 ${
                visible && card ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
              }`}
            >
              {card && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f3ee] text-[#0b6e4f]">
                    <EventIcon type={card.type} />
                  </div>
                  <div>
                    <p className="font-medium leading-snug text-[#1d2939]">{card.message}</p>
                    <p className="mt-1 text-sm text-[#667085]">{formatWhen(card.occurredAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <Button type="submit">Save social proof</Button>
      </form>
    </ModuleFrame>
  );
}
