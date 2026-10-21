import { db } from "@/lib/db";
import { ok, readJson, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { proofSchema, readProof, saveProof } from "@/lib/ops";

export const GET = route(async () => {
  await requireAdmin();
  const [settings, logs] = await Promise.all([
    readProof(),
    db.socialEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 100 }),
  ]);
  return ok({
    ...settings,
    logs: logs.map((log) => ({ id: log.id, type: log.type, message: log.message, occurredAt: log.occurredAt.toISOString(), enabled: log.enabled })),
  });
});

export const PUT = route(async (request) => {
  await requireAdmin();
  const input = proofSchema.parse(await readJson(request));
  const saved = await saveProof({
    enabled: input.enabled,
    showSeconds: input.showSeconds,
    gapSeconds: input.gapSeconds,
    repeat: input.repeat,
    lookbackHours: input.lookbackHours,
    types: input.types,
  });
  if (input.logs?.length) {
    await Promise.all(input.logs.map((log) => db.socialEvent.updateMany({ where: { id: log.id }, data: { enabled: log.enabled } })));
  }
  return ok(saved);
});
