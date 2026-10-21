import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCategories } from "@/lib/api";
import { Container } from "@/components/section";
import { PageHeader } from "@/components/page-header";
import { CategoryIcon } from "@/components/category-icon";

export const metadata: Metadata = {
  title: "All categories",
  description: "Browse halal software and businesses by category: finance, productivity, education, e-commerce, Islamic finance and more.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <>
      <PageHeader crumbs={[{ href: "/", label: "Home" }, { label: "Categories" }]} title="All categories" description="A product can sit in up to five categories, so you will find it wherever it is useful." />
      <Container className="py-10">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link href={`/category/${category.slug}`} className="group flex h-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-brand">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-band text-ink-soft transition group-hover:bg-brand-soft group-hover:text-brand-text">
                  <CategoryIcon slug={category.slug} size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[16px] font-semibold text-ink">{category.name}</span>
                    <ArrowUpRight size={16} className="text-muted transition group-hover:text-brand-text" />
                  </span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-muted">{category.description || `Halal ${category.name.toLowerCase()} tools and services.`}</span>
                  <span className="mt-3 block text-[13px] font-medium tabular-nums text-ink-soft">
                    {category.count} {category.count === 1 ? "product" : "products"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
