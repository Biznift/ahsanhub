import { BrandIcon, SOCIAL_KEYS, SOCIAL_LABEL } from "@/components/brand-icons";
import type { Socials } from "@/lib/types";
import { cn } from "@/lib/format";

export function SocialLinks({ socials, size = "md", owner }: { socials: Socials; size?: "sm" | "md"; owner?: string }) {
  const entries = SOCIAL_KEYS.filter((key) => {
    const href = socials[key];
    if (!href) return false;
    try {
      const url = new URL(href);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
  if (entries.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map((key) => (
        <li key={key}>
          <a
            href={socials[key]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={owner ? `${owner} on ${SOCIAL_LABEL[key]}` : SOCIAL_LABEL[key]}
            title={SOCIAL_LABEL[key]}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-line bg-surface text-ink-soft transition hover:border-line-strong hover:text-ink",
              size === "sm" ? "h-8 w-8 justify-center" : "h-10 px-3.5 text-[14px] font-medium",
            )}
          >
            <BrandIcon name={key} size={size === "sm" ? 14 : 16} />
            {size === "md" && SOCIAL_LABEL[key]}
          </a>
        </li>
      ))}
    </ul>
  );
}
