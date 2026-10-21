import { cn } from "@/lib/format";

export function ListingLogo({ src, name, size = 48, className }: { src: string | null; name: string; size?: number; className?: string }) {
  const radius = Math.round(size * 0.24);
  if (!src) {
    return (
      <span
        className={cn("grid shrink-0 place-items-center border border-line bg-band font-semibold text-muted", className)}
        style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.4 }}
        aria-hidden="true"
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 border border-line bg-surface object-cover", className)}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  );
}
