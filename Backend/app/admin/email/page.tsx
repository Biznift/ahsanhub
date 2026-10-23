"use client";

import { FormEvent, useEffect, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { SecretInput } from "@/components/secret-input";
import { Button, Field, TextInput } from "@/components/ui";
import { api } from "@/components/admin-kit";

const PRESETS = [
  { name: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 465, secure: true, hint: "Username is your Gmail address. Password is an App Password." },
  { name: "Brevo", host: "smtp-relay.brevo.com", port: 587, secure: false, hint: "Username and SMTP key are under Brevo → SMTP & API." },
  { name: "Resend", host: "smtp.resend.com", port: 465, secure: true, hint: "Username is resend. Password is your API key." },
  { name: "Zoho Mail", host: "smtp.zoho.com", port: 465, secure: true, hint: "Username is your Zoho email. Use an app password if 2FA is on." },
];

const EVENTS = [
  { key: "verify", label: "Email verification", description: "Sent after sign-up with a link to confirm the address." },
  { key: "order_placed", label: "Order received", description: "Confirms a new order with its details and a payment link." },
  { key: "payment_reminder", label: "Payment reminder", description: "One reminder 24 hours after an unpaid order." },
  { key: "payment_received", label: "Payment receipt", description: "Sent when a payment is confirmed, with an invoice link." },
  { key: "order_status", label: "Order status updates", description: "Sent when you change an order status." },
  { key: "order_message", label: "Your replies", description: "Sent when you reply to a customer on their order." },
  { key: "feedback_reply", label: "Feedback replies", description: "Sent when you reply to a feedback thread." },
];

export default function EmailPage() {
  const module = moduleBySlug("email");
  const { notify } = useStore();
  const [enabled, setEnabled] = useState(true);
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(465);
  const [secure, setSecure] = useState(true);
  const [username, setUsername] = useState("hello@example.com");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [fromName, setFromName] = useState("Ahsan Hub");
  const [fromEmail, setFromEmail] = useState("");
  const [testTo, setTestTo] = useState("");
  const [hint, setHint] = useState(PRESETS[0].hint);
  const [events, setEvents] = useState<Record<string, boolean>>(Object.fromEntries(EVENTS.map((event) => [event.key, true])));
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    api<{
      enabled: boolean;
      host: string;
      port: number;
      secure: boolean;
      username: string;
      hasPassword: boolean;
      fromName: string;
      fromEmail: string;
      events: Record<string, boolean>;
    }>("/api/admin/email")
      .then((saved) => {
        setEnabled(saved.enabled);
        setHost(saved.host);
        setPort(saved.port);
        setSecure(saved.secure);
        setUsername(saved.username);
        setHasPassword(saved.hasPassword);
        setFromName(saved.fromName);
        setFromEmail(saved.fromEmail);
        setEvents((current) => ({ ...current, ...saved.events }));
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = await api<{ hasPassword: boolean }>("/api/admin/email", {
        method: "PUT",
        body: JSON.stringify({ enabled, host, port, secure, username, password, fromName, fromEmail, events }),
      });
      setHasPassword(saved.hasPassword);
      setPassword("");
      notify("Email settings saved");
      setNote("Saved. The password stays on the server and is never shown again.");
    } catch (problem) {
      setNote((problem as Error).message);
    }
  }

  return (
    <ModuleFrame module={module}>
      <form onSubmit={save} className="space-y-4">
        <section className="rounded-md border border-[#e6e8ef] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">SMTP server</h2>
              <p className="mt-1 text-sm text-[#667085]">Works with any provider that offers SMTP.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              {enabled ? "Sending on" : "Sending off"}
            </label>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#667085]">Quick setup</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setHost(preset.host);
                    setPort(preset.port);
                    setSecure(preset.secure);
                    setHint(preset.hint);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm ${host === preset.host ? "border-[#0b6e4f] bg-[#e7f3ee] text-[#0b6e4f]" : "border-[#e6e8ef]"}`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            {hint && <p className="mt-2 text-xs text-[#667085]">{hint}</p>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Field label="SMTP host">
                <TextInput value={host} onChange={(event) => setHost(event.target.value)} />
              </Field>
            </div>
            <Field label="Port">
              <TextInput type="number" value={port} onChange={(event) => setPort(Number(event.target.value))} />
            </Field>
            <Field label="Security">
              <select
                value={secure ? "ssl" : "starttls"}
                onChange={(event) => setSecure(event.target.value === "ssl")}
                className="w-full rounded-lg border border-[#e6e8ef] bg-white px-3 py-2 text-sm"
              >
                <option value="ssl">SSL/TLS (465)</option>
                <option value="starttls">STARTTLS (587)</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Username">
                <TextInput value={username} onChange={(event) => setUsername(event.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Password / API key">
                <SecretInput saved={hasPassword} value={password} onChange={setPassword} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="From name">
                <TextInput value={fromName} onChange={(event) => setFromName(event.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="From email">
                <TextInput value={fromEmail} onChange={(event) => setFromEmail(event.target.value)} />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#e6e8ef] pt-4">
            <div className="min-w-[220px] flex-1">
              <Field label="Send a test email to">
                <TextInput value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="you@example.com" />
              </Field>
            </div>
            <Button
              type="button"
              tone="ghost"
              onClick={async () => {
                const to = testTo.trim();
                try {
                  const result = await api<{ to: string }>("/api/admin/email/test", { method: "POST", body: JSON.stringify(to ? { to } : {}) });
                  notify(`Test email sent to ${result.to}`);
                  setNote(`Test email sent to ${result.to}.`);
                } catch (problem) {
                  setNote((problem as Error).message);
                }
              }}
            >
              Send test email
            </Button>
          </div>
          {note && <p className="mt-3 text-sm text-[#12b76a]">{note}</p>}
        </section>

        <section className="rounded-md border border-[#e6e8ef] bg-white p-5">
          <h2 className="font-semibold">Customer emails</h2>
          <p className="mt-1 text-sm text-[#667085]">Password reset is always sent when email is on. Choose the rest.</p>
          <ul className="mt-4 divide-y divide-[#e6e8ef] rounded-md border border-[#e6e8ef]">
            {EVENTS.map((item) => (
              <li key={item.key} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-[#667085]">{item.description}</span>
                </span>
                <input
                  type="checkbox"
                  checked={events[item.key]}
                  onChange={(event) => setEvents((current) => ({ ...current, [item.key]: event.target.checked }))}
                />
              </li>
            ))}
          </ul>
        </section>
        <Button type="submit">Save email settings</Button>
      </form>
    </ModuleFrame>
  );
}
