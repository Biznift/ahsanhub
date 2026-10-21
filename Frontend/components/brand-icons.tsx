import { siFacebook, siGithub, siInstagram, siTiktok, siWhatsapp, siX, siYoutube } from "simple-icons";
import type { SocialKey } from "@/lib/types";

const LINKEDIN = "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z";

const PATHS: Record<SocialKey, string> = {
  x: siX.path,
  linkedin: LINKEDIN,
  facebook: siFacebook.path,
  instagram: siInstagram.path,
  youtube: siYoutube.path,
  github: siGithub.path,
  tiktok: siTiktok.path,
  whatsapp: siWhatsapp.path,
};

export const SOCIAL_LABEL: Record<SocialKey, string> = {
  x: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  github: "GitHub",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

export const SOCIAL_KEYS = Object.keys(SOCIAL_LABEL) as SocialKey[];

export function BrandIcon({ name, size = 16 }: { name: SocialKey; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d={PATHS[name]} />
    </svg>
  );
}
