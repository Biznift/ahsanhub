"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Endpoint, KitModule } from "@/lib/catalog";
import { Badge, methodTone } from "@/components/ui";

export function ModuleFrame({ module, children }: { module: KitModule; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0b6e4f]">{module.group}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-[#1d2939]">{module.label}</h1>
        <p className="mt-2 max-w-3xl text-lg leading-7 text-[#475467]">{module.summary}</p>
        <div className="mt-5 rounded-lg border border-[#cfe5db] bg-[#f3f9f6] px-4 py-4">
          <p className="text-base font-semibold text-[#1d2939]">On this page</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {module.functions.map((item) => (
              <li key={item} className="text-base text-[#344054]">
                <span className="mr-2 text-[#0b6e4f]">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6">{children}</div>
      </section>
      <ApiCard title="APIs on this screen" endpoints={module.endpoints} />
    </div>
  );
}

export function ApiCard({ title, endpoints }: { title: string; endpoints: Endpoint[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(path: string) {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(path);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied(null);
    }
  }

  return (
    <aside className="rounded-lg border border-[#cfe5db] bg-white p-4 xl:sticky xl:top-6">
      <div className="flex items-baseline justify-between gap-3 border-b border-[#eef0f4] pb-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
        <span className="mono text-sm text-[var(--muted)]">{endpoints.length}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {endpoints.map((endpoint) => (
          <li key={`${endpoint.method}-${endpoint.path}`} className="rounded-lg border border-[#eef0f4] bg-[#f8f9fc] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={methodTone(endpoint.method)}>{endpoint.method}</Badge>
                  <code className="mono text-sm text-[var(--ink)]">{endpoint.path}</code>
                </div>
                <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">{endpoint.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => copy(endpoint.path)}
                className="rounded-md p-1 text-[var(--muted)] hover:bg-[#e7f3ee] hover:text-[var(--ink)]"
                aria-label={`Copy ${endpoint.path}`}
              >
                {copied === endpoint.path ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
