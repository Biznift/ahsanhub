"use client";

import { FormEvent, useEffect, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { SecretInput } from "@/components/secret-input";
import { SupportInbox } from "@/components/support-inbox";
import { Button, Field, TextInput } from "@/components/ui";
import { api } from "@/components/admin-kit";
import { SENDER_HOST, type MailTransport } from "@/lib/mail-transport";

const PRESETS: Array<{
  name: string;
  transport: MailTransport;
  host: string;
  port: number;
  secure: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  hint: string;
}> = [
  {
    name: "Gmail / Google Workspace",
    transport: "smtp",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapSecure: true,
    hint: "Username is your Gmail address. Password is an App Password, not your normal password. Port 587 with STARTTLS works on most networks. If it is blocked, use port 465 and SSL/TLS.",
  },
  {
    name: "Zoho Mail",
    transport: "smtp",
    host: "smtp.zoho.com",
    port: 587,
    secure: false,
    imapHost: "imap.zoho.com",
    imapPort: 993,
    imapSecure: true,
    hint: "Username is your Zoho email. Use an app password if 2FA is on. Accounts on Zoho EU use smtp.zoho.eu and imap.zoho.eu.",
  },
  {
    name: "Outlook / Microsoft 365",
    transport: "smtp",
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    imapHost: "outlook.office365.com",
    imapPort: 993,
    imapSecure: true,
    hint: "Username is the full mailbox address. Microsoft 365 often requires SMTP AUTH to be turned on for the mailbox.",
  },
  {
    name: "Brevo",
    transport: "smtp",
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    hint: "Username and SMTP key are under Brevo → SMTP & API. Brevo only sends mail, so leave IMAP off or point it at a real mailbox such as Gmail.",
  },
  {
    name: "Resend",
    transport: "smtp",
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    hint: "Username is resend. Password is your API key. Resend only sends mail, so replies need a separate IMAP mailbox.",
  },
  {
    name: "Sender",
    transport: "sender",
    host: SENDER_HOST,
    port: 587,
    secure: false,
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    hint: "Paste the API token from Sender → Settings → API access tokens. The from address must be on a domain you verified in Sender. No SMTP host or mailbox password. Replies arrive at the from address.",
  },
];

const CUSTOM_HINT = "Type the SMTP host, port, and security from your mail provider. IMAP can be a different server. Port 587 is usually STARTTLS and port 465 is SSL/TLS. IMAP is usually port 993 with SSL/TLS.";

const EVENTS = [
  { key: "verify", label: "Email verification", description: "Sent after sign-up with a link to confirm the address." },
  { key: "order_placed", label: "Order received", description: "Confirms a new order with its details and a payment link." },
  { key: "payment_reminder", label: "Payment reminder", description: "One reminder 24 hours after an unpaid order." },
  { key: "payment_received", label: "Payment receipt", description: "Sent when a payment is confirmed, with an invoice link." },
  { key: "order_status", label: "Order status updates", description: "Sent when you change an order status." },
  { key: "order_message", label: "Your replies", description: "Sent when you reply to a customer on their order." },
  { key: "feedback_reply", label: "Feedback replies", description: "Sent when you reply to a feedback thread." },
];

type SavedEmail = {
  enabled: boolean;
  transport?: MailTransport;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  hasPassword: boolean;
  fromName: string;
  fromEmail: string;
  imapEnabled: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  inboxName: string;
  events: Record<string, boolean>;
};

export default function EmailPage() {
  const module = moduleBySlug("email");
  const { notify } = useStore();
  const [enabled, setEnabled] = useState(true);
  const [transport, setTransport] = useState<MailTransport>("smtp");
  const [savedTransport, setSavedTransport] = useState<MailTransport>("smtp");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [fromName, setFromName] = useState("Ahsan Hub");
  const [fromEmail, setFromEmail] = useState("");
  const [imapEnabled, setImapEnabled] = useState(false);
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [imapSecure, setImapSecure] = useState(true);
  const [inboxName, setInboxName] = useState("INBOX");
  const [testTo, setTestTo] = useState("");
  const [hint, setHint] = useState(CUSTOM_HINT);
  const [events, setEvents] = useState<Record<string, boolean>>(Object.fromEntries(EVENTS.map((event) => [event.key, true])));
  const [note, setNote] = useState<string | null>(null);
  const [noteOk, setNoteOk] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<SavedEmail>("/api/admin/email")
      .then((saved) => {
        const nextPort = saved.port || 587;
        const nextTransport: MailTransport = saved.transport === "sender" || saved.host === SENDER_HOST ? "sender" : "smtp";
        setEnabled(saved.enabled);
        setTransport(nextTransport);
        setSavedTransport(nextTransport);
        setHost(saved.host);
        setPort(nextPort);
        setSecure(nextPort === 465 ? true : nextPort === 587 || nextPort === 25 || nextPort === 2525 ? false : saved.secure);
        setUsername(saved.username);
        setHasPassword(saved.hasPassword);
        setFromName(saved.fromName);
        setFromEmail(saved.fromEmail);
        const nextImapPort = saved.imapPort || 993;
        setImapEnabled(nextTransport === "sender" ? false : saved.imapEnabled);
        setImapHost(saved.imapHost);
        setImapPort(nextImapPort);
        setImapSecure(nextImapPort === 993 ? true : nextImapPort === 143 ? false : saved.imapSecure);
        setInboxName(saved.inboxName || "INBOX");
        setHint(PRESETS.find((preset) => (nextTransport === "sender" ? preset.transport === "sender" : preset.host === saved.host))?.hint ?? CUSTOM_HINT);
        setEvents((current) => ({ ...current, ...saved.events }));
      })
      .catch(() => undefined);
  }, []);

  const sender = transport === "sender";
  const custom = !sender && !PRESETS.some((preset) => preset.transport === "smtp" && preset.host === host.trim());

  function applySmtpSecurity(ssl: boolean) {
    setSecure(ssl);
    setPort((current) => {
      if (ssl && (current === 587 || current === 25 || current === 2525)) return 465;
      if (!ssl && current === 465) return 587;
      return current;
    });
  }

  function applyImapSecurity(ssl: boolean) {
    setImapSecure(ssl);
    setImapPort((current) => {
      if (ssl && current === 143) return 993;
      if (!ssl && current === 993) return 143;
      return current;
    });
  }

  function chooseCustom() {
    if (!custom) {
      setHost("");
      setPort(587);
      setSecure(false);
      setImapHost("");
      setImapPort(993);
      setImapSecure(true);
      setImapEnabled(true);
    }
    setTransport("smtp");
    setHint(CUSTOM_HINT);
  }

  function draft() {
    return { transport, host, port, secure, username, password, fromName, fromEmail, imapEnabled: sender ? false : imapEnabled, imapHost, imapPort, imapSecure, inboxName };
  }

  function report(message: string, ok: boolean) {
    setNote(message);
    setNoteOk(ok);
    if (ok) notify(message);
  }

  async function probe(kind: "smtp" | "imap" | "send") {
    setBusy(kind);
    try {
      const result = await api<{ detail: string }>("/api/admin/email/verify", {
        method: "POST",
        body: JSON.stringify({ kind, ...draft(), ...(testTo.trim() ? { to: testTo.trim() } : {}) }),
      });
      report(result.detail, true);
    } catch (problem) {
      report((problem as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy("save");
    try {
      const saved = await api<{ hasPassword: boolean }>("/api/admin/email", {
        method: "PUT",
        body: JSON.stringify({ enabled, ...draft(), events }),
      });
      setHasPassword(saved.hasPassword);
      setSavedTransport(transport);
      setPassword("");
      report(sender ? "Saved. The API token stays on the server and is never shown again." : "Saved. The password stays on the server and is never shown again.", true);
    } catch (problem) {
      report((problem as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ModuleFrame module={module}>
      <form onSubmit={save} className="space-y-4">
        <section className="rounded-md border border-[#e6e8ef] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{sender ? "Sender" : "SMTP server"}</h2>
              <p className="mt-1 text-sm text-[#667085]">
                {sender
                  ? "Paste your Sender API token and the from address on your verified domain. Host, port, and a mailbox password are not used."
                  : "Pick a provider or Custom, then enter that server. Port 587 uses STARTTLS. Port 465 uses SSL/TLS."}
              </p>
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
                    setTransport(preset.transport);
                    setHost(preset.host);
                    setPort(preset.port);
                    setSecure(preset.secure);
                    setImapHost(preset.imapHost);
                    setImapPort(preset.imapPort);
                    setImapSecure(preset.imapSecure);
                    setImapEnabled(preset.transport === "sender" ? false : Boolean(preset.imapHost));
                    setHint(preset.hint);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm ${(preset.transport === "sender" ? sender : !sender && host.trim() === preset.host) ? "border-[#0b6e4f] bg-[#e7f3ee] text-[#0b6e4f]" : "border-[#e6e8ef]"}`}
                >
                  {preset.name}
                </button>
              ))}
              <button
                type="button"
                onClick={chooseCustom}
                className={`rounded-full border px-3 py-1.5 text-sm ${custom ? "border-[#0b6e4f] bg-[#e7f3ee] text-[#0b6e4f]" : "border-[#e6e8ef]"}`}
              >
                Custom
              </button>
            </div>
            {hint && <p className="mt-2 text-xs text-[#667085]">{hint}</p>}
          </div>
          <div className={`mt-4 grid gap-3 ${sender ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}>
            {sender ? (
              <div className="sm:col-span-2">
                <Field label="API token">
                  <SecretInput saved={hasPassword && savedTransport === "sender"} value={password} onChange={setPassword} placeholder="Sender API token" />
                </Field>
              </div>
            ) : (
            <div className="sm:col-span-2">
              <Field label="SMTP host">
                <TextInput
                  value={host}
                  placeholder="smtp.yourdomain.com"
                  onChange={(event) => {
                    const next = event.target.value;
                    setHost(next);
                    if (next.trim().toLowerCase() === SENDER_HOST) {
                      setTransport("sender");
                      setImapEnabled(false);
                      setHint(PRESETS.find((preset) => preset.transport === "sender")?.hint ?? CUSTOM_HINT);
                      return;
                    }
                    setTransport("smtp");
                    setHint(PRESETS.find((preset) => preset.transport === "smtp" && preset.host === next.trim())?.hint ?? CUSTOM_HINT);
                  }}
                />
              </Field>
            </div>
            )}
            {!sender && (
            <Field label="Port">
              <TextInput
                type="number"
                value={port}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPort(next);
                  if (next === 465) setSecure(true);
                  if (next === 587 || next === 25 || next === 2525) setSecure(false);
                }}
              />
            </Field>
            )}
            {!sender && (
            <Field label="Security">
              <select
                value={secure ? "ssl" : "starttls"}
                onChange={(event) => applySmtpSecurity(event.target.value === "ssl")}
                className="w-full rounded-lg border border-[#e6e8ef] bg-white px-3 py-2 text-sm"
              >
                <option value="ssl">SSL/TLS</option>
                <option value="starttls">STARTTLS</option>
              </select>
            </Field>
            )}
            {!sender && (
            <div className="sm:col-span-2">
              <Field label="Username">
                <TextInput value={username} onChange={(event) => setUsername(event.target.value)} placeholder="you@example.com" />
              </Field>
            </div>
            )}
            {!sender && (
            <div className="sm:col-span-2">
              <Field label="Password / API key">
                <SecretInput saved={hasPassword} value={password} onChange={setPassword} />
              </Field>
            </div>
            )}
            <div className={sender ? "" : "sm:col-span-2"}>
              <Field label="From name">
                <TextInput value={fromName} onChange={(event) => setFromName(event.target.value)} />
              </Field>
            </div>
            <div className={sender ? "" : "sm:col-span-2"}>
              <Field label="From email">
                <TextInput value={fromEmail} onChange={(event) => setFromEmail(event.target.value)} placeholder="support@example.com" />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#e6e8ef] pt-4">
            <div className="min-w-[220px] flex-1">
              <Field label="Send a test email to">
                <TextInput value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="you@example.com" />
              </Field>
            </div>
            <Button type="button" tone="ghost" disabled={busy !== null} onClick={() => probe("smtp")}>
              {busy === "smtp" ? "Connecting…" : sender ? "Test API token" : "Test SMTP connection"}
            </Button>
            <Button type="button" tone="ghost" disabled={busy !== null} onClick={() => probe("send")}>
              {busy === "send" ? "Sending…" : "Send test email"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[#667085]">
            {sender
              ? "Tests use the token and from address above. Leave the token blank to use the one already saved."
              : "Tests use the fields above. Leave the password blank to use the one already saved."}
          </p>
          {note && <p className={`mt-3 text-sm ${noteOk ? "text-[#12b76a]" : "text-[#b42318]"}`}>{note}</p>}
        </section>

        {!sender && <section className="rounded-md border border-[#e6e8ef] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">IMAP inbox</h2>
              <p className="mt-1 text-sm text-[#667085]">Use the provider preset, or type your own IMAP host. It uses the same username and password as SMTP.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={imapEnabled} onChange={(event) => setImapEnabled(event.target.checked)} />
              {imapEnabled ? "Inbox on" : "Inbox off"}
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Field label="IMAP host">
                <TextInput value={imapHost} onChange={(event) => setImapHost(event.target.value)} placeholder="imap.yourdomain.com" />
              </Field>
            </div>
            <Field label="Port">
              <TextInput
                type="number"
                value={imapPort}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setImapPort(next);
                  if (next === 993) setImapSecure(true);
                  if (next === 143) setImapSecure(false);
                }}
              />
            </Field>
            <Field label="Security">
              <select
                value={imapSecure ? "ssl" : "starttls"}
                onChange={(event) => applyImapSecurity(event.target.value === "ssl")}
                className="w-full rounded-lg border border-[#e6e8ef] bg-white px-3 py-2 text-sm"
              >
                <option value="ssl">SSL/TLS</option>
                <option value="starttls">STARTTLS</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Support inbox name">
                <TextInput value={inboxName} onChange={(event) => setInboxName(event.target.value)} placeholder="INBOX" />
              </Field>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#667085]">
            This is the mailbox on the server. INBOX is the usual name. Anyone who emails {fromEmail || "the from address"}, or replies to mail sent from it, lands there and can be answered below.
          </p>
          <div className="mt-4">
            <Button type="button" tone="ghost" disabled={busy !== null} onClick={() => probe("imap")}>
              {busy === "imap" ? "Connecting…" : "Test IMAP connection"}
            </Button>
          </div>
          {note && <p className={`mt-3 text-sm ${noteOk ? "text-[#12b76a]" : "text-[#b42318]"}`}>{note}</p>}
        </section>}

        <section className="rounded-md border border-[#e6e8ef] bg-white p-5">
          <h2 className="font-semibold">Customer emails</h2>
          <p className="mt-1 text-sm text-[#667085]">Password reset is always sent when email is on. Choose the rest. Replies come back to the from address.</p>
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
        <Button type="submit" disabled={busy !== null}>
          {busy === "save" ? "Saving…" : "Save email settings"}
        </Button>
      </form>
      {!sender && (
      <div className="mt-4">
        <SupportInbox />
      </div>
      )}
    </ModuleFrame>
  );
}
