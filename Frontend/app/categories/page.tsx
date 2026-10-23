import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCategories } from "@/lib/api";
import { Container } from "@/components/section";
import { PageHeader } from "@/components/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { KIND_LABEL, LISTING_KINDS, categoryKind } from "@/lib/format";

export const metadata: Metadata = {
  title: "All categories",
  description: "Browse categories for halal software, services, and online shops.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <>
      <PageHeader crumbs={[{ href: "/", label: "Home" }, { label: "Categories" }]} title="All categories" description="Each listing type has its own categories. A listing can sit in up to five of them." />
      <Container className="space-y-12 py-10">
        {LISTING_KINDS.map((kind) => {
          const group = categories.filter((category) => categoryKind(category) === kind);
          if (group.length === 0) return null;
          return (
            <section key={kind}>
              <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.02em] text-ink">{KIND_LABEL[kind]}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((category) => (
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
                    {category.count} {category.count === 1 ? "listing" : "listings"}
                  </span>
                </span>
              </Link>
            </li>
                ))}
              </ul>
            </section>
          );
        })}
      </Container>
    </>
  );
}
