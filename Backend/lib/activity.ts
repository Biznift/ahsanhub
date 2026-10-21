import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { alert } from "@/lib/telegram";
import { emailEnabled, deliverEmail } from "@/lib/mailer";

export async function recordActivity(type: "signup" | "listing", message: string) {
  const text = message.trim().slice(0, 180);
  if (!text) return;
  await db.socialEvent.create({ data: { type, message: text } });
}

export async function sendVerification(user: { id: string; email: string; name: string }) {
  if (!(await emailEnabled("verify"))) return;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
  await db.loginToken.deleteMany({ where: { userId: user.id } });
  await db.loginToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  const site = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const link = `${site}/verify?token=${token}`;
  try {
    await deliverEmail(
      user.email,
      "Confirm your Ahsan Hub email",
      `Hi ${user.name},\n\nConfirm this email so we know the listing account is yours:\n${link}\n\nThe link works for 48 hours. You can still sign in before confirming.`,
    );
  } catch (error) {
    console.error("Verification email failed", error instanceof Error ? error.message : "unknown");
    alert("email.failed", "A verification email could not be sent.");
  }
}
