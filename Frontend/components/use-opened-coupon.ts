"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type OpenedCoupon = { code: string; note: string };

async function fetchCoupon(dealId: string): Promise<OpenedCoupon | "signin" | "missing"> {
  const response = await fetch(`/api/account/coupon-codes?id=${encodeURIComponent(dealId)}`, { cache: "no-store" });
  if (response.status === 401) return "signin";
  if (!response.ok) return "missing";
  const body = (await response.json()) as { code?: string; note?: string };
  return { code: body.code ?? "", note: body.note ?? "" };
}

function clearReveal(dealId: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get("reveal") !== dealId) return;
  url.searchParams.delete("reveal");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function signupHref(dealId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("reveal", dealId);
  return `/signup?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`;
}

/** The code stays in memory for this visit. A reload, or a fresh navigation without ?reveal=, hides it again. */
export function useOpenedCoupon(dealId: string) {
  const router = useRouter();
  const [opened, setOpened] = useState<OpenedCoupon | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("reveal");
    if (id !== dealId) return;
    let cancelled = false;
    setBusy(true);
    fetchCoupon(dealId).then((result) => {
      if (cancelled) return;
      setBusy(false);
      if (result === "signin" || result === "missing") return;
      setOpened(result);
      clearReveal(dealId);
    });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  async function view() {
    if (busy || opened) return;
    setBusy(true);
    const result = await fetchCoupon(dealId);
    setBusy(false);
    if (result === "signin") {
      router.push(signupHref(dealId));
      return;
    }
    if (result === "missing") return;
    setOpened(result);
  }

  return { opened, busy, view };
}
