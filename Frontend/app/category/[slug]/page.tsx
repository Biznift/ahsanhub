import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAds, getCategories, getListings } from "@/lib/api";
import { Container } from "@/components/section";
import { PageHeader } from "@/components/page-header";
import { ListingBrowser, type BrowseParams } from "@/components/listing-browser";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/format";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<BrowseParams> };

async function findCategory(slug: string) {
  return (await getCategories()).find((item) => item.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = await findCategory(slug);
  if (!category) return { title: "Category not found" };
  const year = new Date().getFullYear();
  return {
    title: `Best ${category.name} tools in ${year}`,
    description: category.description || `Compare the best halal ${category.name.toLowerCase()} software and services in ${year}, with upvotes and reviews from the Ahsan Hub community.`,
    alternates: { canonical: `/category/${slug}` },
    robots: query.q || query.pricing || query.page ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [category, categories] = await Promise.all([findCategory(slug), getCategories()]);
  if (!category) notFound();
  const sort = query.sort === "top" || query.sort === "featured" ? query.sort : "new";
  const page = Math.max(1, Number(query.page) || 1);
  const [results, ads] = await Promise.all([
    getListings({ category: slug, q: query.q, pricing: query.pricing, sort, page, limit: 24 }),
    getAds("explore-inline"),
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }, { href: "/categories", label: "Categories" }, { label: category.name }]}
        title={`Best ${category.name} tools`}
        description={category.description || `Halal ${category.name.toLowerCase()} software and services, reviewed by the Ahsan Hub team and ranked by the community.`}
      />
      <Container className="py-10">
        <ListingBrowser base={`/category/${slug}`} params={{ q: query.q, pricing: query.pricing, sort: query.sort, page: query.page }} results={results} categories={categories} sponsored={ads?.sponsored ?? []} lockCategory />
      </Container>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Categories", item: `${SITE_URL}/categories` },
              { "@type": "ListItem", position: 3, name: category.name, item: `${SITE_URL}/category/${slug}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Best ${category.name} tools`,
            itemListElement: results.items.map((item, index) => ({ "@type": "ListItem", position: (page - 1) * 24 + index + 1, url: `${SITE_URL}/product/${item.slug}`, name: item.name })),
          },
        ]}
      />
    </>
  );
}
