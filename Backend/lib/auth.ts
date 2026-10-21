import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";

export const SESSION_COOKIE = "ah_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 24) throw new Error("AUTH_SECRET must be set to at least 24 characters.");
  return new TextEncoder().encode(value);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | null = null;

/** Always runs a bcrypt compare, including when the account does not exist. */
export async function passwordMatches(password: string, hash: string | null) {
  dummyHash ??= hashPassword("ahsan-hub-unused-password");
  return checkPassword(password, hash ?? (await dummyHash));
}

function passwordStamp(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 22);
}

function sameStamp(left: unknown, right: string) {
  if (typeof left !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startSession(user: Pick<User, "id" | "role" | "passwordHash">) {
  const token = await new SignJWT({ role: user.role, pwd: passwordStamp(user.passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "active") return null;
    if (!sameStamp(payload.pwd, passwordStamp(user.passwordHash))) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in first.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new HttpError(403, "Admins only.");
  return user;
}

export function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified };
}
