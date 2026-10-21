import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { loadPeople } from "@/lib/people";

export const GET = route(async () => {
  await requireAdmin();
  return ok(await loadPeople());
});
