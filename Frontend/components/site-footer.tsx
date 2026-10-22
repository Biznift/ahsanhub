import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { SocialLinks } from "@/components/social-links";
import type { Category, Site } from "@/lib/types";

export function SiteFooter({ site, categories }: { site: Site; categories: Category[] }) {
  const top = [...categories].sort((a, b) => b.count - a.count).slice(0, 6);
  return (
    <footer className="mt-24 border-t border-line bg-band">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <LogoMark src={site.logo} />
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{site.name}</span>
          </Link>
          <p className="mt-4 text-[14px] leading-relaxed text-muted">{site.tagline}</p>
          <div className="mt-5">
            <SocialLinks socials={site.socials} size="sm" owner={site.name} />
          </div>
        </div>
        <FooterColumn title="Discover" links={[["/explore", "All products"], ["/explore?sort=top", "Top rated"], ["/explore?sort=new", "Newest"], ["/blog", "Blog"], ["/categories", "Categories"]]} />
        <FooterColumn title="Popular categories" links={top.map((category) => [`/category/${category.slug}`, category.name])} />
        <FooterColumn title="For makers" links={[["/submit", "Submit a product"], ["/account", "My listings"], ["/login", "Sign in"], ["/contact", "Contact"]]} />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-muted">
          <p>
            © {new Date().getFullYear()} {site.name}. Listings are submitted by their makers and reviewed before publishing.
          </p>
          <a href={`mailto:${site.contactEmail}`} className="hover:text-ink">
            {site.contactEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-[14px] text-muted transition hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
