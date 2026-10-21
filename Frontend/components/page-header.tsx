import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/section";

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-soft">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ crumbs, title, description, children }: { crumbs: { href?: string; label: string }[]; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="border-b border-line bg-band">
      <Container className="py-10 sm:py-12">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[42px]">{title}</h1>
        {description && <p className="mt-3 max-w-[64ch] text-[16px] leading-relaxed text-muted">{description}</p>}
        {children}
      </Container>
    </section>
  );
}
