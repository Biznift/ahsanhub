import { ok, route } from "@/lib/http";
import { currentUser, publicUser } from "@/lib/auth";

export const GET = route(async () => {
  const user = await currentUser();
  return ok({ user: user ? publicUser(user) : null }, { headers: { "cache-control": "no-store" } });
});
