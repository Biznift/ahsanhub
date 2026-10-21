import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { removeUpload } from "@/lib/upload";

type Context = { params: Promise<{ id: string }> };

/** Files still used by a listing or an ad cannot be deleted from the library. */
export const DELETE = route<Context>(async (_request, { params }) => {
  await requireAdmin();
  const row = await db.media.findUnique({ where: { id: (await params).id } });
  if (!row) throw new HttpError(404, "File not found.");
  const inUse =
    (await db.listing.count({ where: { OR: [{ logo: row.path }, { banner: row.path }] } })) +
    (await db.founder.count({ where: { photo: row.path } })) +
    (await db.ad.count({ where: { file: row.path } }));
  if (inUse > 0) throw new HttpError(400, "This file is used by a listing or an ad. Remove it there first.");
  await removeUpload(row.path);
  return ok({ ok: true });
});
