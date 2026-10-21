"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, Plus } from "lucide-react";
import type { Account, ListingCard } from "@/lib/types";
import { ListingLogo } from "@/components/listing-logo";
import { cn, formatDate } from "@/lib/format";

type OwnListing = ListingCard & { status: "pending" | "published" | "rejected" };

const STATUS: Record<OwnListing["status"], { label: string; className: string; hint: string }> = {
  pending: { label: "In review", className: "bg-warn-soft text-warn-text", hint: "We are reviewing it." },
  published: { label: "Live", className: "bg-brand-soft text-brand-text", hint: "Visible on Ahsan Hub." },
  rejected: { label: "Not approved", className: "bg-danger-soft text-danger", hint: "Email us if you want to know why." },
};

export function AccountListings() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [items, setItems] = useState<OwnListing[]>([]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ user: null }));
      if (!me.user) {
        router.replace("/login");
        return;
      }
      setAccount(me.user);
      const list = await fetch("/api/account/listings", { cache: "no-store" }).then((response) => response.json());
      setItems(list.items ?? []);
    })();
  }, [router]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  if (!account) return <p className="py-20 text-center text-[15px] text-muted">Loading your listings…</p>;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[14px] text-muted">{account.email}</p>
          {account.emailVerified === false && (
            <p className="mt-2 text-[13px] text-warn-text">Your email is not verified yet. Open the link we sent, or keep using the site.</p>
          )}
          <h1 className="mt-1 text-[34px] font-semibold tracking-[-0.03em] text-ink">My listings</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-[14px] font-medium text-ink-soft hover:border-line-strong hover:text-ink">
            <LogOut size={15} /> Sign out
          </button>
          <Link href="/submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover">
            <Plus size={16} /> New listing
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-[16px] font-semibold text-ink">No listings yet</p>
          <p className="mt-1 text-[14px] text-muted">Submit your first product and it will appear here.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
          {items.map((item) => {
            const status = STATUS[item.status];
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <ListingLogo src={item.logo} name={item.name} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-semibold text-ink">{item.name}</p>
                    <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-[12px] font-semibold", status.className)}>{status.label}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {status.hint}
                    {item.publishedAt && ` Live since ${formatDate(item.publishedAt)}.`} {item.voteCount} upvotes.
                  </p>
                </div>
                {item.status === "published" && (
                  <Link href={`/product/${item.slug}`} className="h-9 rounded-lg px-3 text-[14px] font-medium leading-9 text-ink-soft hover:bg-band hover:text-ink">
                    View
                  </Link>
                )}
                <Link href={`/account/listings/${item.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[14px] font-medium text-ink hover:border-line-strong">
                  <Pencil size={14} /> Edit
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
