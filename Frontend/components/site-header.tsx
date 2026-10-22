import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { AccountLink } from "@/components/account-link";
import { NAV_LINKS } from "@/components/nav-links";

export function SiteHeader({
  name,
  announcement,
  logo,
  showBismillah,
}: {
  name: string;
  announcement: string;
  logo?: string;
  showBismillah?: boolean;
}) {
  return (
    <>
      {showBismillah && (
        <div
          lang="ar"
          dir="rtl"
          className="border-b border-line bg-band px-4 py-1.5 text-center text-[15px] leading-none text-ink-soft"
        >
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
      )}
      {announcement && (
        <div className="border-b border-line bg-ink px-4 py-2 text-center text-[13px] font-medium text-bg">{announcement}</div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-glass backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5">
          <Logo name={name} src={logo} />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-[14px] font-medium text-ink-soft transition hover:bg-band hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/explore#search" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-band hover:text-ink" aria-label="Search products">
              <Search size={17} />
            </Link>
            <ThemeToggle />
            <AccountLink className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-ink-soft transition hover:bg-band hover:text-ink md:block" />
            <Link href="/submit" className="hidden h-9 items-center rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition hover:bg-brand-hover md:inline-flex">
              Submit product
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>
    </>
  );
}
