"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type OpenedCoupon = { code: string; note: string };

const requestInit = { cache: "no-store" as const, credentials: "same-origin" as const };

function openedFrom(body: { code?: string; note?: string }): OpenedCoupon {
  return { code: body.code ?? "", note: body.note ?? "" };
}

async function signedIn() {
  const response = await fetch("/api/auth/me", requestInit);
  if (!response.ok) return false;
  const body = (await response.json()) as { user?: unknown };
  return Boolean(body.user);
}

async function couponFromList(dealId: string): Promise<OpenedCoupon | "missing"> {
  const response = await fetch("/api/account/coupon-codes", requestInit);
  if (!response.ok) return "missing";
  const body = (await response.json()) as { items?: { id: string; code?: string; note?: string }[] };
  const item = body.items?.find((row) => row.id === dealId);
  return item ? openedFrom(item) : "missing";
}

async function fetchCoupon(dealId: string): Promise<OpenedCoupon | "signin" | "missing"> {
  const response = await fetch(`/api/account/coupon-codes?id=${encodeURIComponent(dealId)}`, requestInit);
  if (response.ok) return openedFrom((await response.json()) as { code?: string; note?: string });
  if (response.status !== 401) return "missing";
  if (!(await signedIn())) return "signin";
  return couponFromList(dealId);
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
