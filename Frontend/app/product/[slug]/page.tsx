import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { getListing, getReviews } from "@/lib/api";
import { PLATFORM_LABEL, PRICING_LABEL, SITE_URL, absolute, formatDate, hostOf } from "@/lib/format";
import { Container } from "@/components/section";
import { Breadcrumbs } from "@/components/page-header";
import { ListingLogo } from "@/components/listing-logo";
import { UpvoteButton } from "@/components/upvote-button";
import { AlternativeLinks, CategoryChip, HalalBadge, KindBadge, PricingBadge } from "@/components/badges";
import { SocialLinks } from "@/components/social-links";
import { AdSlot } from "@/components/ad-slot";
import { ProductRow } from "@/components/product-card";
import { ReviewForm } from "@/components/review-form";
import { Stars } from "@/components/stars";
import { JsonLd } from "@/components/json-ld";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: "Product not found", robots: { index: false } };
  const image = listing.banner ?? listing.logo;
  return {
    title: `${listing.name}: ${listing.categories[0]?.name ?? "Product"} reviews, pricing and founders`,
    description: listing.overview,
    alternates: { canonical: `/product/${slug}` },
    openGraph: { type: "website", title: listing.name, description: listing.overview, url: `/product/${slug}`, images: image ? [{ url: absolute(image) }] : undefined },
    twitter: { card: listing.banner ? "summary_large_image" : "summary", title: listing.name, description: listing.overview },
  };
}

function visitUrl(website: string) {
  try {
    const url = new URL(website);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "#";
    url.searchParams.set("ref", "ahsanhub");
    return url.toString();
  } catch {
    return "#";
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [listing, reviews] = await Promise.all([getListing(slug), getReviews(slug)]);
  if (!listing) notFound();
  const primary = listing.categories[0];
  const visit = visitUrl(listing.website);
  const facts = [
    { label: "Website", value: <a href={visit} target="_blank" rel="noopener" className="font-medium text-brand-text hover:underline">{hostOf(listing.website)}</a> },
    { label: "Pricing", value: PRICING_LABEL[listing.pricing] },
    listing.platforms.length > 0 && { label: "Platforms", value: listing.platforms.map((item) => PLATFORM_LABEL[item] ?? item).join(", ") },
    listing.country && { label: "Based in", value: listing.country },
    { label: "Listed", value: formatDate(listing.publishedAt) },
    { label: "Upvotes", value: <span className="tabular-nums">{listing.voteCount}</span> },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  return (
    <>
      <Container className="pt-8">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            ...(primary ? [{ href: `/category/${primary.slug}`, label: primary.name }] : [{ href: "/explore", label: "Explore" }]),
            { label: listing.name },
          ]}
        />

        <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <ListingLogo src={listing.logo} name={listing.name} size={88} className="shadow-[0_1px_0_var(--line)]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[40px]">{listing.name}</h1>
              {listing.featured && <span className="inline-flex h-6 items-center rounded-md bg-ink px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-bg">Featured</span>}
            </div>
            <p className="mt-2 max-w-[60ch] text-[17px] leading-relaxed text-muted">{listing.overview}</p>
            {(listing.alternatives ?? []).length > 0 && (
              <div className="mt-3">
                <AlternativeLinks items={listing.alternatives} limit={5} />
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <KindBadge kind={listing.kind} />
              <PricingBadge pricing={listing.pricing} />
              {listing.halalVerified && <HalalBadge />}
              {listing.rating && listing.rating.count > 0 && (
                <a href="#reviews" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
                  <Stars value={listing.rating.average} size={13} />
                  {listing.rating.average.toFixed(1)} · {listing.rating.count} {listing.rating.count === 1 ? "review" : "reviews"}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <UpvoteButton id={listing.id} slug={listing.slug} count={listing.voteCount} size="lg" name={listing.name} />
            <span className="text-[12px] text-muted sm:text-right">No account needed</span>
          </div>
        </header>
      </Container>

      <Container className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {listing.banner && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.banner} alt={`${listing.name} preview`} width={1600} height={900} className="aspect-video w-full rounded-2xl border border-line bg-band object-cover" />
          )}

          <div className={`flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6 ${listing.banner ? "mt-6" : ""}`}>
            <div className="flex flex-wrap gap-1.5">
              {listing.categories.map((category) => (
                <CategoryChip key={category.slug} category={category} />
              ))}
            </div>
            <a href={visit} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-semibold text-white transition hover:bg-brand-hover">
              Visit website <ArrowUpRight size={17} />
            </a>
          </div>

          <section className="mt-10" aria-labelledby="about">
            <h2 id="about" className="text-[20px] font-semibold tracking-[-0.015em] text-ink">
              About {listing.name}
            </h2>
            <div className="prose-listing mt-4" dangerouslySetInnerHTML={{ __html: listing.description }} />
          </section>

          <AdSlot placement="product-mobile" className="mt-10 lg:hidden" />

          {Object.keys(listing.socials).length > 0 && (
            <section className="mt-12" aria-labelledby="links">
              <h2 id="links" className="text-[20px] font-semibold tracking-[-0.015em] text-ink">
                Follow {listing.name}
              </h2>
              <div className="mt-4">
                <SocialLinks socials={listing.socials} owner={listing.name} />
              </div>
            </section>
          )}

          {listing.founders.length > 0 && (
            <section className="mt-12" aria-labelledby="founders">
              <h2 id="founders" className="text-[20px] font-semibold tracking-[-0.015em] text-ink">
                {listing.founders.length === 1 ? "Founder" : "Founders"}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {listing.founders.map((founder) => (
                  <article key={founder.id} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-center gap-4">
                      {founder.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={founder.photo} alt={founder.name} width={56} height={56} loading="lazy" className="h-14 w-14 rounded-full border border-line object-cover" />
                      ) : (
                        <span className="grid h-14 w-14 place-items-center rounded-full bg-band text-[18px] font-semibold text-muted" aria-hidden="true">
                          {founder.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-semibold text-ink">{founder.name}</h3>
                        {founder.role && <p className="text-[14px] text-muted">{founder.role}</p>}
                      </div>
                    </div>
                    {founder.bio && <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">{founder.bio}</p>}
                    <div className="mt-auto pt-4">
                      <SocialLinks socials={founder.socials} size="sm" owner={founder.name} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12" id="reviews" aria-labelledby="reviews-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="reviews-title" className="text-[20px] font-semibold tracking-[-0.015em] text-ink">
                Reviews
              </h2>
              {listing.rating && listing.rating.count > 0 && (
                <p className="flex items-center gap-2 text-[14px] text-muted">
                  <span className="text-[22px] font-semibold tabular-nums text-ink">{listing.rating.average.toFixed(1)}</span>
                  <Stars value={listing.rating.average} />
                  <span>
                    {listing.rating.count} {listing.rating.count === 1 ? "review" : "reviews"}
                  </span>
                </p>
              )}
            </div>
            {reviews.length > 0 && (
              <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
                {reviews.map((review) => (
                  <li key={review.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[15px] font-semibold text-ink">{review.name}</span>
                      <Stars value={review.rating} size={13} />
                      <time dateTime={review.createdAt} className="text-[13px] text-muted">
                        {formatDate(review.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{review.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5">
              <ReviewForm slug={listing.slug} name={listing.name} />
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:pt-0">
          <div className="rounded-2xl border border-line bg-surface">
            <dl className="divide-y divide-line">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-baseline justify-between gap-4 px-5 py-3 text-[14px]">
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="text-right text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {listing.halalNote && (
            <div className="rounded-2xl border border-brand-line bg-brand-soft p-5">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-text">
                <BadgeCheck size={15} /> Halal practices
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{listing.halalNote}</p>
            </div>
          )}

          <AdSlot placement="product-sidebar" className="hidden lg:block" />

          {listing.related.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[13px] font-semibold text-ink">Similar products</p>
              <div className="-mx-3">
                {listing.related.map((item) => (
                  <ProductRow key={item.id} listing={item} compact />
                ))}
              </div>
            </div>
          )}

          <div className="hidden lg:sticky lg:top-24 lg:block">
            <AdSlot placement="product-sidebar-tall" />
          </div>

          <p className="px-1 text-[12px] leading-relaxed text-muted">
            Is this your product?{" "}
            <Link href="/account" className="font-medium text-brand-text">
              Manage the listing
            </Link>
          </p>
        </aside>
      </Container>

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: listing.name,
            description: listing.overview,
            url: `${SITE_URL}/product/${listing.slug}`,
            sameAs: [listing.website, ...Object.values(listing.socials)],
            image: listing.logo ? absolute(listing.logo) : undefined,
            applicationCategory: primary?.name ?? "BusinessApplication",
            operatingSystem: listing.platforms.map((item) => PLATFORM_LABEL[item] ?? item).join(", ") || undefined,
            offers: listing.pricing === "free" || listing.pricing === "open_source" ? { "@type": "Offer", price: 0, priceCurrency: "USD" } : undefined,
            author: listing.founders.map((founder) => ({ "@type": "Person", name: founder.name, jobTitle: founder.role || undefined })),
            aggregateRating:
              listing.rating && listing.rating.count > 0 ? { "@type": "AggregateRating", ratingValue: listing.rating.average, reviewCount: listing.rating.count, bestRating: 5, worstRating: 1 } : undefined,
            review: reviews.slice(0, 10).map((review) => ({
              "@type": "Review",
              author: { "@type": "Person", name: review.name },
              datePublished: review.createdAt,
              reviewBody: review.body,
              reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              ...(primary ? [{ "@type": "ListItem", position: 2, name: primary.name, item: `${SITE_URL}/category/${primary.slug}` }] : []),
              { "@type": "ListItem", position: primary ? 3 : 2, name: listing.name, item: `${SITE_URL}/product/${listing.slug}` },
            ],
          },
        ]}
      />
    </>
  );
}
