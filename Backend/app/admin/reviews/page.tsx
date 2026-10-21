"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, cn } from "@/components/ui";
import { Empty, StatusPill, api, formatDate, useApi } from "@/components/admin-kit";

type Review = { id: string; name: string; rating: number; body: string; status: "pending" | "approved" | "hidden"; createdAt: string; listing: { name: string; slug: string } };

const TABS = ["pending", "approved", "hidden", ""] as const;

export default function ReviewsPage() {
  const module = moduleBySlug("reviews");
  const { notify } = useStore();
  const [status, setStatus] = useState<(typeof TABS)[number]>("pending");
  const { data, setData } = useApi<{ items: Review[] }>(`/api/admin/reviews${status ? `?status=${status}` : ""}`);

  async function setReview(review: Review, next: Review["status"]) {
    await api(`/api/admin/reviews/${review.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    setData((current) => current && { items: current.items.map((item) => (item.id === review.id ? { ...item, status: next } : item)).filter((item) => !status || item.status === status) });
    notify(`Review ${next}`);
  }

  async function remove(review: Review) {
    if (!window.confirm("Delete this review?")) return;
    await api(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
    setData((current) => current && { items: current.items.filter((item) => item.id !== review.id) });
  }

  return (
    <ModuleFrame module={module}>
      <div className="flex w-fit rounded-lg border border-[#e6e8ef] bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab || "all"}
            type="button"
            onClick={() => setStatus(tab)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium capitalize", status === tab ? "bg-[#0b6e4f] text-white" : "text-[#475467] hover:bg-[#f5f6fa]")}
          >
            {tab || "All"}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {data?.items.length === 0 && <Empty>No reviews here.</Empty>}
        {data?.items.map((review) => (
          <article key={review.id} className="rounded-xl border border-[#e6e8ef] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#1d2939]">{review.name}</span>
              <span className="flex text-[#b54708]" aria-label={`${review.rating} out of 5`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} size={14} fill={index < review.rating ? "currentColor" : "none"} />
                ))}
              </span>
              <span className="text-sm text-[#667085]">
                on <span className="font-medium text-[#344054]">{review.listing.name}</span> · {formatDate(review.createdAt)}
              </span>
              <span className="ml-auto">
                <StatusPill status={review.status} />
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-[#344054]">{review.body}</p>
            <div className="mt-3 flex gap-1">
              {review.status !== "approved" && (
                <Button type="button" className="px-3 py-1.5 text-sm" onClick={() => setReview(review, "approved")}>
                  Approve
                </Button>
              )}
              {review.status !== "hidden" && (
                <Button type="button" tone="ghost" className="px-3 py-1.5 text-sm" onClick={() => setReview(review, "hidden")}>
                  Hide
                </Button>
              )}
              <button type="button" aria-label="Delete review" onClick={() => remove(review)} className="ml-auto rounded-md p-2 text-[#b42318] hover:bg-[#fdecea]">
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </ModuleFrame>
  );
}
