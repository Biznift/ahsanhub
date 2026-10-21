import Link from "next/link";
import { cn } from "@/lib/format";

/** The mark is an arch: a doorway, and a quiet nod to the mihrab. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-8 w-8", className)}>
      <rect width="32" height="32" rx="8" fill="#0B6E4F" />
      <path d="M9.5 24.5V15.2a6.5 6.5 0 0 1 13 0v9.3h-3.4v-9.3a3.1 3.1 0 0 0-6.2 0v9.3z" fill="#FFFFFF" />
      <circle cx="16" cy="6.9" r="1.6" fill="#FFFFFF" />
    </svg>
  );
}

export function Logo({ name = "Ahsan Hub", className }: { name?: string; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label={`${name} home`}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{name}</span>
    </Link>
  );
}
