export type Pricing = "free" | "freemium" | "paid" | "open_source";
export type ListingKind = "software" | "service" | "ecommerce";

export type SocialKey = "x" | "linkedin" | "facebook" | "instagram" | "youtube" | "github" | "tiktok" | "whatsapp";
export type Socials = Partial<Record<SocialKey, string>>;

export type CategoryRef = { name: string; slug: string; status?: "approved" | "pending" };

export type AlternativeRef = { id: string; name: string; slug: string };

export type Rating = { average: number; count: number } | null;

export type ListingCard = {
  id: string;
  slug: string;
  name: string;
  overview: string;
  logo: string | null;
  pricing: Pricing;
  featured: boolean;
  sponsored: boolean;
  halalVerified: boolean;
  voteCount: number;
  kind: ListingKind;
  categories: CategoryRef[];
  alternatives: AlternativeRef[];
  publishedAt: string | null;
  rating?: Rating;
};

export type Founder = { id: string; name: string; role: string; bio: string; photo: string | null; socials: Socials };

export type ListingDetail = ListingCard & {
  description: string;
  website: string;
  banner: string | null;
  country: string;
  platforms: string[];
  halalNote: string;
  socials: Socials;
  founders: Founder[];
  updatedAt: string;
  rating: Rating;
  related: ListingCard[];
};

export type EditableListing = Omit<ListingDetail, "related" | "rating"> & {
  status: "pending" | "published" | "rejected";
  contactEmail: string;
  categoryIds: string[];
};

export type Category = { id: string; name: string; slug: string; description: string; count: number; kind: ListingKind; status?: "approved" | "pending" | "rejected" };

export type Page<T> = { items: T[]; total: number; page: number; pages: number };

export type Review = { id: string; name: string; rating: number; body: string; createdAt: string };

export type CouponAction = { label: string; url: string; kind: "website" | "offer" };

export type CouponDeal = {
  id: string;
  note: string;
  action: CouponAction | null;
  listing: ListingCard;
};

export type AdCreative = { id: string; title: string; kind: "image" | "gif" | "video"; file: string; url: string };

export type AdPlacementData = {
  placement: string;
  size: { label: string; width: number; height: number } | null;
  ads: AdCreative[];
  sponsored: ListingCard[];
};

export type Site = {
  name: string;
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  contactEmail: string;
  socials: Socials;
  announcement: string;
  logo?: string;
  favicon?: string;
  appleTouchIcon?: string;
  ogImage?: string;
  showBismillah?: boolean;
  maintenance?: boolean;
  theme?: "light" | "dark" | "system";
  whatsapp?: string;
  whatsappMessage?: string;
  gaId?: string;
  pixelId?: string;
};

export type PublicPost = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  tags: string[] | string;
  publishedAt: string | null;
  kind?: "blog" | "page";
  html?: string;
};

export type Account = { id: string; name: string; email: string; role: "admin" | "owner"; emailVerified?: boolean };
