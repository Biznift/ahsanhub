import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const VOTER_COOKIE = "ah_voter";

function sign(id: string) {
  const key = process.env.AUTH_SECRET;
  if (!key || key.length < 24) throw new Error("AUTH_SECRET must be set to at least 24 characters.");
  return createHmac("sha256", key).update(id).digest("base64url");
}

function readSigned(raw: string | undefined) {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const expected = sign(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

/** Anonymous visitor id for upvotes. Created on the first vote and kept for a year. */
export async function voterId(create: boolean) {
  const jar = await cookies();
  const existing = readSigned(jar.get(VOTER_COOKIE)?.value);
  if (existing) return existing;
  if (!create) return null;
  const id = randomUUID();
  jar.set(VOTER_COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}
