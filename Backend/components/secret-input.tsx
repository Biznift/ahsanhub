"use client";

import { useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { cn, controlClass } from "@/components/ui";

/** Password field that shows a key is stored, without putting the secret back on screen. */
export function SecretInput({
  saved,
  value,
  onChange,
  placeholder = "",
  autoComplete = "new-password",
}: {
  saved: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [editing, setEditing] = useState(false);
  const showSaved = saved && value.length === 0 && !editing;

  if (showSaved) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(controlClass, "flex items-center justify-between gap-3 border-[#9ed9b8] bg-[#f3faf6] text-left")}
        >
          <span className="flex min-w-0 items-center gap-2">
            <KeyRound size={16} className="shrink-0 text-[#0b6e4f]" aria-hidden="true" />
            <span className="truncate font-medium tracking-[0.2em] text-[#1d2939]">••••••••••••</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0b6e4f] px-2 py-0.5 text-[11px] font-semibold tracking-normal text-white">
            <Check size={12} strokeWidth={3} aria-hidden="true" />
            Saved
          </span>
        </button>
        <p className="mt-1.5 text-xs text-[#0b6e4f]">A key is saved. Click the field to type a new one, or leave it and save to keep this key.</p>
      </div>
    );
  }

  return (
    <div>
      <input
        type="password"
        value={value}
        autoComplete={autoComplete}
        autoFocus={editing}
        placeholder={saved ? "Type a new key to replace the saved one" : placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (saved && value.length === 0) setEditing(false);
        }}
        className={cn(controlClass, saved && value.length > 0 && "border-[#f7d9a4] bg-[#fffaf3]")}
      />
      {saved && value.length > 0 && <p className="mt-1.5 text-xs text-[#b54708]">This replaces the saved key when you save.</p>}
    </div>
  );
}
