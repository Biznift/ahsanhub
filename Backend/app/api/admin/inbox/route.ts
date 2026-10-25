import { ok, route, rateLimit } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { listInbox, syncInbox } from "@/lib/inbox";

export const GET = route(async () => {
  await requireAdmin();
  return ok(await listInbox());
});

export const POST = route(async () => {
  const admin = await requireAdmin();
  rateLimit(`inbox-sync:${admin.id}`, 8, 60 * 1000);
  return ok(await syncInbox());
});
