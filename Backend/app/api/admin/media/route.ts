import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { RULES, fileField, saveUpload } from "@/lib/upload";

export const GET = route(async () => {
  await requireAdmin();
  const rows = await db.media.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return ok({ items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) });
});

const PURPOSES = {
  library: { rule: RULES.media, folder: "library" },
  logo: { rule: RULES.logo, folder: "logos" },
  banner: { rule: RULES.banner, folder: "banners" },
  founder: { rule: RULES.founder, folder: "founders" },
} as const;

export const POST = route(async (request) => {
  await requireAdmin();
  const form = await request.formData();
  const file = fileField(form, "file");
  if (!file) throw new HttpError(400, "Attach a file.");
  const requested = form.get("purpose");
  const purpose = requested == null || requested === "" ? "library" : requested;
  if (typeof purpose !== "string" || !(purpose in PURPOSES)) throw new HttpError(400, "That upload type is not supported.");
  const chosen = PURPOSES[purpose as keyof typeof PURPOSES];
  const saved = await saveUpload(file, chosen.rule, chosen.folder);
  return ok(saved, { status: 201 });
});
