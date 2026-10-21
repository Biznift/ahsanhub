"use client";

import { useEffect, useSyncExternalStore } from "react";

type VoteState = { voted: boolean; count: number | null };

const state = new Map<string, VoteState>();
const listeners = new Set<() => void>();
let queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

/** Every upvote button on a page asks at once; this batches them into one request. */
function request(id: string) {
  if (state.has(id) || queue.has(id)) return;
  queue.add(id);
  timer ??= setTimeout(async () => {
    const ids = [...queue];
    queue = new Set();
    timer = null;
    try {
      const response = await fetch(`/api/public/votes?ids=${ids.join(",")}`, { cache: "no-store" });
      const body: { voted: string[]; counts: Record<string, number> } = await response.json();
      for (const listingId of ids) state.set(listingId, { voted: body.voted.includes(listingId), count: body.counts[listingId] ?? null });
    } catch {
      for (const listingId of ids) state.set(listingId, { voted: false, count: null });
    }
    emit();
  }, 30);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: VoteState = { voted: false, count: null };

export function useVote(id: string) {
  useEffect(() => request(id), [id]);
  return useSyncExternalStore(
    subscribe,
    () => state.get(id) ?? EMPTY,
    () => EMPTY,
  );
}

export async function toggleVote(id: string, slug: string, fallbackCount: number) {
  const before = state.get(id) ?? EMPTY;
  const base = before.count ?? fallbackCount;
  state.set(id, { voted: !before.voted, count: base + (before.voted ? -1 : 1) });
  emit();
  try {
    const response = await fetch(`/api/public/listings/${slug}/vote`, { method: "POST" });
    if (!response.ok) throw new Error();
    const body: { voted: boolean; voteCount: number } = await response.json();
    state.set(id, { voted: body.voted, count: body.voteCount });
  } catch {
    state.set(id, before);
  }
  emit();
}
