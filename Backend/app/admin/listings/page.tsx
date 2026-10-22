"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, TextInput, cn } from "@/components/ui";
import { ConfirmDialog, Empty, StatusPill, Switch, Thumb, api, formatDate, useApi } from "@/components/admin-kit";

type AdminListingRow = {
  id: string;
  slug: string;
  name: string;
  overview: string;
  logo: string | null;
  pricing: string;
  status: "pending" | "published" | "rejected";
  featured: boolean;
  sponsored: boolean;
  halalVerified: boolean;
  voteCount: number;
  website: string;
  contactEmail: string;
  ownerEmail: string | null;
  categories: { name: string; slug: string }[];
  createdAt: string;
};

const TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

export default function ListingsPage() {
  return (
    <Suspense>
      <ListingsScreen />
    </Suspense>
  );
}

function ListingsScreen() {
  const module = moduleBySlug("listings");
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminListingRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { notify } = useStore();
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  if (submitted) search.set("q", submitted);
  const { data, error, loading, setData } = useApi<{ items: AdminListingRow[] }>(`/api/admin/listings?${search}`);

  async function patch(row: AdminListingRow, change: Partial<Pick<AdminListingRow, "status" | "featured" | "sponsored" | "halalVerified">>) {
    try {
      await api(`/api/admin/listings/${row.id}`, { method: "PATCH", body: JSON.stringify(change) });
      setData((current) =>
        current && {
          items: current.items
            .map((item) => (item.id === row.id ? { ...item, ...change } : item))
            .filter((item) => !status || item.status === status),
        },
      );
      if (change.status) notify(`${row.name} is ${change.status}`);
    } catch (problem) {
      notify((problem as Error).message);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api(`/api/admin/listings/${pendingDelete.id}`, { method: "DELETE" });
      setData((current) => current && { items: current.items.filter((item) => item.id !== pendingDelete.id) });
      notify(`${pendingDelete.name} permanently deleted`);
      setPendingDelete(null);
    } catch (problem) {
      notify((problem as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ModuleFrame module={module}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-[#e6e8ef] bg-white p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => router.replace(tab.value ? `/admin/listings?status=${tab.value}` : "/admin/listings")}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", status === tab.value ? "bg-[#0b6e4f] text-white" : "text-[#475467] hover:bg-[#f5f6fa]")}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(query.trim());
          }}
        >
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, or website" className="w-64" />
          <Button type="submit" tone="ghost">
            Search
          </Button>
        </form>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      {!loading && data?.items.length === 0 && <div className="mt-4"><Empty>No listings here.</Empty></div>}

      {data && data.items.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#e6e8ef] bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-[#e6e8ef] text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-center font-medium">Featured</th>
                <th className="px-3 py-3 text-center font-medium">Sponsored</th>
                <th className="px-3 py-3 text-center font-medium">Halal</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => {
                const canSponsor = row.pricing === "free" || row.pricing === "freemium";
                return (
                  <tr key={row.id} className="border-t border-[#eef0f4] align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb src={row.logo} name={row.name} />
                        <div className="min-w-0">
                          <Link href={`/admin/listings/${row.id}`} className="font-semibold text-[#1d2939] hover:text-[#0b6e4f]">
                            {row.name}
                          </Link>
                          <p className="max-w-[320px] truncate text-xs text-[#667085]">{row.categories.map((item) => item.name).join(", ")}</p>
                          <p className="text-xs text-[#98a2b3]">
                            {formatDate(row.createdAt)} · {row.pricing.replace("_", " ")} · {row.voteCount} votes
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#344054]">{row.ownerEmail ?? row.contactEmail}</p>
                      <p className="text-xs text-[#98a2b3]">{row.ownerEmail ? "Owner account" : "No account"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Switch label="Featured" checked={row.featured} onChange={(featured) => patch(row, { featured })} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Switch
                        label={canSponsor ? "Sponsored" : "Only free or freemium listings can be sponsored"}
                        checked={row.sponsored}
                        disabled={!canSponsor && !row.sponsored}
                        onChange={(sponsored) => patch(row, { sponsored })}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Switch label="Halal verified" checked={row.halalVerified} onChange={(halalVerified) => patch(row, { halalVerified })} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {row.status !== "published" && (
                          <Button type="button" className="px-3 py-1.5 text-sm" onClick={() => patch(row, { status: "published" })}>
                            Approve
                          </Button>
                        )}
                        {row.status !== "rejected" && (
                          <Button type="button" tone="danger" className="px-3 py-1.5 text-sm" onClick={() => patch(row, { status: "rejected" })}>
                            Reject
                          </Button>
                        )}
                        <a href={row.website} target="_blank" rel="noreferrer" className="rounded-md p-2 text-[#667085] hover:bg-[#f5f6fa]" title="Open website">
                          <ExternalLink size={15} />
                        </a>
                        <Link href={`/admin/listings/${row.id}`} className="rounded-md px-2 py-1.5 text-sm font-medium text-[#0b6e4f] hover:bg-[#e7f3ee]">
                          Edit
                        </Link>
                        <Button type="button" tone="danger" className="px-3 py-1.5 text-sm" onClick={() => setPendingDelete(row)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Permanently delete this listing?"
          body={`${pendingDelete.name} will be removed from the site, along with its reviews, votes, and files. This cannot be undone.`}
          confirmLabel="Permanently delete"
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={remove}
        />
      )}
    </ModuleFrame>
  );
}
