"use client";

import { useState } from "react";
import { Copy, FileText, Trash2 } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Card, Empty, api, formatDate, useApi } from "@/components/admin-kit";

type MediaRow = { id: string; path: string; name: string; mime: string; size: number; width: number | null; height: number | null; createdAt: string };

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function MediaPage() {
  const module = moduleBySlug("media");
  const { notify } = useStore();
  const { data, reload } = useApi<{ items: MediaRow[] }>("/api/admin/media");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    const form = new FormData();
    form.set("file", file);
    setBusy(true);
    try {
      await api("/api/admin/media", { method: "POST", body: form });
      notify(`${file.name} uploaded`);
      reload();
    } catch (problem) {
      notify((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: MediaRow) {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    try {
      await api(`/api/admin/media/${row.id}`, { method: "DELETE" });
      reload();
    } catch (problem) {
      notify((problem as Error).message);
    }
  }

  return (
    <ModuleFrame module={module}>
      <Card title="Upload" description="PNG, JPG, WebP, GIF, or PDF up to 8 MB.">
        <input type="file" disabled={busy} accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} className="text-sm" />
      </Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.length === 0 && <Empty>No files yet.</Empty>}
        {data?.items.map((row) => (
          <div key={row.id} className="overflow-hidden rounded-xl border border-[#e6e8ef] bg-white">
            <div className="grid aspect-video place-items-center bg-[#f5f6fa]">
              {row.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.path} alt="" className="max-h-full max-w-full object-contain" />
              ) : row.mime.startsWith("video/") ? (
                <video src={row.path} muted className="max-h-full max-w-full" />
              ) : (
                <FileText className="text-[#98a2b3]" size={32} />
              )}
            </div>
            <div className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1d2939]">{row.name}</p>
                <p className="text-xs text-[#667085]">
                  {row.width ? `${row.width} × ${row.height} · ` : ""}
                  {formatSize(row.size)} · {formatDate(row.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Copy link"
                onClick={() => {
                  navigator.clipboard.writeText(new URL(row.path, window.location.origin).toString());
                  notify("Link copied");
                }}
                className="rounded-md p-2 text-[#667085] hover:bg-[#f5f6fa]"
              >
                <Copy size={15} />
              </button>
              <button type="button" aria-label={`Delete ${row.name}`} onClick={() => remove(row)} className="rounded-md p-2 text-[#b42318] hover:bg-[#fdecea]">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ModuleFrame>
  );
}
