import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeader({ eyebrow, title, description, href, linkLabel = "View all" }: { eyebrow?: string; title: string; description?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-brand-text">{eyebrow}</p>}
        <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[30px]">{title}</h2>
        {description && <p className="mt-2 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-[14px] font-medium text-ink transition hover:border-line-strong">
          {linkLabel}
          <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1240px] px-5 ${className}`}>{children}</div>;
}
