"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/components/ui";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0b6e4f] text-[15px] font-bold text-white">A</span>
      {!compact && <span className="text-[19px] font-semibold tracking-tight text-[#141414]">Ahsan Hub</span>}
    </span>
  );
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = init?.body && !(init.body instanceof FormData) ? { "content-type": "application/json" } : undefined;
  const response = await fetch(path, { cache: "no-store", ...init, headers: { ...headers, ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body as T;
}

/** Loads a JSON endpoint and exposes reload. `path` null skips the request. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export function Thumb({ src, name, size = 40 }: { src: string | null | undefined; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-lg border border-[#e6e8ef] object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-lg border border-[#e6e8ef] bg-[#f5f6fa] font-semibold text-[#667085]" style={{ width: size, height: size }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  published: "bg-[#e7f3ee] text-[#0b6e4f]",
  approved: "bg-[#e7f3ee] text-[#0b6e4f]",
  active: "bg-[#e7f3ee] text-[#0b6e4f]",
  pending: "bg-[#fff4e5] text-[#9a5b00]",
  rejected: "bg-[#fdecea] text-[#b42318]",
  hidden: "bg-[#f2f4f7] text-[#475467]",
  disabled: "bg-[#fdecea] text-[#b42318]",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize", STATUS_TONE[status] ?? STATUS_TONE.hidden)}>{status}</span>;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50",
        checked ? "bg-[#0b6e4f]" : "bg-[#d0d5dd]",
      )}
    >
      <span className={cn("inline-block h-4 w-4 rounded-full bg-white transition", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export function Card({ title, description, children, className, action }: { title?: string; description?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-[#e6e8ef] bg-white p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="!m-0 !border-0 !p-0 text-base font-semibold text-[#1d2939]">{title}</h2>}
            {description && <p className="mt-1 text-sm text-[#667085]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-[#d0d5dd] bg-white px-4 py-10 text-center text-sm text-[#667085]">{children}</div>;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
