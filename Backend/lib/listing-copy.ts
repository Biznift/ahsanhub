import { KIND_LABEL, type ListingKind } from "@/lib/kinds";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open source",
};

const SOCIAL_LABEL: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  github: "GitHub",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

export type ListingCopySource = {
  name: string;
  slug: string;
  overview: string;
  description: string;
  website: string;
  pricing: string;
  country: string;
  platforms: string[];
  halalNote: string;
  halalVerified: boolean;
  socials: Record<string, string>;
  kind: ListingKind;
  categories: { name: string }[];
  founders: { name: string; role: string; bio: string; socials: Record<string, string> }[];
  alternatives?: { name: string }[];
  couponCode?: string;
  couponNote?: string;
};

function plain(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function socialLines(socials: Record<string, string>) {
  return Object.entries(socials)
    .filter(([, url]) => url.trim())
    .map(([key, url]) => `${SOCIAL_LABEL[key] ?? key}: ${url.trim()}`);
}

/** Plain text of the public product fields, ready to paste. */
export function formatListingCopy(item: ListingCopySource) {
  const description = plain(item.description);
  const facts = [
    `Website: ${item.website}`,
    `Page: ${SITE}/product/${item.slug}`,
    `Pricing: ${PRICING_LABEL[item.pricing] ?? item.pricing}`,
    `Type: ${KIND_LABEL[item.kind]}`,
    item.categories.length > 0 && `Categories: ${item.categories.map((category) => category.name).join(", ")}`,
    item.country && `Country: ${item.country}`,
    item.platforms.length > 0 && `Platforms: ${item.platforms.join(", ")}`,
    item.halalVerified && "Halal verified",
    item.halalNote && `Halal note: ${item.halalNote}`,
  ].filter(Boolean);

  const founders = item.founders
    .filter((founder) => founder.name.trim())
    .map((founder) => {
      const line = [founder.name, founder.role, founder.bio].filter((part) => part.trim()).join(" — ");
      const links = socialLines(founder.socials);
      return [line, ...links.map((link) => `  ${link}`)].join("\n");
    });

  const socials = socialLines(item.socials);
  const alternatives = (item.alternatives ?? []).map((tool) => tool.name).filter(Boolean);

  return [
    [item.name, item.overview, description && description !== item.overview ? description : ""].filter(Boolean).join("\n\n"),
    facts.join("\n"),
    founders.length > 0 && `Founders:\n${founders.map((line) => `- ${line}`).join("\n")}`,
    socials.length > 0 && socials.join("\n"),
    alternatives.length > 0 && `Alternatives: ${alternatives.join(", ")}`,
    item.couponCode && `Coupon: ${item.couponCode}${item.couponNote ? ` — ${item.couponNote}` : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
