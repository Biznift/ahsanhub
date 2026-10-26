"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { Card, Empty, StatusPill, Thumb, formatDate, useApi } from "@/components/admin-kit";

type Stats = {
  published: number;
  pending: number;
  rejected: number;
  pendingReviews: number;
  owners: number;
  votesThisWeek: number;
  newThisWeek: number;
  featuredLive: number;
  latest: { id: string; name: string; slug: string; status: string; logo: string | null; createdAt: string; ownerId: string | null }[];
};

export default function DashboardPage() {
  const module = moduleBySlug("dashboard");
  const { data, error } = useApi<Stats>("/api/admin/stats");

  const tiles = data
    ? [
        { label: "Waiting for review", value: data.pending, href: "/admin/listings?status=pending", accent: data.pending > 0 },
        { label: "Reviews to approve", value: data.pendingReviews, href: "/admin/reviews", accent: data.pendingReviews > 0 },
        { label: "Published listings", value: data.published, href: "/admin/listings?status=published" },
        { label: "Owner accounts", value: data.owners, href: "/admin/users" },
        { label: "Upvotes, last 7 days", value: data.votesThisWeek },
        { label: "Submissions, last 7 days", value: data.newThisWeek },
        { label: "Rejected", value: data.rejected, href: "/admin/listings?status=rejected" },
        { label: "Featured in rotation", value: data.featuredLive, href: "/admin/ads" },
      ]
    : [];

  return (
    <ModuleFrame module={module}>
      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <p className="text-sm text-[#667085]">{tile.label}</p>
              <p className={`mt-2 text-3xl font-semibold tracking-tight ${tile.accent ? "text-[#0b6e4f]" : "text-[#1d2939]"}`}>{tile.value}</p>
            </>
          );
          return tile.href ? (
            <Link key={tile.label} href={tile.href} className="rounded-xl border border-[#e6e8ef] bg-white p-4 transition hover:border-[#0b6e4f]">
              {body}
            </Link>
          ) : (
            <div key={tile.label} className="rounded-xl border border-[#e6e8ef] bg-white p-4">
              {body}
            </div>
          );
        })}
      </div>

      <Card
        title="Latest submissions"
        className="mt-6"
        action={
          <Link href="/admin/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0b6e4f]">
            All listings <ArrowRight size={14} />
          </Link>
        }
      >
        {data && data.latest.length === 0 && <Empty>No submissions yet.</Empty>}
        <ul className="divide-y divide-[#eef0f4]">
          {data?.latest.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/listings/${row.id}`} className="flex items-center gap-3 py-3 hover:bg-[#f9fafb]">
                <Thumb src={row.logo} name={row.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#1d2939]">{row.name}</p>
                  <p className="text-xs text-[#667085]">
                    {formatDate(row.createdAt)} · {row.ownerId ? "Has owner account" : "No account, admin edits"}
                  </p>
                </div>
                <StatusPill status={row.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </ModuleFrame>
  );
}
