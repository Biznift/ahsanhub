import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, readJson, route } from "@/lib/http";
import { REPORT_REASON_LABEL } from "@/lib/reports";
import { alert } from "@/lib/telegram";

type Context = { params: Promise<{ slug: string }> };

const schema = z.object({
  reason: z.enum(["not_halal", "halal_claim", "wrong_info", "broken_link", "spam", "other"]),
  body: z.string().trim().min(20, "Describe the problem in at least 20 characters.").max(2000),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(160)
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, "Enter a valid email.")
    .optional()
    .default(""),
});

/** Anyone can report a published listing. The note stays private until an admin reads it. */
export const POST = route<Context>(async (request, { params }) => {
  limitClient(request, "report", 5, 60 * 60 * 1000);
  const { slug } = await params;
  const listing = await db.listing.findFirst({ where: { slug, status: "published" }, select: { id: true, name: true } });
  if (!listing) throw new HttpError(404, "Listing not found.");
  const input = schema.parse(await readJson(request));
  await db.listingReport.create({
    data: { listingId: listing.id, reason: input.reason, body: input.body, email: input.email },
  });
  alert("listing.reported", `Listing report on ${listing.name}: ${REPORT_REASON_LABEL[input.reason]}. ${input.body.slice(0, 180)}`);
  return ok({ status: "open" }, { status: 201 });
});
