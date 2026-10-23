"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/format";

const LIMIT = 5;

export function CategoryPicker({
  categories,
  categoryIds,
  proposed,
  onChange,
}: {
  categories: Category[];
  categoryIds: string[];
  proposed: string[];
  onChange: (next: { categoryIds: string[]; proposedCategories: string[] }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const total = categoryIds.length + proposed.length;
  const selected = categories.filter((category) => categoryIds.includes(category.id));
  const names = [...selected.map((category) => category.name), ...proposed];
  const filtered = categories.filter((category) => category.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: string) {
    const on = categoryIds.includes(id);
    if (on) onChange({ categoryIds: categoryIds.filter((item) => item !== id), proposedCategories: proposed });
    else if (total < LIMIT) onChange({ categoryIds: [...categoryIds, id], proposedCategories: proposed });
  }

  function addCustom() {
    const name = custom.trim().replace(/\s+/g, " ");
    if (name.length < 2 || total >= LIMIT) return;
    const existing = categories.find((category) => category.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!categoryIds.includes(existing.id)) onChange({ categoryIds: [...categoryIds, existing.id], proposedCategories: proposed });
      setCustom("");
      return;
    }
    if (proposed.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setCustom("");
      return;
    }
    onChange({ categoryIds, proposedCategories: [...proposed, name] });
    setCustom("");
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3.5 py-2 text-left text-[15px] text-ink outline-none transition hover:border-line-strong focus:border-brand"
      >
        <span className={cn("min-w-0 truncate", names.length === 0 && "text-muted")}>{names.length ? names.join(", ") : "Select categories"}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-muted transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          <div className="border-b border-line p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder="Search categories"
              className="h-10 w-full rounded-lg border border-line bg-bg px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-brand"
            />
          </div>
          <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-64 overflow-auto p-1">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-muted">No categories match.</li>}
            {filtered.map((category) => {
              const on = categoryIds.includes(category.id);
              const full = !on && total >= LIMIT;
              return (
                <li key={category.id}>
                  <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition", full ? "cursor-not-allowed opacity-40" : "hover:bg-band", on && "bg-brand-soft text-brand-text")}>
                    <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(category.id)} className="h-4 w-4 accent-[var(--brand)]" />
                    <span className="min-w-0 flex-1">
                      {category.name}
                      {category.status === "pending" && <span className="ml-2 text-[12px] text-muted">Pending review</span>}
                    </span>
                    {on && <Check size={15} strokeWidth={2.6} />}
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2 border-t border-line p-2">
            <input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                addCustom();
              }}
              maxLength={60}
              placeholder="Add a category that is not listed"
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-brand"
            />
            <button type="button" onClick={addCustom} disabled={custom.trim().length < 2 || total >= LIMIT} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] font-semibold text-bg disabled:opacity-40">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      )}

      {names.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {selected.map((category) => (
            <li key={category.id}>
              <button type="button" onClick={() => toggle(category.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand bg-brand-soft px-2.5 text-[13px] font-medium text-brand-text">
                {category.name}
                {category.status === "pending" ? " · pending" : ""}
                <span className="text-muted">×</span>
              </button>
            </li>
          ))}
          {proposed.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => onChange({ categoryIds, proposedCategories: proposed.filter((item) => item !== name) })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-band px-2.5 text-[13px] font-medium text-ink-soft"
              >
                {name} · pending
                <span className="text-muted">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
