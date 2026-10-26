import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { deliverEmail, imapMode, ipv4Address, mailFailure, resolveMailAccount, type MailAccount, type MailOverride } from "@/lib/mailer";
import { assertMailHost, readEmail } from "@/lib/ops";
import { alert } from "@/lib/telegram";

type FetchedMail = {
  messageId: string;
  inReplyTo: string;
  referenceIds: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  subject: string;
  body: string;
  date: Date;
};

function addresses(value: AddressObject | AddressObject[] | undefined) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .flatMap((item) => item.value)
    .map((entry) => ({ name: (entry.name || "").slice(0, 120), email: (entry.address || "").trim().toLowerCase().slice(0, 200) }))
    .filter((entry) => entry.email.includes("@"));
}

function bareSubject(subject: string) {
  let next = subject.trim();
  let previous = "";
  while (next !== previous) {
    previous = next;
    next = next.replace(/^(re|fw|fwd|aw)\s*:\s*/i, "").trim();
  }
  return next.toLowerCase().slice(0, 180);
}

function textOf(parsed: ParsedMail) {
  const plain = parsed.text?.replace(/\u0000/g, "").trim();
  const names = (parsed.attachments ?? []).map((file) => file.filename).filter((name): name is string => Boolean(name));
  const files = names.length ? `\n\nAttachments: ${names.join(", ")}` : "";
  if (plain) return `${plain.slice(0, 20_000)}${files}`.trim();
  const html = typeof parsed.html === "string" ? parsed.html : "";
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${stripped.slice(0, 20_000)}${files}`.trim() || "(This email has no text.)";
}

function cleanId(value: string | null | undefined) {
  return (value || "").replace(/[<>\s]/g, "").slice(0, 900);
}

function headerId(value: string | null | undefined) {
  const clean = cleanId(value);
  return clean ? `<${clean}>` : undefined;
}

function when(date: Date | undefined) {
  if (!date || Number.isNaN(date.getTime())) return new Date();
  if (date.getTime() > Date.now() + 60_000) return new Date();
  return date;
}

function assertImapReady(account: MailAccount) {
  assertMailHost(account.imapHost);
  if (!account.imapHost) throw new HttpError(400, "Add the IMAP host.");
  if (!account.username || !account.password) throw new HttpError(400, "IMAP uses the SMTP username and password. Add both first.");
  if (!account.inboxName) throw new HttpError(400, "Add the support inbox name. INBOX is the usual one.");
}

async function imapClient(account: MailAccount, verifyOnly = false) {
  assertImapReady(account);
  const address = await ipv4Address(account.imapHost);
  return new ImapFlow({
    host: address,
    port: account.imapPort,
    secure: imapMode(account.imapPort, account.imapSecure),
    servername: account.imapHost,
    auth: { user: account.username, pass: account.password },
    logger: false,
    disableAutoIdle: true,
    verifyOnly,
    includeMailboxes: verifyOnly,
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    tls: { servername: account.imapHost, minVersion: "TLSv1.2" },
  });
}

function sameBox(box: { path: string; name: string; specialUse?: string }, wanted: string) {
  const name = wanted.toLowerCase();
  return box.path.toLowerCase() === name || box.name.toLowerCase() === name || (name === "inbox" && box.specialUse === "\\Inbox");
}

export async function verifyImap(over: MailOverride = {}) {
  const account = await resolveMailAccount(over);
  const client = await imapClient(account, true);
  try {
    await client.connect();
  } catch (error) {
    if (!(error instanceof HttpError)) console.error("IMAP verify failed", error instanceof Error ? error.message : "unknown");
    throw mailFailure(error, "IMAP", account.imapHost);
  }
  const boxes = client.mailboxList ?? [];
  if (boxes.length && !boxes.some((box) => sameBox(box, account.inboxName))) {
    const names = boxes
      .filter((box) => !box.flags.has("\\Noselect"))
      .map((box) => box.path)
      .slice(0, 12);
    throw new HttpError(400, `Connected, but "${account.inboxName}" is not a mailbox. Try one of: ${names.join(", ") || "INBOX"}.`);
  }
  return { ok: true as const, detail: `IMAP connected. Mail in "${account.inboxName}" can be answered from this page.` };
}

async function openBox(client: ImapFlow, wanted: string, host: string) {
  try {
    return await client.getMailboxLock(wanted);
  } catch (error) {
    const boxes = await client.list().catch(() => []);
    const match = boxes.find((box) => sameBox(box, wanted));
    if (match) return client.getMailboxLock(match.path);
    if (!boxes.length) throw mailFailure(error, "IMAP", host);
    const names = boxes
      .filter((box) => !box.flags.has("\\Noselect"))
      .map((box) => box.path)
      .slice(0, 12);
    throw new HttpError(400, `Inbox "${wanted}" was not found. This account has: ${names.join(", ")}.`);
  }
}

async function fetchMailbox(account: MailAccount) {
  const client = await imapClient(account);
  const found: FetchedMail[] = [];
  try {
    try {
      await client.connect();
    } catch (error) {
      throw mailFailure(error, "IMAP", account.imapHost);
    }
    const lock = await openBox(client, account.inboxName, account.imapHost);
    try {
      const box = client.mailbox;
      const exists = box && typeof box !== "boolean" ? box.exists : 0;
      if (!exists) return found;
      const start = Math.max(1, exists - 39);
      for await (const message of client.fetch(`${start}:*`, { uid: true, source: true })) {
        if (!message.source) continue;
        try {
          const parsed = await simpleParser(message.source);
          const from = addresses(parsed.from)[0];
          if (!from) continue;
          const tos = addresses(parsed.to);
          const ours = account.fromEmail.toLowerCase();
          const externalTo = tos.find((item) => item.email !== ours) ?? tos[0];
          const refs = (Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [])
            .map((item) => cleanId(item))
            .filter(Boolean)
            .join(" ")
            .slice(0, 2000);
          found.push({
            messageId: cleanId(parsed.messageId) || `uid:${account.inboxName}:${message.uid}`,
            inReplyTo: cleanId(parsed.inReplyTo),
            referenceIds: refs,
            fromName: from.name,
            fromEmail: from.email,
            toName: externalTo?.name || "",
            toEmail: externalTo?.email || "",
            subject: (parsed.subject || "(no subject)").replace(/\s+/g, " ").trim().slice(0, 300) || "(no subject)",
            body: message.source.length > 2_000_000 ? "(This email is too large to show here.)" : textOf(parsed),
            date: when(parsed.date),
          });
        } catch (error) {
          console.error("Skipped an inbox message", error instanceof Error ? error.message : "unknown");
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return found;
}

export async function syncInbox() {
  const settings = await readEmail();
  if (!settings.imapEnabled) throw new HttpError(400, "Turn on IMAP, set the support inbox name, and save.");
  const account = await resolveMailAccount();
  const messages = await fetchMailbox(account);
  const ours = account.fromEmail.toLowerCase();
  let imported = 0;
  for (const mail of messages) {
    const already = await db.supportMessage.findUnique({ where: { messageId: mail.messageId } });
    if (already) continue;
    const inbound = mail.fromEmail !== ours;
    const peer = inbound ? { name: mail.fromName, email: mail.fromEmail } : { name: mail.toName, email: mail.toEmail };
    if (!peer.email || peer.email === ours) continue;
    const ids = [mail.inReplyTo, ...mail.referenceIds.split(/\s+/)].map((item) => item.trim()).filter(Boolean);
    const prior = ids.length ? await db.supportMessage.findFirst({ where: { messageId: { in: ids } }, select: { threadId: true } }) : null;
    let threadId = prior?.threadId ?? "";
    if (!threadId) {
      const subjectKey = bareSubject(mail.subject);
      if (subjectKey) {
        const candidates = await db.supportThread.findMany({
          where: { peerEmail: peer.email },
          orderBy: { lastMessageAt: "desc" },
          take: 15,
          select: { id: true, subject: true },
        });
        threadId = candidates.find((item) => bareSubject(item.subject) === subjectKey)?.id ?? "";
      }
    }
    try {
      if (!threadId) {
        const created = await db.supportThread.create({
          data: {
            subject: mail.subject,
            peerName: peer.name,
            peerEmail: peer.email,
            mailbox: account.inboxName,
            status: inbound ? "OPEN" : "REPLIED",
            unread: inbound,
            lastMessageAt: mail.date,
          },
        });
        threadId = created.id;
      } else {
        const current = await db.supportThread.findUnique({ where: { id: threadId }, select: { lastMessageAt: true } });
        const newest = !current || mail.date >= current.lastMessageAt;
        await db.supportThread.update({
          where: { id: threadId },
          data: {
            peerName: peer.name || undefined,
            mailbox: account.inboxName,
            lastMessageAt: newest ? mail.date : undefined,
            status: inbound && newest ? "OPEN" : undefined,
            unread: inbound && newest ? true : undefined,
          },
        });
        if (!inbound) {
          const duplicate = await db.supportMessage.findFirst({ where: { threadId, direction: "out", body: mail.body }, select: { id: true } });
          if (duplicate) continue;
        }
      }
      await db.supportMessage.create({
        data: {
          threadId,
          direction: inbound ? "in" : "out",
          fromName: mail.fromName,
          fromEmail: mail.fromEmail,
          toEmail: mail.toEmail,
          subject: mail.subject,
          body: mail.body,
          messageId: mail.messageId,
          inReplyTo: mail.inReplyTo,
          referenceIds: mail.referenceIds,
          createdAt: mail.date,
        },
      });
      imported += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { imported, scanned: messages.length };
}

export async function listInbox() {
  const settings = await readEmail();
  const rows = await db.supportThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 40,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 40 } },
  });
  return {
    configured: Boolean(settings.imapEnabled && settings.imapHost && settings.username && settings.passwordSeal),
    sending: settings.enabled,
    inboxName: settings.inboxName || "INBOX",
    address: settings.fromEmail,
    items: rows.map((thread) => ({
      id: thread.id,
      subject: thread.subject,
      peerName: thread.peerName,
      peerEmail: thread.peerEmail,
      status: thread.status,
      unread: thread.unread,
      lastMessageAt: thread.lastMessageAt.toISOString(),
      messages: [...thread.messages].reverse().map((message) => ({
        id: message.id,
        direction: message.direction,
        fromName: message.fromName,
        fromEmail: message.fromEmail,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    })),
  };
}

export async function markInboxRead(id: string) {
  const thread = await db.supportThread.findUnique({ where: { id } });
  if (!thread) throw new HttpError(404, "That conversation was not found.");
  await db.supportThread.update({ where: { id }, data: { unread: false } });
}

export async function replyToInbox(id: string, body: string) {
  const thread = await db.supportThread.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 12 } },
  });
  if (!thread) throw new HttpError(404, "That conversation was not found.");
  const settings = await readEmail();
  if (!settings.enabled) throw new HttpError(400, "Turn on email sending before replying.");
  const lastIn = thread.messages.find((message) => message.direction === "in" && message.messageId);
  const subject = /^re\s*:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`;
  const references = [lastIn?.referenceIds, lastIn?.messageId]
    .flatMap((value) => (value || "").split(/\s+/))
    .map((value) => headerId(value))
    .filter((value): value is string => Boolean(value))
    .join(" ");
  let messageId = "";
  try {
    messageId = await deliverEmail(thread.peerEmail, subject, body, {
      inReplyTo: headerId(lastIn?.messageId),
      references: references || undefined,
    });
  } catch (error) {
    alert("email.failed", `A support inbox reply to ${thread.peerEmail} could not be sent.`);
    throw error;
  }
  const account = await resolveMailAccount();
  const message = await db.supportMessage.create({
    data: {
      threadId: id,
      direction: "out",
      fromName: account.fromName,
      fromEmail: account.fromEmail,
      toEmail: thread.peerEmail,
      subject,
      body,
      messageId: cleanId(messageId) || undefined,
      inReplyTo: lastIn?.messageId || "",
      referenceIds: references,
    },
  });
  await db.supportThread.update({ where: { id }, data: { status: "REPLIED", unread: false, lastMessageAt: new Date() } });
  return {
    id: message.id,
    direction: message.direction,
    fromName: message.fromName,
    fromEmail: message.fromEmail,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}
