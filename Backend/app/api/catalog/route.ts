import { MODULES } from "@/lib/catalog";
import { ok, route } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";

export const GET = route(async () => {
  await requireAdmin();
  return ok({
    name: "Smart Admin Kit",
    description: "Common admin API taken from Al Amin SI and Social media content generation.",
    modules: MODULES.map((item) => ({
      slug: item.slug,
      label: item.label,
      group: item.group,
      summary: item.summary,
      functions: item.functions,
      endpoints: item.endpoints,
    })),
  });
});
