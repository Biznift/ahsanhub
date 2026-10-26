import { db } from "@/lib/db";
import { alert } from "@/lib/telegram";
import { deliverEmail, emailEnabled } from "@/lib/mailer";

export type RejectionNotice = {
  emailed: string[];
  failed: string[];
  skipped: boolean;
};

function siteOrigin() {
  return (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function absoluteFile(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Owner account plus the email typed on the submission. The same address is mailed once. */
function recipients(contactEmail: string, ownerEmail: string | null) {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of [ownerEmail, contactEmail]) {
    const email = raw?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue;
    seen.add(email);
    list.push(email);
  }
  return list;
}

/** Emails the rejection reason when that customer email is turned on. A send failure does not undo the rejection. */
export async function notifyListingRejected(listingId: string): Promise<RejectionNotice> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      name: true,
      contactEmail: true,
      rejectNote: true,
      rejectImage: true,
      owner: { select: { email: true } },
    },
  });
  if (!listing) return { emailed: [], failed: [], skipped: true };
  if (!(await emailEnabled("listing_rejected"))) return { emailed: [], failed: [], skipped: true };

  const to = recipients(listing.contactEmail, listing.owner?.email ?? null);
  if (to.length === 0) return { emailed: [], failed: [], skipped: false };

  const accountUrl = `${siteOrigin()}/account`;
  const imageUrl = absoluteFile(listing.rejectImage);
  const subject = `Your listing "${listing.name}" was not approved`;
  const lines = [
    "Hi,",
    "",
    `We reviewed ${listing.name} and did not approve it for Ahsan Hub.`,
    "",
    "Why:",
    listing.rejectNote,
  ];
  if (imageUrl) lines.push("", `Screenshot: ${imageUrl}`);
  lines.push(
    "",
    "The same note is on your account:",
    accountUrl,
    "",
    "You can update the listing there and send it back for review.",
    "",
    "— Ahsan Hub",
  );
  const text = lines.join("\n");

  const safeName = escapeHtml(listing.name);
  const safeNote = escapeHtml(listing.rejectNote).replace(/\r\n|\n|\r/g, "<br>");
  const html = [
    `<p>Hi,</p>`,
    `<p>We reviewed <strong>${safeName}</strong> and did not approve it for Ahsan Hub.</p>`,
    `<p><strong>Why</strong></p>`,
    `<p>${safeNote}</p>`,
    imageUrl ? `<p><img src="${escapeHtml(imageUrl)}" alt="Note from Ahsan Hub" style="max-width:560px;height:auto;border-radius:8px"></p>` : "",
    `<p>The same note is on your account: <a href="${escapeHtml(accountUrl)}">${escapeHtml(accountUrl)}</a></p>`,
    `<p>You can update the listing there and send it back for review.</p>`,
    `<p>— Ahsan Hub</p>`,
  ]
    .filter(Boolean)
    .join("");

  const emailed: string[] = [];
  const failed: string[] = [];
  for (const address of to) {
    try {
      await deliverEmail(address, subject, text, { html });
      emailed.push(address);
    } catch (error) {
      console.error("Rejection email failed", error instanceof Error ? error.message : "unknown");
      failed.push(address);
      alert("email.failed", `Could not email a rejection note for ${listing.name} to ${address}.`);
    }
  }
  return { emailed, failed, skipped: false };
}
