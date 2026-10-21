import { getAds } from "@/lib/api";
import { AdRotator } from "@/components/ad-rotator";
import { cn } from "@/lib/format";

/**
 * Renders a placement's banner, GIF or video. With no creative it falls back to a sponsored
 * free listing, and with neither it renders nothing so the layout never shows an empty box.
 */
export async function AdSlot({ placement, className }: { placement: string; className?: string }) {
  const data = await getAds(placement);
  if (!data || !data.size || (data.ads.length === 0 && data.sponsored.length === 0)) return null;
  return (
    <aside aria-label="Advertisement" className={cn("w-full", className)}>
      <AdRotator size={data.size} ads={data.ads} sponsored={data.sponsored} />
    </aside>
  );
}
