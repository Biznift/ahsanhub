import { ok, route } from "@/lib/http";
import { currentUser, publicUser } from "@/lib/auth";

export const GET = route(async () => {
  const user = await currentUser();
  return ok({ user: user?.role === "admin" ? publicUser(user) : null }, { headers: { "cache-control": "no-store" } });
});
