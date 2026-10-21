import type { Metadata } from "next";
import { getAds, getCategories, getListings } from "@/lib/api";
import { Container } from "@/components/section";
import { PageHeader } from "@/components/page-header";
import { ListingBrowser, type BrowseParams } from "@/components/listing-browser";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/format";

type Props = { searchParams: Promise<BrowseParams> };

const TITLES: Record<string, string> = { top: "Most upvoted products", featured: "Featured products", new: "All products" };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const title = params.q ? `Search results for “${params.q}”` : TITLES[params.sort ?? "new"] ?? TITLES.new;
  return {
    title,
    description: "Browse every halal software product, SaaS and business on Ahsan Hub. Filter by category and price, and sort by newest or most upvoted.",
    alternates: { canonical: "/explore" },
    // Filtered and searched views are thin duplicates of the main list.
    robots: params.q || params.pricing || params.page ? { index: false, follow: true } : undefined,
  };
}

export default async function ExplorePage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = params.sort === "top" || params.sort === "featured" ? params.sort : "new";
  const page = Math.max(1, Number(params.page) || 1);
  const [results, categories, ads] = await Promise.all([
    getListings({ q: params.q, category: params.category, pricing: params.pricing, sort, page, limit: 24 }),
    getCategories(),
    getAds("explore-inline"),
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }, { label: "Explore" }]}
        title={TITLES[sort]}
        description="Every product on Ahsan Hub has been reviewed by a person before going live. Filter by price or category, then upvote the ones you would recommend."
      />
      <Container className="py-10">
        <ListingBrowser base="/explore" params={{ q: params.q, category: params.category, pricing: params.pricing, sort: params.sort, page: params.page }} results={results} categories={categories} sponsored={ads?.sponsored ?? []} />
      </Container>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: TITLES[sort],
          itemListElement: results.items.map((item, index) => ({ "@type": "ListItem", position: (page - 1) * 24 + index + 1, url: `${SITE_URL}/product/${item.slug}`, name: item.name })),
        }}
      />
    </>
  );
}
