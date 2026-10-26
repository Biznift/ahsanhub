import { HttpError } from "@/lib/http";

const SENDER_API = "https://api.sender.net/v2";

type SenderBody = {
  message?: string;
  success?: boolean;
  emailId?: string;
  errors?: Record<string, string[] | string>;
};

function flattenErrors(errors: SenderBody["errors"]) {
  if (!errors) return "";
  return Object.entries(errors)
    .flatMap(([key, value]) => {
      const list = Array.isArray(value) ? value : [value];
      return list.filter(Boolean).map((item) => `${key}: ${item}`);
    })
    .slice(0, 4)
    .join(" ");
}

function senderError(status: number, raw: string) {
  let body: SenderBody = {};
  try {
    body = JSON.parse(raw) as SenderBody;
  } catch {
    body = {};
  }
  if (status === 401) return new HttpError(400, "Sender rejected the API token. Create one under Settings → API access tokens.");
  if (status === 429) return new HttpError(400, "Sender is rate limiting requests. Wait a moment and try again.");
  const details = flattenErrors(body.errors);
  const message = (body.message || details || "request failed").replace(/\s+/g, " ").slice(0, 220);
  if (status === 422 && /from/i.test(`${message} ${details}`)) {
    return new HttpError(400, `Sender rejected the from address. Use an email on a domain verified in Sender.${details ? ` ${details}` : ""}`);
  }
  return new HttpError(400, `Sender failed: ${message}`);
}

async function senderFetch(token: string, path: string, init?: { method?: string; body?: unknown }) {
  const trimmed = token.trim();
  if (!trimmed) throw new HttpError(400, "Add the Sender API token.");
  let response: Response;
  try {
    response = await fetch(`${SENDER_API}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${trimmed}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/timeout|aborted/i.test(message)) throw new HttpError(400, "Could not reach Sender. Check this network and try again.");
    throw new HttpError(400, "Could not reach Sender.");
  }
  const raw = await response.text();
  if (!response.ok) throw senderError(response.status, raw);
  if (!raw) return {} as SenderBody;
  try {
    return JSON.parse(raw) as SenderBody;
  } catch {
    return {} as SenderBody;
  }
}

/** Auth docs use this call to prove a bearer token. A 401 means the token is bad. */
export async function verifySenderToken(token: string) {
  await senderFetch(token, "/campaigns/");
  return { ok: true as const, detail: "Sender API token is valid." };
}

function htmlFromText(text: string) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div>${escaped.replace(/\r\n|\n|\r/g, "<br>")}</div>`;
}

export async function sendSenderMail(
  token: string,
  mail: {
    fromEmail: string;
    fromName: string;
    to: string;
    subject: string;
    text: string;
    inReplyTo?: string;
    references?: string;
  },
) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.fromEmail)) {
    throw new HttpError(400, "Enter a from email on a domain verified in Sender.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.to)) throw new HttpError(400, "Enter an email address to send the test to.");
  const headers: Record<string, string> = { "Reply-To": mail.fromEmail };
  if (mail.inReplyTo) headers["In-Reply-To"] = mail.inReplyTo;
  if (mail.references) headers.References = mail.references;
  const body = await senderFetch(token, "/message/send", {
    method: "POST",
    body: {
      from: { email: mail.fromEmail, name: mail.fromName || "Ahsan Hub" },
      to: { email: mail.to },
      subject: mail.subject,
      text: mail.text,
      html: htmlFromText(mail.text),
      headers,
    },
  });
  if (body.success === false) throw new HttpError(400, `Sender failed: ${(body.message || "email was not sent").slice(0, 220)}`);
  return body.emailId || "";
}
