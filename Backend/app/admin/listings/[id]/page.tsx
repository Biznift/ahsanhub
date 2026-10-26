"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { useStore } from "@/components/store";
import { Button, cn } from "@/components/ui";
import { Card, ConfirmDialog, StatusPill, Switch, Thumb, api, formatDate, useApi } from "@/components/admin-kit";
import { ListingEditor, type EditableListing } from "@/components/listing-editor";
import { formatListingCopy } from "@/lib/listing-copy";

type Listing = EditableListing & {
  id: string;
  slug: string;
  status: "pending" | "published" | "rejected";
  featured: boolean;
  sponsored: boolean;
  halalVerified: boolean;
  socialPosted: boolean;
  categories: { name: string; slug: string }[];
  voteCount: number;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { notify } = useStore();
  const { data, error, setData } = useApi<Listing>(`/api/admin/listings/${id}`);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function patch(change: Partial<Pick<Listing, "status" | "featured" | "sponsored" | "halalVerified" | "socialPosted">>) {
    try {
      setData(await api<Listing>(`/api/admin/listings/${id}`, { method: "PATCH", body: JSON.stringify(change) }));
      notify("Saved");
    } catch (problem) {
      notify((problem as Error).message);
    }
  }

  async function remove() {
    if (!data) return;
    setDeleting(true);
    try {
      await api(`/api/admin/listings/${id}`, { method: "DELETE" });
      notify(`${data.name} permanently deleted`);
      router.replace("/admin/listings");
    } catch (problem) {
      notify((problem as Error).message);
      setDeleting(false);
    }
  }

  if (error) return <p className="text-sm text-[var(--danger)]">{error}</p>;
  if (!data) return <p className="text-sm text-[#667085]">Loading…</p>;
  const canSponsor = data.pricing === "free" || data.pricing === "freemium";

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/listings" className="inline-flex items-center gap-1 text-sm font-medium text-[#667085] hover:text-[#0b6e4f]">
        <ArrowLeft size={15} /> Listings
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Thumb src={data.logo} name={data.name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d2939]">{data.name}</h1>
            <StatusPill status={data.status} />
          </div>
          <p className="mt-1 text-sm text-[#667085]">
            Submitted {formatDate(data.createdAt)} · {data.voteCount} upvotes · {data.ownerId ? "Owner can edit from their account" : "No account. Only admins can edit this listing."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            tone="ghost"
            className="px-3 py-2 text-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(formatListingCopy(data));
                notify("Copied");
              } catch (problem) {
                notify((problem as Error).message);
              }
            }}
          >
            Copy
          </Button>
          <button
            type="button"
            onClick={() => patch({ socialPosted: !data.socialPosted })}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium",
              data.socialPosted ? "bg-[#0b6e4f] text-white" : "border border-[#e6e8ef] bg-white text-[#344054] hover:bg-[#f5f6fa]",
            )}
          >
            {data.socialPosted && <Check size={14} />}
            Posted
          </button>
          {data.status === "published" && (
            <a href={`${SITE}/product/${data.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e8ef] bg-white px-3 py-2 text-sm font-medium text-[#344054] hover:border-[#0b6e4f]">
              View on site <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      <Card title="Moderation" className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={data.status === "published"} onClick={() => patch({ status: "published" })}>
            Approve and publish
          </Button>
          <Button type="button" tone="ghost" disabled={data.status === "pending"} onClick={() => patch({ status: "pending" })}>
            Back to pending
          </Button>
          <Button type="button" tone="danger" disabled={data.status === "rejected"} onClick={() => patch({ status: "rejected" })}>
            Reject
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Toggle label="Featured" hint="Shown in the home page Featured row" checked={data.featured} onChange={(featured) => patch({ featured })} />
          <Toggle
            label="Sponsored"
            hint={canSponsor ? "Fills ad slots that have no banner" : "Only free or freemium listings"}
            checked={data.sponsored}
            disabled={!canSponsor && !data.sponsored}
            onChange={(sponsored) => patch({ sponsored })}
          />
          <Toggle label="Halal verified" hint="Shows the verified badge" checked={data.halalVerified} onChange={(halalVerified) => patch({ halalVerified })} />
        </div>
      </Card>

      <div className="mt-6">
        <ListingEditor
          key={data.updatedAt}
          listing={data}
          onSave={async (form) => {
            setData(await api<Listing>(`/api/admin/listings/${id}`, { method: "PUT", body: form }));
            notify("Content saved");
          }}
        />
      </div>

      <Card title="Danger zone" className="mt-6">
        <p className="mb-3 text-sm text-[#667085]">Permanently delete removes this listing, its reviews, votes, and files. This cannot be undone.</p>
        <Button type="button" tone="danger" onClick={() => setConfirmDelete(true)}>
          Permanently delete
        </Button>
      </Card>

      {confirmDelete && (
        <ConfirmDialog
          title={`Permanently delete ${data.name}?`}
          body="This listing will be removed from the site, along with its reviews, votes, and files. This cannot be undone."
          confirmLabel="Yes, permanently delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[#eef0f4] p-3">
      <div>
        <p className="text-sm font-semibold text-[#1d2939]">{label}</p>
        <p className="text-xs text-[#667085]">{hint}</p>
      </div>
      <Switch label={label} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}
