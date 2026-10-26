import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import { HttpError } from "@/lib/http";
import { mailTransport, SENDER_HOST, type MailTransport } from "@/lib/mail-transport";
import { assertMailHost, cleanInboxName, readEmail, type StoredEmail } from "@/lib/ops";
import { openSeal } from "@/lib/secrets";
import { sendSenderMail, verifySenderToken } from "@/lib/sender";

export type MailOverride = {
  transport?: MailTransport;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  inboxName?: string;
};

export type MailAccount = {
  transport: MailTransport;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  inboxName: string;
};

type MailHeaders = {
  inReplyTo?: string;
  references?: string;
  html?: string;
};

/** App passwords are shown in groups of four. Servers expect them without spaces. */
export function normalizeSecret(password: string, host: string) {
  const trimmed = password.trim();
  if (!trimmed) return "";
  if (/gmail|googlemail|google\.com/i.test(host) || /^[a-z0-9]{4}(?:\s+[a-z0-9]{4}){3}$/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, "");
  }
  return trimmed;
}

/** Port 465 is implicit TLS. Port 587 and 2525 are plain until STARTTLS. */
export function smtpMode(port: number, secure: boolean) {
  if (port === 465) return { secure: true, requireTLS: false };
  if (port === 587 || port === 2525) return { secure: false, requireTLS: true };
  if (port === 25) return { secure: false, requireTLS: false };
  return { secure, requireTLS: !secure };
}

export function imapMode(port: number, secure: boolean) {
  if (port === 993) return true;
  if (port === 143) return false;
  return secure;
}

/** App-password advice only for hosts that actually require one. */
function authHint(host: string) {
  const name = host.trim().toLowerCase();
  if (/gmail|googlemail/.test(name) || name === "google.com" || name.endsWith(".google.com")) {
    return "Gmail needs an app password, not the normal Gmail password.";
  }
  if (name.includes("zoho.")) return "Zoho needs an app password when two-factor authentication is on.";
  if (name) return `Check the mailbox address and password on ${name}.`;
  return "Check the mailbox address and password.";
}

export function mailFailure(error: unknown, kind: "SMTP" | "IMAP", host = "") {
  if (error instanceof HttpError) return error;
  const err = error as { code?: string; responseCode?: number; message?: string; response?: string; authenticationFailed?: boolean };
  const text = `${err.code ?? ""} ${err.message ?? ""} ${err.response ?? ""}`.toLowerCase();
  if (err.code === "EAUTH" || err.authenticationFailed || err.responseCode === 535 || /invalid login|authentication failed|username and password|application-specific password|bad credentials/.test(text)) {
    const code = err.responseCode ? ` (${err.responseCode})` : "";
    return new HttpError(400, `${kind} rejected the username or password${code}. ${authHint(host)}`);
  }
  if (/wrong version number|packet length too long|ssl routines|eproto/.test(text)) {
    return new HttpError(400, `${kind} security does not match the port. Use SSL/TLS on 465 for SMTP and 993 for IMAP. Use STARTTLS on 587.`);
  }
  if (err.code === "EDNS" || err.code === "ENOTFOUND" || /getaddrinfo/.test(text)) {
    return new HttpError(400, `The ${kind} host could not be found. Check the hostname.`);
  }
  if (
    err.code === "ETIMEDOUT" ||
    err.code === "ECONNECTION" ||
    err.code === "ESOCKET" ||
    err.code === "ECONNREFUSED" ||
    err.code === "ECONNRESET" ||
    err.code === "CONNECT_TIMEOUT" ||
    /timed out|timeout|econnrefused/.test(text)
  ) {
    const hint = kind === "SMTP" ? " If 465 does not connect, use port 587 and STARTTLS." : " IMAP usually uses port 993 with SSL/TLS.";
    return new HttpError(400, `Could not reach the ${kind} server. Check the host and port, and that this network allows outbound mail.${hint}`);
  }
  if (/certificate|self signed|unable to verify|altname/.test(text)) {
    return new HttpError(400, `The ${kind} certificate could not be verified. Check the hostname.`);
  }
  const safe = (err.response || err.message || "connection failed").replace(/\s+/g, " ").slice(0, 220);
  return new HttpError(400, `${kind} failed: ${safe}`);
}

function ehloName(fromEmail: string, host: string) {
  const domain = fromEmail.split("@")[1]?.trim().toLowerCase() ?? "";
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return domain;
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return host;
  return "localhost";
}

/** Prefer IPv4. A broken IPv6 route otherwise burns the whole SMTP timeout on Windows. */
export async function ipv4Address(host: string) {
  if (isIP(host)) return host;
  try {
    const found = await Promise.race([
      lookup(host, { family: 4, all: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("dns")), 5000)),
    ]);
    return found[0]?.address || host;
  } catch {
    return host;
  }
}

export async function resolveMailAccount(over: MailOverride = {}): Promise<MailAccount> {
  const saved = await readEmail();
  const requestedHost = (over.host ?? saved.host).trim();
  const transport = mailTransport({ transport: over.transport ?? saved.transport, host: requestedHost });
  const host = transport === "sender" ? SENDER_HOST : requestedHost;
  const typed = over.password?.trim() ?? "";
  let password = "";
  if (typed) password = normalizeSecret(typed, host);
  else if (saved.passwordSeal) {
    const opened = openSeal(saved.passwordSeal);
    if (!opened) throw new HttpError(400, "The saved password could not be read. Type it again and save.");
    password = normalizeSecret(opened, host);
  }
  return {
    transport,
    host,
    port: over.port ?? saved.port,
    secure: over.secure ?? saved.secure,
    username: (over.username ?? saved.username).trim(),
    password,
    fromName: (over.fromName ?? saved.fromName).trim() || "Ahsan Hub",
    fromEmail: (over.fromEmail ?? saved.fromEmail).trim(),
    imapHost: (over.imapHost ?? saved.imapHost).trim(),
    imapPort: over.imapPort ?? saved.imapPort,
    imapSecure: over.imapSecure ?? saved.imapSecure,
    inboxName: cleanInboxName(over.inboxName ?? saved.inboxName),
  };
}

function assertSmtpReady(account: MailAccount) {
  assertMailHost(account.host);
  if (!account.host || !account.fromEmail || !account.password) {
    throw new HttpError(400, "Add the SMTP host, the from address, and the password.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.fromEmail)) throw new HttpError(400, "Enter a valid from email.");
  if (!account.username) throw new HttpError(400, "Add the SMTP username. It is usually the full email address.");
}

async function createSmtp(account: MailAccount) {
  assertSmtpReady(account);
  const mode = smtpMode(account.port, account.secure);
  const address = await ipv4Address(account.host);
  return nodemailer.createTransport({
    host: address,
    port: account.port,
    secure: mode.secure,
    requireTLS: mode.requireTLS,
    name: ehloName(account.fromEmail, account.host),
    auth: { user: account.username, pass: account.password },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: { servername: account.host, minVersion: "TLSv1.2" },
    servername: account.host,
  } as Parameters<typeof nodemailer.createTransport>[0]);
}

async function sendThrough(account: MailAccount, to: string, subject: string, text: string, headers?: MailHeaders) {
  const transport = await createSmtp(account);
  try {
    const info = await transport.sendMail({
      from: { name: account.fromName || "Ahsan Hub", address: account.fromEmail },
      to,
      subject,
      text,
      html: headers?.html,
      replyTo: account.fromEmail,
      inReplyTo: headers?.inReplyTo,
      references: headers?.references,
    });
    return info.messageId || "";
  } catch (error) {
    if (!(error instanceof HttpError)) console.error("SMTP send failed", error instanceof Error ? error.message : "unknown");
    throw mailFailure(error, "SMTP", account.host);
  } finally {
    transport.close();
  }
}

async function sendWithAccount(account: MailAccount, to: string, subject: string, text: string, headers?: MailHeaders) {
  if (account.transport === "sender") {
    return sendSenderMail(account.password, {
      fromEmail: account.fromEmail,
      fromName: account.fromName,
      to,
      subject,
      text,
      html: headers?.html,
      inReplyTo: headers?.inReplyTo,
      references: headers?.references,
    });
  }
  return sendThrough(account, to, subject, text, headers);
}

export async function probeSmtp(over: MailOverride, to?: string, send = false) {
  const account = await resolveMailAccount(over);
  if (account.transport === "sender") {
    if (!account.password) throw new HttpError(400, "Add the Sender API token.");
    if (!send) return verifySenderToken(account.password);
    const target = to?.trim() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) throw new HttpError(400, "Enter an email address to send the test to.");
    await sendSenderMail(account.password, {
      fromEmail: account.fromEmail,
      fromName: account.fromName,
      to: target,
      subject: "Ahsan Hub test email",
      text: "This is a test from the Ahsan Hub admin. If you can read it, Sender is working.",
    });
    return { ok: true as const, detail: `Test email sent to ${target}.`, to: target };
  }
  const mode = smtpMode(account.port, account.secure);
  if (!send) {
    const transport = await createSmtp(account);
    try {
      await transport.verify();
    } catch (error) {
      if (!(error instanceof HttpError)) console.error("SMTP verify failed", error instanceof Error ? error.message : "unknown");
      throw mailFailure(error, "SMTP", account.host);
    } finally {
      transport.close();
    }
    const security = mode.secure ? "SSL/TLS" : mode.requireTLS ? "STARTTLS" : "plain";
    return { ok: true as const, detail: `SMTP connected to ${account.host}:${account.port} (${security}).` };
  }
  const target = to?.trim() || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) throw new HttpError(400, "Enter an email address to send the test to.");
  await sendThrough(account, target, "Ahsan Hub test email", "This is a test from the Ahsan Hub admin. If you can read it, SMTP is working.");
  return { ok: true as const, detail: `Test email sent to ${target}.`, to: target };
}

export async function deliverEmail(to: string, subject: string, text: string, headers?: MailHeaders) {
  const settings = await readEmail();
  if (!settings.enabled) throw new HttpError(400, "Email sending is turned off.");
  const account = await resolveMailAccount();
  return sendWithAccount(account, to, subject, text, headers);
}

export async function emailEnabled(event?: string) {
  const settings: StoredEmail = await readEmail();
  if (!settings.enabled || !settings.passwordSeal || !settings.fromEmail) return false;
  if (settings.transport !== "sender" && !settings.host) return false;
  if (event && settings.events[event] === false) return false;
  return true;
}
