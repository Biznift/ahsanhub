"use client";

import { useEffect, useMemo, useState } from "react";
import { MODULES, moduleBySlug } from "@/lib/catalog";
import { ApiCard, ModuleFrame } from "@/components/frame";
import { Badge, TextInput } from "@/components/ui";

export default function ApiMapPage() {
  const module = moduleBySlug("api");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [live, setLive] = useState<"checking" | "live" | "down">("checking");

  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => setLive(response.ok ? "live" : "down"))
      .catch(() => setLive("down"));
  }, []);

  const groups = ["All", ...new Set(MODULES.map((item) => item.group))];
  const needle = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      MODULES.filter((item) => group === "All" || item.group === group).map((item) => ({
        ...item,
        endpoints: item.endpoints.filter((endpoint) => {
          if (!needle) return true;
          return `${endpoint.method} ${endpoint.path} ${endpoint.summary} ${item.label}`.toLowerCase().includes(needle);
        }),
      })).filter((item) => item.endpoints.length > 0),
    [group, needle]
  );
  const total = shown.reduce((sum, item) => sum + item.endpoints.length, 0);

  return (
    <ModuleFrame module={module}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={live === "live" ? "ok" : live === "down" ? "danger" : "muted"}>
            GET /api/catalog {live === "checking" ? "checking" : live}
          </Badge>
          <span className="text-sm text-[var(--muted)]">{total} endpoints in view</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="max-w-sm flex-1">
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search path or function" />
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGroup(item)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  group === item ? "bg-[var(--ink)] text-[var(--lime)]" : "border border-[var(--line)] bg-[var(--card)]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((item) => (
            <div key={item.slug}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{item.label}</h2>
                <span className="text-xs text-[var(--muted)]">{item.functions.length} functions</span>
              </div>
              <ApiCard title={item.group} endpoints={item.endpoints} />
            </div>
          ))}
        </div>
      </div>
    </ModuleFrame>
  );
}
