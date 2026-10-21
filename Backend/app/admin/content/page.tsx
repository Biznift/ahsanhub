"use client";

import { FormEvent, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { Badge, Button, Field, SelectInput, TextInput } from "@/components/ui";
import { api, formatDate, useApi } from "@/components/admin-kit";

type ContentKind = "page" | "post";
type ContentStatus = "draft" | "published";
type ContentRow = { id: string; title: string; kind: "blog" | "page"; status: ContentStatus; updatedAt: string };

const FILTERS: Array<ContentStatus | "all"> = ["all", "published", "draft"];

export default function ContentPage() {
  const module = moduleBySlug("content");
  const { data, reload } = useApi<{ items: ContentRow[] }>("/api/admin/posts");
  const content = data?.items ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ContentKind>("post");
  const [error, setError] = useState<string | null>(null);

  const shown = content.filter((item) => {
    const matchesStatus = filter === "all" || item.status === filter;
    const matchesQuery = item.title.toLowerCase().includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  });

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      await api("/api/admin/posts", { method: "POST", body: JSON.stringify({ title, kind: kind === "post" ? "blog" : "page" }) });
      setTitle("");
      setError(null);
      reload();
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  return (
    <ModuleFrame module={module}>
      <div className="space-y-4">
        <form onSubmit={create} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:grid-cols-[1fr_160px_auto]">
          <Field label="Title">
            <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New draft" />
          </Field>
          <Field label="Kind">
            <SelectInput value={kind} onChange={(event) => setKind(event.target.value as ContentKind)}>
              <option value="post">Post</option>
              <option value="page">Page</option>
            </SelectInput>
          </Field>
          <div className="flex items-end">
            <Button type="submit">Add draft</Button>
          </div>
          {error && <p className="text-sm text-[var(--danger)] md:col-span-3">{error}</p>}
        </form>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="max-w-sm flex-1">
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles" />
          </div>
          <div className="flex gap-2">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                  filter === item ? "bg-[var(--ink)] text-[var(--lime)]" : "border border-[var(--line)] bg-[var(--card)]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr key={item.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-[var(--muted)]">Updated {formatDate(item.updatedAt)}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{item.kind === "blog" ? "post" : item.kind}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.status === "published" ? "ok" : "warn"}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        tone="ghost"
                        onClick={async () => {
                          await api(`/api/admin/posts/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: item.status === "published" ? "draft" : "published" }) });
                          reload();
                        }}
                      >
                        {item.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        type="button"
                        tone="danger"
                        onClick={async () => {
                          await api(`/api/admin/posts/${item.id}`, { method: "DELETE" });
                          reload();
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                    No content in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleFrame>
  );
}
