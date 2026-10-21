import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-5 py-28 text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-text">404</p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.025em] text-ink">This page is not here</h1>
      <p className="mt-3 text-[15px] text-muted">The product may have been renamed or is still being reviewed.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/explore" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-hover">
          Explore products
        </Link>
        <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-line px-5 text-[15px] font-semibold text-ink hover:border-line-strong">
          Home
        </Link>
      </div>
    </div>
  );
}
