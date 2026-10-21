import nodemailer from "nodemailer";
import { HttpError } from "@/lib/http";
import { assertMailHost, readEmail } from "@/lib/ops";
import { openSeal } from "@/lib/secrets";

export async function deliverEmail(to: string, subject: string, text: string) {
  const settings = await readEmail();
  if (!settings.enabled) throw new HttpError(400, "Email sending is turned off.");
  assertMailHost(settings.host);
  const password = openSeal(settings.passwordSeal);
  if (!settings.host || !settings.fromEmail || !password) throw new HttpError(400, "Save the SMTP host, from address, and password first.");
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.username ? { user: settings.username, pass: password } : undefined,
    connectionTimeout: 8000,
    socketTimeout: 8000,
  });
  await transport.sendMail({
    from: { name: settings.fromName || "Ahsan Hub", address: settings.fromEmail },
    to,
    subject,
    text,
  });
}

export async function emailEnabled(event?: string) {
  const settings = await readEmail();
  if (!settings.enabled || !settings.passwordSeal || !settings.host || !settings.fromEmail) return false;
  if (event && settings.events[event] === false) return false;
  return true;
}
