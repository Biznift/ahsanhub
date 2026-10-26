import type { Metadata } from "next";
import { getAlternative, getCategories, getListings, getPromos } from "@/lib/api";
import { interestParam } from "@/lib/interest";
import { Container } from "@/components/section";
import { PageHeader } from "@/components/page-header";
import { ListingBrowser, type BrowseParams } from "@/components/listing-browser";
import { JsonLd } from "@/components/json-ld";
import { KIND_LABEL, SITE_URL } from "@/lib/format";
import type { ListingKind } from "@/lib/types";

type Props = { searchParams: Promise<BrowseParams> };

const TITLES: Record<string, string> = { top: "Most upvoted", featured: "Featured", new: "All listings" };

function kindOf(value: string | undefined): ListingKind | undefined {
  return value === "software" || value === "service" || value === "ecommerce" ? value : undefined;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const kind = kindOf(params.kind);
  const title = params.q ? `Search results for “${params.q}”` : kind ? KIND_LABEL[kind] : TITLES[params.sort ?? "new"] ?? TITLES.new;
  return {
    title,
    description: "Browse halal software, services, and online shops on Ahsan Hub. Filter by type, category, and price.",
    alternates: { canonical: "/explore" },
    // Filtered and searched views are thin duplicates of the main list.
    robots: params.q || params.pricing || params.page || params.view || params.alternative ? { index: false, follow: true } : undefined,
  };
}

export default async function ExplorePage({ searchParams }: Props) {
  const params = await searchParams;
  const kind = kindOf(params.kind);
  const sort = params.sort === "top" || params.sort === "featured" ? params.sort : "new";
  const page = Math.max(1, Number(params.page) || 1);
  const alternative = params.alternative ? await getAlternative(params.alternative) : null;
  const alternativeName = alternative?.item?.name;
  const recent = await interestParam();
  const [results, categories, promos] = await Promise.all([
    getListings({ q: params.q, category: params.category, kind, pricing: params.pricing, sort, page, limit: 24, alternative: alternativeName ? params.alternative : undefined }),
    getCategories(),
    getPromos({ placement: "explore-inline", category: params.category, recent, limit: 6 }),
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }, { label: "Explore" }]}
        title={alternativeName ? `Alternatives to ${alternativeName}` : kind ? KIND_LABEL[kind] : TITLES[sort]}
        description="Software, services, and shops are reviewed by a person before they go live. The full list shows every type, and each card says which one it is."
      />
      <Container className="py-10">
        <ListingBrowser base="/explore" params={{ q: params.q, category: params.category, kind, pricing: params.pricing, sort: params.sort, page: params.page, view: params.view, alternative: alternativeName ? params.alternative : undefined }} results={results} categories={categories} promos={promos} alternativeName={alternativeName} />
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
