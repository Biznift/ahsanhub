import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { normalizeUrl } from "@/lib/directory";
import { readSite } from "@/lib/site";
import { isPinnedNav, navModules } from "@/lib/catalog";

const emailField = z.string().trim().max(120).refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email");

export const generalSchema = z.object({
  contactEmail: emailField,
  theme: z.enum(["light", "dark", "system"]),
  maintenance: z.boolean(),
  youtube: z.string().trim().max(300),
  facebook: z.string().trim().max(300),
  linkedin: z.string().trim().max(300),
  tiktok: z.string().trim().max(300),
  whatsapp: z.string().trim().max(20),
  whatsappMessage: z.string().trim().max(200),
  gaId: z.string().trim().max(30),
  pixelId: z.string().trim().max(20),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(200),
  invoiceNote: z.string().trim().max(500),
  hiddenSlugs: z.array(z.string().trim().max(40)).max(40).optional(),
});

export type GeneralSettings = z.infer<typeof generalSchema> & { hiddenSlugs: string[] };

export const DEFAULT_GENERAL: GeneralSettings = {
  contactEmail: "",
  theme: "system",
  maintenance: false,
  youtube: "",
  facebook: "",
  linkedin: "",
  tiktok: "",
  whatsapp: "",
  whatsappMessage: "Hi! I found you on Ahsan Hub.",
  gaId: "",
  pixelId: "",
  phone: "",
  address: "",
  invoiceNote: "",
  hiddenSlugs: [],
};

const EMAIL_EVENTS = ["verify", "order_placed", "payment_reminder", "payment_received", "order_status", "order_message", "feedback_reply"] as const;

export const emailInputSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(200),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().max(200),
  password: z.string().max(200).optional(),
  fromName: z.string().trim().max(80),
  fromEmail: emailField,
  events: z.record(z.string(), z.boolean()),
});

export type StoredEmail = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordSeal: string;
  fromName: string;
  fromEmail: string;
  events: Record<string, boolean>;
};

export const DEFAULT_EMAIL: StoredEmail = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  username: "",
  passwordSeal: "",
  fromName: "Ahsan Hub",
  fromEmail: "",
  events: Object.fromEntries(EMAIL_EVENTS.map((key) => [key, key === "verify" || key === "feedback_reply"])),
};

const TELEGRAM_EVENTS = [
  "order.created",
  "payment.paid",
  "payment.failed",
  "review.created",
  "listing.submitted",
  "listing.published",
  "user.registered",
  "inquiry.created",
  "admin.login",
  "admin.login_failed",
  "backup.restored",
  "system.error",
  "email.failed",
  "backup.auto_failed",
] as const;

export const telegramInputSchema = z.object({
  enabled: z.boolean(),
  token: z.string().max(200).optional(),
  chatId: z.string().trim().max(40),
  events: z.record(z.string(), z.boolean()),
});

export type StoredTelegram = {
  enabled: boolean;
  tokenSeal: string;
  chatId: string;
  botUsername: string;
  events: Record<string, boolean>;
};

export const DEFAULT_TELEGRAM: StoredTelegram = {
  enabled: false,
  tokenSeal: "",
  chatId: "",
  botUsername: "",
  events: Object.fromEntries(TELEGRAM_EVENTS.map((key) => [key, key !== "backup.auto_failed"])),
};

export const proofSchema = z.object({
  enabled: z.boolean(),
  showSeconds: z.number().int().min(1).max(30),
  gapSeconds: z.number().int().min(0).max(120),
  repeat: z.number().int().min(1).max(5),
  lookbackHours: z.number().int().min(1).max(168),
  types: z.object({ signup: z.boolean(), listing: z.boolean() }),
  logs: z.array(z.object({ id: z.string(), enabled: z.boolean() })).max(500).optional(),
});

export type ProofSettings = {
  enabled: boolean;
  showSeconds: number;
  gapSeconds: number;
  repeat: number;
  lookbackHours: number;
  types: { signup: boolean; listing: boolean };
};

export const DEFAULT_PROOF: ProofSettings = {
  enabled: true,
  showSeconds: 5,
  gapSeconds: 8,
  repeat: 1,
  lookbackHours: 72,
  types: { signup: true, listing: true },
};

async function readJson<T>(key: string, fallback: T, parse: (value: unknown) => T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return parse(row.value);
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  const json = value as object;
  await db.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}

function knownSlugs(slugs: string[]) {
  const known = new Set(navModules().map((item) => item.slug));
  return [...new Set(slugs.filter((slug) => known.has(slug) && !isPinnedNav(slug)))];
}

function fromSite(site: { contactEmail: string; socials: Record<string, string> }): GeneralSettings {
  const whatsapp = site.socials.whatsapp?.match(/wa\.me\/(\d{8,15})/)?.[1] ?? "";
  return {
    ...DEFAULT_GENERAL,
    contactEmail: site.contactEmail,
    youtube: site.socials.youtube ?? "",
    facebook: site.socials.facebook ?? "",
    linkedin: site.socials.linkedin ?? "",
    tiktok: site.socials.tiktok ?? "",
    whatsapp,
  };
}

export async function readGeneral(): Promise<GeneralSettings> {
  const row = await db.setting.findUnique({ where: { key: "general" } });
  if (!row) return fromSite(await readSite());
  return readJson("general", DEFAULT_GENERAL, (value) => {
    const parsed = generalSchema.partial().safeParse(value);
    const merged = { ...DEFAULT_GENERAL, ...(parsed.success ? parsed.data : {}) };
    return { ...merged, hiddenSlugs: knownSlugs(merged.hiddenSlugs ?? []) };
  });
}

export function checkPublicIds(input: { gaId: string; pixelId: string; whatsapp: string }) {
  if (input.gaId && !/^G-[A-Z0-9]{4,20}$/.test(input.gaId)) throw new HttpError(400, "Google Analytics ID must look like G-XXXXXXXX.");
  if (input.pixelId && !/^\d{5,20}$/.test(input.pixelId)) throw new HttpError(400, "Pixel ID must be digits only.");
  if (input.whatsapp && !/^\d{8,15}$/.test(input.whatsapp)) throw new HttpError(400, "WhatsApp number should be digits only, with the country code.");
}

function optionalUrl(label: string, value: string) {
  if (!value) return "";
  try {
    return normalizeUrl(value);
  } catch {
    throw new HttpError(400, `${label} is not a valid link.`);
  }
}

export async function saveGeneral(input: z.infer<typeof generalSchema>) {
  checkPublicIds(input);
  const current = await readGeneral();
  const next: GeneralSettings = {
    ...input,
    youtube: optionalUrl("YouTube", input.youtube),
    facebook: optionalUrl("Facebook", input.facebook),
    linkedin: optionalUrl("LinkedIn", input.linkedin),
    tiktok: optionalUrl("TikTok", input.tiktok),
    hiddenSlugs: knownSlugs(input.hiddenSlugs ?? current.hiddenSlugs),
  };
  await writeJson("general", next);

  const site = await readSite();
  const socials = { ...site.socials };
  for (const key of ["youtube", "facebook", "linkedin", "tiktok"] as const) {
    if (next[key]) socials[key] = next[key];
    else delete socials[key];
  }
  if (next.whatsapp) socials.whatsapp = `https://wa.me/${next.whatsapp}`;
  await db.setting.upsert({
    where: { key: "site" },
    create: { key: "site", value: { ...site, contactEmail: next.contactEmail || site.contactEmail, socials } },
    update: { value: { ...site, contactEmail: next.contactEmail || site.contactEmail, socials } },
  });
  return next;
}

export async function saveHiddenSlugs(slugs: string[]) {
  const current = await readGeneral();
  const next = { ...current, hiddenSlugs: knownSlugs(slugs) };
  await writeJson("general", next);
  return next.hiddenSlugs;
}

export async function readEmail(): Promise<StoredEmail> {
  return readJson("email", DEFAULT_EMAIL, (value) => {
    const parsed = z
      .object({
        enabled: z.boolean().optional(),
        host: z.string().optional(),
        port: z.number().optional(),
        secure: z.boolean().optional(),
        username: z.string().optional(),
        passwordSeal: z.string().optional(),
        fromName: z.string().optional(),
        fromEmail: z.string().optional(),
        events: z.record(z.string(), z.boolean()).optional(),
      })
      .safeParse(value);
    if (!parsed.success) return DEFAULT_EMAIL;
    return {
      ...DEFAULT_EMAIL,
      ...parsed.data,
      events: { ...DEFAULT_EMAIL.events, ...parsed.data.events },
    };
  });
}

export async function saveEmail(input: z.infer<typeof emailInputSchema>, passwordSeal: string) {
  const events: Record<string, boolean> = { ...DEFAULT_EMAIL.events };
  for (const key of EMAIL_EVENTS) if (key in input.events) events[key] = Boolean(input.events[key]);
  const next: StoredEmail = {
    enabled: input.enabled,
    host: input.host,
    port: input.port,
    secure: input.secure,
    username: input.username,
    passwordSeal,
    fromName: input.fromName || "Ahsan Hub",
    fromEmail: input.fromEmail,
    events,
  };
  await writeJson("email", next);
  return next;
}

export function publicEmail(stored: StoredEmail) {
  return {
    enabled: stored.enabled,
    host: stored.host,
    port: stored.port,
    secure: stored.secure,
    username: stored.username,
    hasPassword: Boolean(stored.passwordSeal),
    fromName: stored.fromName,
    fromEmail: stored.fromEmail,
    events: stored.events,
  };
}

export async function readTelegram(): Promise<StoredTelegram> {
  return readJson("telegram", DEFAULT_TELEGRAM, (value) => {
    const parsed = z
      .object({
        enabled: z.boolean().optional(),
        tokenSeal: z.string().optional(),
        chatId: z.string().optional(),
        botUsername: z.string().optional(),
        events: z.record(z.string(), z.boolean()).optional(),
      })
      .safeParse(value);
    if (!parsed.success) return DEFAULT_TELEGRAM;
    return { ...DEFAULT_TELEGRAM, ...parsed.data, events: { ...DEFAULT_TELEGRAM.events, ...parsed.data.events } };
  });
}

export async function saveTelegram(input: Omit<StoredTelegram, "events"> & { events: Record<string, boolean> }) {
  const events: Record<string, boolean> = { ...DEFAULT_TELEGRAM.events };
  for (const key of TELEGRAM_EVENTS) if (key in input.events) events[key] = Boolean(input.events[key]);
  const next: StoredTelegram = { ...input, events };
  await writeJson("telegram", next);
  return next;
}

export function publicTelegram(stored: StoredTelegram) {
  return {
    enabled: stored.enabled,
    hasToken: Boolean(stored.tokenSeal),
    chatId: stored.chatId,
    botUsername: stored.botUsername,
    events: stored.events,
  };
}

export async function readProof(): Promise<ProofSettings> {
  return readJson("socialProof", DEFAULT_PROOF, (value) => {
    const parsed = proofSchema.partial().safeParse(value);
    return { ...DEFAULT_PROOF, ...(parsed.success ? parsed.data : {}), types: { ...DEFAULT_PROOF.types, ...(parsed.success ? parsed.data.types : {}) } };
  });
}

export async function saveProof(input: ProofSettings) {
  await writeJson("socialProof", input);
  return input;
}

export function assertMailHost(host: string) {
  const name = host.trim().toLowerCase();
  if (!name) return;
  const blocked = name === "169.254.169.254" || name === "metadata.google.internal" || name.endsWith(".local");
  const privateIp = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(name) || name === "localhost";
  if (blocked || (privateIp && process.env.NODE_ENV === "production")) {
    throw new HttpError(400, "That SMTP host is not allowed.");
  }
}
