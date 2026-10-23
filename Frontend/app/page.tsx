import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { getCategories, getListings } from "@/lib/api";
import { KIND_LABEL, LISTING_KINDS } from "@/lib/format";
import { Container, SectionHeader } from "@/components/section";
import { ProductCard, ProductRow } from "@/components/product-card";
import { AdSlot } from "@/components/ad-slot";
import { CategoryIcon } from "@/components/category-icon";

export default async function HomePage() {
  const [top, featured, recent, free, categories] = await Promise.all([
    getListings({ sort: "top", limit: 5 }),
    getListings({ sort: "featured", limit: 6 }),
    getListings({ sort: "new", limit: 8 }),
    getListings({ pricing: "free", sort: "top", limit: 3 }),
    getCategories(),
  ]);
  const popular = [...categories].sort((a, b) => b.count - a.count);
  const totalProducts = recent.total;

  return (
    <>
      <section className="border-b border-line">
        <Container className="grid gap-12 pb-16 pt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="flex flex-col justify-center">
            <p className="text-[13px] font-medium text-muted">
              <span className="font-semibold text-ink tabular-nums">{totalProducts}</span> products ·{" "}
              <span className="font-semibold text-ink tabular-nums">{categories.length}</span> categories · reviewed by hand
            </p>
            <h1 className="mt-5 max-w-[15ch] text-[42px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[56px]">
              Halal software, built by makers you can trust.
            </h1>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted">
              Ahsan Hub lists SaaS, apps and businesses that keep riba, gambling and harmful content out of their product. Upvote the tools you use, read honest reviews, and list your own for free.
            </p>
            <form action="/explore" className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface p-1.5 focus-within:border-brand">
              <Search size={18} className="ml-3 shrink-0 text-muted" aria-hidden="true" />
              <label htmlFor="hero-search" className="sr-only">
                Search products
              </label>
              <input id="hero-search" name="q" placeholder="Search bookkeeping, CRM, Quran apps…" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted" />
              <button type="submit" className="h-11 shrink-0 rounded-xl bg-brand px-5 text-[14px] font-semibold text-white transition hover:bg-brand-hover">
                Search
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {LISTING_KINDS.map((kind) => (
                <Link key={kind} href={`/explore?kind=${kind}`} className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold text-ink transition hover:border-brand">
                  {KIND_LABEL[kind]}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {popular.slice(0, 5).map((category) => (
                <Link key={category.slug} href={`/category/${category.slug}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium text-ink-soft transition hover:border-line-strong hover:text-ink">
                  <CategoryIcon slug={category.slug} size={14} />
                  {category.name}
                </Link>
              ))}
              <Link href="/explore" className="inline-flex h-8 items-center gap-1 px-2 text-[13px] font-semibold text-brand-text">
                Explore all products <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Most upvoted</h2>
                <p className="text-[13px] text-muted">Ranked by the community, no account needed to vote</p>
              </div>
              <Link href="/explore?sort=top" className="text-[13px] font-semibold text-brand-text">
                Full ranking
              </Link>
            </div>
            <div className="p-2">
              {top.items.length === 0 && <p className="px-3 py-10 text-center text-[14px] text-muted">The first products are being reviewed.</p>}
              {top.items.map((listing, index) => (
                <ProductRow key={listing.id} listing={listing} rank={index + 1} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      <Container className="mt-12">
        <AdSlot placement="home-leaderboard" />
      </Container>

      {featured.items.length > 0 && (
        <section className="mt-16">
          <Container>
            <SectionHeader eyebrow="Editor's picks" title="Featured products" description="Hand-picked by the Ahsan Hub team for quality, support and how they handle money and data." href="/explore?sort=featured" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.items.map((listing) => (
                <ProductCard key={listing.id} listing={listing} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="mt-20 border-y border-line bg-band py-16">
        <Container>
          <SectionHeader eyebrow="Fresh" title="Recently added" description="The newest products to pass review." href="/explore?sort=new" />
          {recent.items.length === 0 ? (
            <p className="text-[15px] text-muted">Nothing here yet.</p>
          ) : (
            <div className="grid gap-x-6 rounded-2xl border border-line bg-surface p-2 md:grid-cols-2">
              {recent.items.map((listing) => (
                <ProductRow key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {free.items.length > 0 && (
        <section className="mt-16">
          <Container>
            <SectionHeader eyebrow="No card needed" title="Free to use" description="Fully free products, ranked by upvotes." href="/explore?pricing=free&sort=top" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {free.items.map((listing) => (
                <ProductCard key={listing.id} listing={listing} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <Container className="mt-16">
        <AdSlot placement="home-leaderboard" />
      </Container>

      {categories.length > 0 && (
        <section className="mt-16">
          <Container>
            <SectionHeader title="Browse by category" description="One flat list, so a product can live in every category it serves." href="/categories" linkLabel="All categories" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {popular.slice(0, 12).map((category) => (
                <Link key={category.slug} href={`/category/${category.slug}`} className="group flex flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-band text-ink-soft transition group-hover:bg-brand-soft group-hover:text-brand-text">
                    <CategoryIcon slug={category.slug} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold leading-snug text-ink">{category.name}</span>
                    <span className="mt-0.5 block text-[13px] tabular-nums text-muted">
                      {category.count} {category.count === 1 ? "product" : "products"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="mt-20">
        <Container>
          <div className="grid gap-10 rounded-3xl bg-ink px-6 py-12 text-bg sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.025em] sm:text-[36px]">Built something halal? Put it in front of the people looking for it.</h2>
              <p className="mt-4 max-w-[48ch] text-[16px] leading-relaxed opacity-70">Listing is free. Add your company, founders and links in a few minutes, and we review every submission by hand.</p>
              <Link href="/submit" className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-semibold text-white transition hover:bg-brand-hover">
                Submit your product <ArrowRight size={16} />
              </Link>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-2xl border border-white/10 dark:border-black/10">
              {[
                ["Submit", "Company name, website, logo, description and founders."],
                ["Review", "We check the product and its halal practices, usually within a few days."],
                ["Go live", "Your page is indexed, upvoted and can be featured on the home page."],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-4 bg-white/[0.04] p-5 dark:bg-black/[0.04]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 text-[13px] font-semibold tabular-nums dark:border-black/20">{index + 1}</span>
                  <span>
                    <span className="block text-[15px] font-semibold">{title}</span>
                    <span className="mt-0.5 block text-[14px] leading-relaxed opacity-65">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>
    </>
  );
}
