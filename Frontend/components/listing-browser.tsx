import Link from "next/link";
import { LayoutGrid, List, Search, X } from "lucide-react";
import type { Category, ListingCard, Page } from "@/lib/types";
import { KIND_LABEL, LISTING_KINDS, PRICING_LABEL, categoryKind, cn } from "@/lib/format";
import type { ListingKind } from "@/lib/types";
import { ProductCard, ProductRow } from "@/components/product-card";

export type BrowseParams = { q?: string; category?: string; kind?: string; pricing?: string; sort?: string; page?: string; view?: string; alternative?: string };

const KIND_NOUN: Record<ListingKind, [string, string]> = {
  software: ["product", "products"],
  service: ["service", "services"],
  ecommerce: ["shop", "shops"],
};

const SORTS = [
  { value: "new", label: "Newest" },
  { value: "top", label: "Most upvoted" },
  { value: "featured", label: "Featured" },
];

/** Builds a link that changes one filter and keeps the others. Changing a filter resets the page. */
function hrefFor(base: string, params: BrowseParams, change: Partial<BrowseParams>) {
  const next = { ...params, page: undefined, ...change };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export function ListingBrowser({
  base,
  params,
  results,
  categories,
  sponsored,
  lockCategory = false,
  alternativeName,
}: {
  base: string;
  params: BrowseParams;
  results: Page<ListingCard>;
  categories: Category[];
  sponsored: ListingCard[];
  lockCategory?: boolean;
  alternativeName?: string;
}) {
  const sort = params.sort ?? "new";
  const listView = params.view !== "grid";
  const viewParams = { ...params, view: listView ? undefined : "grid" };
  const filtered = Boolean(params.q || params.pricing || params.alternative || (!lockCategory && params.category));
  const cells: { listing: ListingCard; sponsored: boolean }[] = [];
  results.items.forEach((listing, index) => {
    cells.push({ listing, sponsored: false });
    const ad = sponsored[Math.floor(index / 8) % Math.max(1, sponsored.length)];
    if ((index + 1) % 8 === 0 && ad && index < results.items.length - 1) cells.push({ listing: ad, sponsored: true });
  });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <form action={base} id="search" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-brand">
          <Search size={16} className="shrink-0 text-muted" aria-hidden="true" />
          <label htmlFor="browse-q" className="sr-only">
            Search
          </label>
          <input id="browse-q" name="q" defaultValue={params.q} placeholder="Search listings" className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
          {params.kind && <input type="hidden" name="kind" value={params.kind} />}
          {params.category && !lockCategory && <input type="hidden" name="category" value={params.category} />}
          {params.pricing && <input type="hidden" name="pricing" value={params.pricing} />}
          {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          {!listView && <input type="hidden" name="view" value="grid" />}
          {params.alternative && <input type="hidden" name="alternative" value={params.alternative} />}
        </form>

        <div className="hidden lg:block">
          <Filters base={base} params={params} viewParams={viewParams} categories={categories} lockCategory={lockCategory} />
        </div>
        <details open={Boolean(params.pricing || params.category)} className="mt-4 rounded-xl border border-line bg-surface lg:hidden">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-[14px] font-semibold text-ink [&::-webkit-details-marker]:hidden">Filters</summary>
          <div className="border-t border-line px-2 pb-3">
            <Filters base={base} params={params} viewParams={viewParams} categories={categories} lockCategory={lockCategory} />
          </div>
        </details>
      </aside>

      <div className="min-w-0">
        {!lockCategory && (
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Listing type">
            <KindTab href={hrefFor(base, viewParams, { kind: undefined, category: undefined })} active={!params.kind}>
              All
            </KindTab>
            {LISTING_KINDS.map((kind) => (
              <KindTab key={kind} href={hrefFor(base, viewParams, { kind, category: undefined })} active={params.kind === kind}>
                {KIND_LABEL[kind]}
              </KindTab>
            ))}
          </div>
        )}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-[14px] text-muted">
            <span className="font-semibold tabular-nums text-ink">{results.total}</span> {countLabel(results.total, params.kind)}
            {params.q && (
              <>
                {" "}
                for <span className="font-semibold text-ink">“{params.q}”</span>
              </>
            )}
            {params.alternative && (
              <>
                {" "}
                as alternatives to <span className="font-semibold text-ink">{alternativeName || "this tool"}</span>
              </>
            )}
            {filtered && (
              <Link href={hrefFor(base, { kind: params.kind, view: listView ? undefined : "grid" }, {})} className="ml-3 inline-flex items-center gap-1 font-medium text-brand-text">
                <X size={13} /> Clear filters
              </Link>
            )}
          </p>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <div className="flex shrink-0 rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Layout">
              <Link
                href={hrefFor(base, viewParams, { view: "grid" })}
                role="tab"
                aria-selected={!listView}
                aria-label="Grid view"
                className={cn("grid h-8 w-8 place-items-center rounded-lg transition", !listView ? "bg-ink text-bg" : "text-muted hover:text-ink")}
              >
                <LayoutGrid size={15} />
              </Link>
              <Link
                href={hrefFor(base, viewParams, { view: undefined })}
                role="tab"
                aria-selected={listView}
                aria-label="List view"
                className={cn("grid h-8 w-8 place-items-center rounded-lg transition", listView ? "bg-ink text-bg" : "text-muted hover:text-ink")}
              >
                <List size={15} />
              </Link>
            </div>
            <div className="flex max-w-full overflow-x-auto rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Sort">
              {SORTS.map((item) => (
                <Link
                  key={item.value}
                  href={hrefFor(base, viewParams, { sort: item.value === "new" ? undefined : item.value })}
                  role="tab"
                  aria-selected={sort === item.value}
                  className={cn("shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap transition sm:px-3 sm:text-[13px]", sort === item.value ? "bg-ink text-bg" : "text-muted hover:text-ink")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {results.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-[16px] font-semibold text-ink">Nothing matches yet</p>
            <p className="mt-1 text-[14px] text-muted">Try another search, or be the first to list one here.</p>
            <Link href="/submit" className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover">
              Submit a listing
            </Link>
          </div>
        ) : listView ? (
          <div className="rounded-2xl border border-line bg-surface p-2">
            {cells.map((cell, index) => (
              <ProductRow key={`${cell.listing.id}-${index}`} listing={cell.listing} showSponsored={cell.sponsored} wrapOverview />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cells.map((cell, index) => (
              <ProductCard key={`${cell.listing.id}-${index}`} listing={cell.listing} showSponsored={cell.sponsored} />
            ))}
          </div>
        )}

        {results.pages > 1 && <Pagination base={base} params={viewParams} page={results.page} pages={results.pages} />}
      </div>
    </div>
  );
}

function countLabel(total: number, kind: string | undefined) {
  if (kind === "software" || kind === "service" || kind === "ecommerce") return KIND_NOUN[kind][total === 1 ? 0 : 1];
  return total === 1 ? "listing" : "listings";
}

function KindTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} role="tab" aria-selected={active} className={cn("inline-flex h-9 items-center rounded-lg border px-3 text-[13px] font-semibold transition", active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink")}>
      {children}
    </Link>
  );
}

function Filters({
  base,
  params,
  viewParams,
  categories,
  lockCategory,
}: {
  base: string;
  params: BrowseParams;
  viewParams: BrowseParams;
  categories: Category[];
  lockCategory?: boolean;
}) {
  return (
    <>
      <FilterGroup title="Pricing">
        <FilterLink href={hrefFor(base, viewParams, { pricing: undefined })} active={!params.pricing}>
          Any price
        </FilterLink>
        {Object.entries(PRICING_LABEL).map(([value, label]) => (
          <FilterLink key={value} href={hrefFor(base, viewParams, { pricing: value })} active={params.pricing === value}>
            {label}
          </FilterLink>
        ))}
      </FilterGroup>

      {!lockCategory &&
        (params.kind ? (
          <FilterGroup title="Category">
            <FilterLink href={hrefFor(base, viewParams, { category: undefined })} active={!params.category}>
              All categories
            </FilterLink>
            {categories
              .filter((category) => categoryKind(category) === params.kind)
              .map((category) => (
                <FilterLink key={category.slug} href={hrefFor(base, viewParams, { category: category.slug })} active={params.category === category.slug} count={category.count}>
                  {category.name}
                </FilterLink>
              ))}
          </FilterGroup>
        ) : (
          LISTING_KINDS.map((kind) => {
            const group = categories.filter((category) => categoryKind(category) === kind);
            if (group.length === 0) return null;
            return (
              <FilterGroup key={kind} title={KIND_LABEL[kind]}>
                {group.map((category) => (
                  <FilterLink key={category.slug} href={hrefFor(base, viewParams, { kind, category: category.slug })} active={params.category === category.slug} count={category.count}>
                    {category.name}
                  </FilterLink>
                ))}
              </FilterGroup>
            );
          })
        ))}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 lg:mt-7">
      <p className="mb-2 px-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">{title}</p>
      <ul className="flex flex-wrap gap-1 lg:block lg:space-y-0.5">{children}</ul>
    </div>
  );
}

function FilterLink({ href, active, count, children }: { href: string; active: boolean; count?: number; children: React.ReactNode }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex items-center justify-between gap-3 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[14px] transition",
          active ? "bg-brand-soft font-semibold text-brand-text" : "text-ink-soft hover:bg-band hover:text-ink",
          "max-lg:border max-lg:border-line",
        )}
      >
        {children}
        {count !== undefined && <span className="text-[12px] tabular-nums text-muted max-lg:hidden">{count}</span>}
      </Link>
    </li>
  );
}

function Pagination({ base, params, page, pages }: { base: string; params: BrowseParams; page: number; pages: number }) {
  const link = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, page: target > 1 ? String(target) : undefined })) if (value) search.set(key, value);
    const query = search.toString();
    return query ? `${base}?${query}` : base;
  };
  const numbers = Array.from({ length: pages }, (_, index) => index + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 && (
        <Link href={link(page - 1)} rel="prev" className="h-9 rounded-lg border border-line px-3 text-[14px] font-medium leading-9 hover:border-line-strong">
          Previous
        </Link>
      )}
      {numbers.map((n, index) => (
        <span key={n} className="flex items-center gap-1">
          {index > 0 && numbers[index - 1] !== n - 1 && <span className="px-1 text-muted">…</span>}
          <Link href={link(n)} aria-current={n === page ? "page" : undefined} className={cn("grid h-9 min-w-9 place-items-center rounded-lg px-2 text-[14px] font-medium tabular-nums", n === page ? "bg-ink text-bg" : "hover:bg-band")}>
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={link(page + 1)} rel="next" className="h-9 rounded-lg border border-line px-3 text-[14px] font-medium leading-9 hover:border-line-strong">
          Next
        </Link>
      )}
    </nav>
  );
}
