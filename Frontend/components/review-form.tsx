"use client";

import { FormEvent, useState } from "react";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/format";

export function ReviewForm({ slug, name }: { slug: string; name: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (rating === 0) return setError("Choose a star rating.");
    setState("sending");
    setError(null);
    try {
      const response = await fetch(`/api/public/listings/${slug}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: author, rating, body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send the review.");
      setState("done");
    } catch (problem) {
      setError((problem as Error).message);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-brand-line bg-brand-soft p-5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-white">
          <Check size={15} strokeWidth={2.6} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">Thank you, your review was sent</p>
          <p className="mt-0.5 text-[14px] text-ink-soft">It will appear here once the team has approved it.</p>
        </div>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[15px] font-semibold text-ink">Used {name}? Leave a review</p>
      <p className="mt-0.5 text-[13px] text-muted">No account needed. Reviews are checked before they are published.</p>
      <div className="mt-4 flex items-center gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(value)}
            onClick={() => setRating(value)}
            className="rounded p-0.5"
          >
            <Star size={22} className={cn("transition", value <= shown ? "fill-star text-star" : "text-line-strong")} />
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">Your name</span>
          <input value={author} onChange={(event) => setAuthor(event.target.value)} required minLength={2} maxLength={60} className="h-10 w-full rounded-lg border border-line bg-bg px-3 text-[14px] outline-none focus:border-brand" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">Your review</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            placeholder="What do you use it for, and what would you tell a friend?"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-muted focus:border-brand"
          />
        </label>
      </div>
      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="mt-4 h-10 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
