import { ok, route } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { loadFounderProfile } from "@/lib/founder-profile";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await loadFounderProfile(user), { headers: { "cache-control": "no-store" } });
});
