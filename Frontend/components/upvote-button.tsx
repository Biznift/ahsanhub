"use client";

import { ChevronUp } from "lucide-react";
import { toggleVote, useVote } from "@/lib/votes";
import { cn, compactNumber } from "@/lib/format";

export function UpvoteButton({ id, slug, count, size = "md", name }: { id: string; slug: string; count: number; size?: "md" | "lg"; name: string }) {
  const vote = useVote(id);
  const shown = vote.count ?? count;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleVote(id, slug, count);
      }}
      aria-pressed={vote.voted}
      aria-label={`${vote.voted ? "Remove upvote from" : "Upvote"} ${name}, ${shown} upvotes`}
      className={cn(
        "relative z-10 flex shrink-0 flex-col items-center justify-center rounded-xl border font-semibold tabular-nums transition active:scale-[0.97]",
        size === "lg" ? "h-[60px] w-[64px] text-[15px]" : "h-[52px] w-[48px] text-[13px]",
        vote.voted ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand hover:text-brand-text",
      )}
    >
      <ChevronUp size={size === "lg" ? 20 : 17} strokeWidth={2.4} className="-mb-0.5" />
      {compactNumber(shown)}
    </button>
  );
}
