import { ok, route } from "@/lib/http";
import { readGeneral } from "@/lib/ops";
import { readSite } from "@/lib/site";

export const GET = route(async () => {
  const [site, general] = await Promise.all([readSite(), readGeneral()]);
  return ok({
    ...site,
    maintenance: general.maintenance,
    theme: general.theme,
    whatsapp: general.whatsapp,
    whatsappMessage: general.whatsappMessage,
    gaId: general.gaId,
    pixelId: general.pixelId,
  });
});
