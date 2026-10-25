"use client";

import { FormEvent, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Trash2 } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, TextInput } from "@/components/ui";
import { Card, Empty, StatusPill, Switch, Thumb, api, useApi } from "@/components/admin-kit";

type ListingPick = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  website: string;
  status: string;
};

type Deal = {
  id: string;
  code: string;
  note: string;
  ctaEnabled: boolean;
  ctaLabel: string;
  ctaUrl: string;
  active: boolean;
  sortOrder: number;
  listing: ListingPick;
};

const emptyForm = { code: "", note: "", ctaEnabled: false, ctaLabel: "", ctaUrl: "", active: true };

export default function CouponCodesPage() {
  const module = moduleBySlug("coupon-codes");
  const { notify } = useStore();
  const { data, reload, setData } = useApi<{ items: Deal[] }>("/api/admin/coupon-codes");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListingPick[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ListingPick | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setField<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setSelected(null);
    setForm(emptyForm);
    setError(null);
  }

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setSearching(true);
    try {
      const result = await api<{ items: ListingPick[] }>(`/api/admin/listings?status=published&q=${encodeURIComponent(query.trim())}`);
      setResults(result.items.slice(0, 8));
      setError(null);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setSearching(false);
    }
  }

  function edit(deal: Deal) {
    setEditingId(deal.id);
    setSelected(deal.listing);
    setForm({
      code: deal.code,
      note: deal.note,
      ctaEnabled: deal.ctaEnabled,
      ctaLabel: deal.ctaLabel,
      ctaUrl: deal.ctaUrl,
      active: deal.active,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return setError("Pick a product that is already published.");
    if (form.code.trim().length < 2) return setError("Enter a coupon code.");
    if (form.ctaEnabled && !form.ctaUrl.trim()) return setError("Add the offer link, or turn the special call to action off.");
    const body = {
      listingId: selected.id,
      code: form.code.trim(),
      note: form.note.trim(),
      ctaEnabled: form.ctaEnabled,
      ctaLabel: form.ctaLabel.trim(),
      ctaUrl: form.ctaUrl.trim(),
      active: form.active,
    };
    setBusy(true);
    try {
      if (editingId) {
        await api(`/api/admin/coupon-codes/${editingId}`, { method: "PATCH", body: JSON.stringify(body) });
        notify("Deal updated");
      } else {
        await api("/api/admin/coupon-codes", { method: "POST", body: JSON.stringify(body) });
        notify("Deal added");
      }
      resetForm();
      reload();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(deal: Deal, change: Partial<Deal>) {
    const next = await api<Deal>(`/api/admin/coupon-codes/${deal.id}`, { method: "PATCH", body: JSON.stringify(change) });
    setData((current) => current && { items: current.items.map((item) => (item.id === deal.id ? next : item)) });
    if (editingId === deal.id) {
      setForm((current) => ({ ...current, active: next.active, ctaEnabled: next.ctaEnabled }));
    }
  }

  async function remove(deal: Deal) {
    if (!window.confirm(`Remove the code ${deal.code} from ${deal.listing.name}? The listing stays on the site.`)) return;
    await api(`/api/admin/coupon-codes/${deal.id}`, { method: "DELETE" });
    if (editingId === deal.id) resetForm();
    notify("Deal removed");
    reload();
  }

  async function move(index: number, direction: -1 | 1) {
    const items = data?.items ?? [];
    const target = index + direction;
    if (!items[index] || !items[target]) return;
    const reordered = [...items];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    await Promise.all(
      reordered.map((deal, order) =>
        deal.sortOrder === order
          ? Promise.resolve()
          : api(`/api/admin/coupon-codes/${deal.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: order }) }),
      ),
    );
    reload();
  }

  const items = data?.items ?? [];

  return (
    <ModuleFrame module={module}>
      <Card
        title={editingId ? "Edit this deal" : "Add a coupon code"}
        description="Choose a product that is already listed. Visitors can copy the code. The button opens the product website unless you turn on a special call to action."
      >
        <form onSubmit={save} className="grid gap-4">
          <Field label="Product">
            <div className="flex gap-2">
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search published listings"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    search();
                  }
                }}
              />
              <Button type="button" tone="ghost" onClick={() => search()} disabled={searching}>
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
          </Field>
          {results.length > 0 && (
            <ul className="overflow-hidden rounded-lg border border-[#e6e8ef]">
              {results.map((listing) => (
                <li key={listing.id} className="border-t border-[#eef0f4] first:border-t-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(listing);
                      setResults([]);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f8f9fc]"
                  >
                    <Thumb src={listing.logo} name={listing.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[#1d2939]">{listing.name}</span>
                      <span className="block truncate text-sm text-[#667085]">{listing.website}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <div className="flex items-center gap-3 rounded-lg border border-[#cfe5db] bg-[#f3f9f6] px-3 py-2.5">
              <Thumb src={selected.logo} name={selected.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#1d2939]">{selected.name}</p>
                <p className="truncate text-sm text-[#667085]">Default link: {selected.website || "No website on this listing"}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Coupon code">
              <TextInput value={form.code} onChange={(event) => setField("code", event.target.value)} required maxLength={40} placeholder="AH10" className="font-mono" />
            </Field>
            <Field label="Deal note (optional)">
              <TextInput value={form.note} onChange={(event) => setField("note", event.target.value)} maxLength={180} placeholder="20% off the annual plan" />
            </Field>
          </div>

          <div className="rounded-lg border border-[#e6e8ef] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[#1d2939]">Special call to action</p>
                <p className="mt-1 text-sm leading-5 text-[#667085]">
                  Off, the coupon button opens the product website. On, that same button opens an affiliate link or a direct offer link. The product page keeps its own website.
                </p>
              </div>
              <Switch label="Special call to action" checked={form.ctaEnabled} onChange={(ctaEnabled) => setField("ctaEnabled", ctaEnabled)} />
            </div>
            {form.ctaEnabled && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Button label">
                  <TextInput value={form.ctaLabel} onChange={(event) => setField("ctaLabel", event.target.value)} maxLength={40} placeholder="Get this deal" />
                </Field>
                <Field label="Offer link">
                  <TextInput value={form.ctaUrl} onChange={(event) => setField("ctaUrl", event.target.value)} required placeholder="https://" />
                </Field>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-[#344054]">
            <Switch label="Show on the site" checked={form.active} onChange={(active) => setField("active", active)} />
            Show on the site
          </label>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Add deal"}
            </Button>
            {editingId && (
              <Button type="button" tone="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="mt-4 space-y-3">
        {items.length === 0 && <Empty>No coupon codes yet. Add one for a product that is already published.</Empty>}
        {items.map((deal, index) => {
          const destination = deal.ctaEnabled && deal.ctaUrl ? deal.ctaUrl : deal.listing.website;
          const label = deal.ctaEnabled ? deal.ctaLabel.trim() || "Get this deal" : "Visit website";
          return (
            <article key={deal.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e6e8ef] bg-white p-4">
              <Thumb src={deal.listing.logo} name={deal.listing.name} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[#1d2939]">{deal.listing.name}</p>
                  <StatusPill status={deal.listing.status} />
                  {!deal.active && <span className="text-xs font-semibold text-[#667085]">Hidden</span>}
                </div>
                <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-[#0b6e4f]">{deal.code}</p>
                {deal.note && <p className="mt-1 text-sm text-[#475467]">{deal.note}</p>}
                <p className="mt-1 flex items-center gap-1 text-xs text-[#667085]">
                  <span className="font-medium text-[#344054]">{label}</span>
                  {destination ? (
                    <a href={destination} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 text-[#0b6e4f]">
                      <span className="truncate">{destination}</span>
                      <ExternalLink size={12} className="shrink-0" />
                    </a>
                  ) : (
                    <span>No link on this listing</span>
                  )}
                </p>
                {deal.listing.status !== "published" && (
                  <p className="mt-1 text-xs text-[#9a5b00]">Hidden on the site until this listing is published again.</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#475467]">
                Live <Switch label={`Show ${deal.code}`} checked={deal.active} onChange={(active) => patch(deal, { active })} />
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-md p-2 text-[#475467] hover:bg-[#f5f6fa] disabled:opacity-30">
                  <ChevronUp size={16} />
                </button>
                <button type="button" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="rounded-md p-2 text-[#475467] hover:bg-[#f5f6fa] disabled:opacity-30">
                  <ChevronDown size={16} />
                </button>
                <Button type="button" tone="ghost" onClick={() => edit(deal)}>
                  Edit
                </Button>
                <button type="button" aria-label={`Remove ${deal.code}`} onClick={() => remove(deal)} className="rounded-md p-2 text-[#b42318] hover:bg-[#fdecea]">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </ModuleFrame>
  );
}
