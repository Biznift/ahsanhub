"use client";

import { FormEvent, useState } from "react";
import { Trash2 } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, TextInput } from "@/components/ui";
import { Card, Empty, Thumb, api, useApi } from "@/components/admin-kit";

type Pin = {
  id: string;
  listing: { id: string; name: string; slug: string; logo: string | null; status: string; featured: boolean };
};

type Performance = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  featured: boolean;
  pinned: boolean;
  viewCount: number;
  promoImpressions: number;
  promoClicks: number;
  couponClicks: number;
  week: { views: number; impressions: number; clicks: number; couponClicks: number };
};

type SearchHit = { id: string; name: string; slug: string; logo: string | null; status: string };

export default function AdsPage() {
  const module = moduleBySlug("ads");
  const { notify } = useStore();
  const { data, reload } = useApi<{ pins: Pin[]; performance: Performance[] }>("/api/admin/ads");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) return setError("Type at least two letters.");
    setBusy(true);
    try {
      const body = await api<{ items: SearchHit[] }>(`/api/admin/listings?status=published&q=${encodeURIComponent(q)}`);
      setHits(body.items);
      setError(body.items.length === 0 ? "No published product matches." : null);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pin(listingId: string) {
    setBusy(true);
    try {
      await api("/api/admin/ads", { method: "POST", body: JSON.stringify({ listingId }) });
      setError(null);
      notify("Pinned");
      reload();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unpin(pinRow: Pin) {
    if (!window.confirm(`Stop pinning ${pinRow.listing.name}?`)) return;
    await api(`/api/admin/ads/${pinRow.id}`, { method: "DELETE" });
    notify("Pin removed");
    reload();
  }

  const pinnedIds = new Set(data?.pins.map((pinRow) => pinRow.listing.id) ?? []);

  return (
    <ModuleFrame module={module}>
      <Card
        title="How rotation works"
        description="Featured products are shown with the same card as the list or grid around them. On a product page, the same category comes first. A live coupon is more likely to be picked, and a product with fewer impressions catches up. Counts are unique visitors per day."
      >
        <ul className="grid gap-2 text-sm text-[#475467] sm:grid-cols-2">
          <li>Home, between sections</li>
          <li>Explore and category lists, every 8 rows</li>
          <li>Product page sidebar and mobile</li>
          <li>No banner, image, or video upload</li>
        </ul>
      </Card>

      <Card title="Pin a product" description="Featured products are already in the rotation. Pin a published product to add one that is not featured." className="mt-4">
        <form onSubmit={search} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field label="Search published products">
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product name" />
            </Field>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Searching…" : "Search"}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
        {hits.length > 0 && (
          <ul className="mt-4 divide-y divide-[#eef0f4]">
            {hits.map((hit) => (
              <li key={hit.id} className="flex items-center gap-3 py-2">
                <Thumb src={hit.logo} name={hit.name} />
                <p className="min-w-0 flex-1 truncate font-medium text-[#1d2939]">{hit.name}</p>
                {pinnedIds.has(hit.id) ? (
                  <span className="text-sm text-[#667085]">Pinned</span>
                ) : (
                  <Button type="button" tone="ghost" disabled={busy} onClick={() => pin(hit.id)}>
                    Pin
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Pinned now" className="mt-4">
        {data && data.pins.length === 0 && <Empty>No pins. Featured products still rotate.</Empty>}
        <ul className="divide-y divide-[#eef0f4]">
          {data?.pins.map((pinRow) => (
            <li key={pinRow.id} className="flex items-center gap-3 py-2">
              <Thumb src={pinRow.listing.logo} name={pinRow.listing.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#1d2939]">{pinRow.listing.name}</p>
                <p className="text-xs text-[#667085]">{pinRow.listing.featured ? "Also featured" : "Pinned only"} · {pinRow.listing.status}</p>
              </div>
              <button type="button" aria-label={`Unpin ${pinRow.listing.name}`} onClick={() => unpin(pinRow)} className="rounded-md p-2 text-[#b42318] hover:bg-[#fdecea]">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Performance" description="Views are product page opens. Impressions are times the product was shown as a featured placement. Clicks open the product. Coupon opens are people who asked for the code." className="mt-4">
        {data && data.performance.length === 0 && <Empty>Nothing is in rotation yet. Feature a listing, or pin one above.</Empty>}
        {data && data.performance.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 font-medium">In rotation</th>
                  <th className="py-2 text-right font-medium">Views</th>
                  <th className="py-2 text-right font-medium">Impressions</th>
                  <th className="py-2 text-right font-medium">Clicks</th>
                  <th className="py-2 text-right font-medium">Coupon</th>
                  <th className="py-2 text-right font-medium">7-day views</th>
                </tr>
              </thead>
              <tbody>
                {data.performance.map((row) => (
                  <tr key={row.id} className="border-t border-[#eef0f4]">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Thumb src={row.logo} name={row.name} />
                        <span className="font-medium text-[#1d2939]">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-[#475467]">{row.featured && row.pinned ? "Featured and pinned" : row.featured ? "Featured" : "Pinned"}</td>
                    <td className="py-2 text-right tabular-nums">{row.viewCount.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{row.promoImpressions.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{row.promoClicks.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{row.couponClicks.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{row.week.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </ModuleFrame>
  );
}
