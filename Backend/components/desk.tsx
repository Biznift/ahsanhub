import Link from "next/link";

const links = [
  { href: "/dashboard/referrals", label: "Member desk" },
  { href: "/checkout", label: "Checkout" },
  { href: "/register", label: "Register" },
  { href: "/admin/referrals", label: "Affiliates admin" },
];

export function Desk({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f6fa] px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link href="/admin" className="text-[28px] font-bold leading-none tracking-tight text-[#0b6e4f]">
          kit
        </Link>
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="font-medium text-[#0b6e4f] hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#1d2939]">{title}</h1>
        <p className="mt-2 max-w-2xl text-base leading-6 text-[#475467]">{lede}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
