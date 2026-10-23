"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Category, EditableListing } from "@/lib/types";
import { SubmitForm } from "@/components/submit-form";

export function EditListing({ id, categories }: { id: string; categories: Category[] }) {
  const router = useRouter();
  const [listing, setListing] = useState<EditableListing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/account/listings/${id}`, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return router.replace("/login");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load the listing.");
        setListing(body);
      })
      .catch((problem: Error) => setError(problem.message));
  }, [id, router]);

  return (
    <>
      <Link href="/account" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> My listings
      </Link>
      <h1 className="mb-8 mt-3 text-[32px] font-semibold tracking-[-0.03em] text-ink">{listing ? `Edit ${listing.name}` : "Edit listing"}</h1>
      {error && <p className="text-[15px] text-danger">{error}</p>}
      {!listing && !error && <p className="text-[15px] text-muted">Loading…</p>}
      {listing && <SubmitForm categories={categoriesWithHidden(categories, listing)} existing={listing} />}
    </>
  );
}

/** Keeps a category the listing already has even if it is no longer in the public list. */
function categoriesWithHidden(categories: Category[], listing: EditableListing) {
  const known = new Set(categories.map((item) => item.id));
  const extra = listing.categories
    .map((item, index) => ({
      id: listing.categoryIds[index],
      name: item.name,
      slug: item.slug,
      description: "",
      count: 0,
      kind: listing.kind,
      status: item.status ?? "approved",
    }))
    .filter((item) => item.id && !known.has(item.id));
  return [...categories, ...extra];
}
