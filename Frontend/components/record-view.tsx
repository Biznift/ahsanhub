"use client";

import { useEffect } from "react";

/** Records one unique page view after the product is actually opened. */
export function RecordView({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/public/listings/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => undefined);
  }, [slug]);
  return null;
}
