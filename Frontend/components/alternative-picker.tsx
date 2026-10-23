"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { AlternativeRef } from "@/lib/types";

const LIMIT = 5;

export function AlternativePicker({ selected, onChange }: { selected: AlternativeRef[]; onChange: (next: AlternativeRef[]) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<AlternativeRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const full = selected.length >= LIMIT;
  const text = query.trim();
  const exact = results.some((item) => item.name.toLowerCase() === text.toLowerCase()) || selected.some((item) => item.name.toLowerCase() === text.toLowerCase());

  useEffect(() => {
    if (!open || text.length === 0 || full) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ q: text });
      fetch(`/api/public/alternatives?${params}`)
        .then((response) => (response.ok ? response.json() : { items: [] }))
        .then((body: { items?: AlternativeRef[] }) => {
          const taken = new Set(selected.map((item) => item.id));
          setResults((body.items ?? []).filter((item) => !taken.has(item.id)));
        })
        .catch(() => setResults([]));
    }, 150);
    return () => clearTimeout(handle);
  }, [text, open, full, selected]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function choose(item: AlternativeRef) {
    onChange([...selected, item]);
    setQuery("");
    setResults([]);
    setError(null);
    setOpen(false);
  }

  async function addNew() {
    if (text.length < 2 || exact || full || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/public/alternatives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: text }),
      });
      const body = (await response.json().catch(() => ({}))) as AlternativeRef & { error?: string };
      if (!response.ok || !body.id) throw new Error(body.error || "Could not save that tool.");
      choose({ id: body.id, name: body.name, slug: body.slug });
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const showMenu = open && !full && text.length > 0 && (results.length > 0 || text.length >= 2);

  return (
    <div ref={box}>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-brand bg-brand-soft py-1 pl-3 pr-1.5 text-[13px] font-semibold text-brand-text">
              {item.name}
              <button type="button" className="rounded-full p-0.5 hover:bg-surface" aria-label={`Remove ${item.name}`} onClick={() => onChange(selected.filter((current) => current.id !== item.id))}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={full}
          placeholder={full ? "5 alternatives selected" : "Type a tool name"}
          role="combobox"
          aria-expanded={showMenu}
          aria-autocomplete="list"
          className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] text-ink outline-none transition placeholder:text-muted focus:border-brand disabled:opacity-60"
        />
        {showMenu && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-surface py-1 shadow-lg" role="listbox">
            {results.map((item) => (
              <li key={item.id}>
                <button type="button" className="w-full px-3.5 py-2 text-left text-[14px] font-medium text-ink hover:bg-band" onClick={() => choose(item)}>
                  {item.name}
                </button>
              </li>
            ))}
            {text.length >= 2 && !exact && (
              <li>
                <button type="button" className="w-full px-3.5 py-2 text-left text-[14px] font-semibold text-brand-text hover:bg-band" disabled={busy} onClick={addNew}>
                  {busy ? "Saving…" : `Add “${text}”`}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
