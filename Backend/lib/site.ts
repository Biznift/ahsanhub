import { z } from "zod";
import { db } from "@/lib/db";
import { httpSocials } from "@/lib/directory";

export const siteSchema = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(120),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
  keywords: z.array(z.string().trim().max(40)).max(20),
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid contact email"),
  socials: z.record(z.string(), z.string().max(300)),
  announcement: z.string().trim().max(140),
});

export type SiteSettings = z.infer<typeof siteSchema>;

export const DEFAULT_SITE: SiteSettings = {
  name: "Ahsan Hub",
  tagline: "The directory of halal software and businesses",
  seoTitle: "Ahsan Hub: Discover halal software, SaaS and businesses",
  seoDescription:
    "Ahsan Hub is a curated directory of halal software, SaaS products and businesses. Browse by category, upvote what you use, and list your own product for free.",
  keywords: ["halal software", "halal business directory", "muslim founders", "SaaS directory"],
  contactEmail: "hello@ahsanhub.com",
  socials: {},
  announcement: "",
};

export async function readSite(): Promise<SiteSettings> {
  const row = await db.setting.findUnique({ where: { key: "site" } });
  const parsed = siteSchema.partial().safeParse(row?.value ?? {});
  const merged = { ...DEFAULT_SITE, ...(parsed.success ? parsed.data : {}) };
  return { ...merged, socials: httpSocials(merged.socials) };
}
