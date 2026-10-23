export const LISTING_KINDS = ["software", "service", "ecommerce"] as const;
export type ListingKind = (typeof LISTING_KINDS)[number];

export const KIND_LABEL: Record<ListingKind, string> = {
  software: "Software / SaaS",
  service: "Service",
  ecommerce: "E-commerce",
};

export function isListingKind(value: string): value is ListingKind {
  return (LISTING_KINDS as readonly string[]).includes(value);
}
