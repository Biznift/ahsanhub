import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { readProof } from "@/lib/ops";

export const GET = route(async () => {
  const settings = await readProof();
  if (!settings.enabled) return ok({ ...settings, items: [] }, { headers: { "cache-control": "no-store" } });
  const since = new Date(Date.now() - settings.lookbackHours * 60 * 60 * 1000);
  const types = (["signup", "listing"] as const).filter((type) => settings.types[type]);
  const logs = await db.socialEvent.findMany({
    where: { enabled: true, type: { in: types }, occurredAt: { gte: since } },
    orderBy: { occurredAt: "desc" },
    take: 20,
  });
  return ok(
    {
      ...settings,
      items: logs.map((log) => ({ id: log.id, type: log.type, message: log.message, occurredAt: log.occurredAt.toISOString() })),
    },
    { headers: { "cache-control": "no-store" } },
  );
});
