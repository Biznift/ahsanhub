"use client";

import { FormEvent, useEffect, useState } from "react";
import { Copy, FileText, Trash2 } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { SecretInput } from "@/components/secret-input";
import { Button, Field, TextInput } from "@/components/ui";
import { Card, Empty, api, formatDate, useApi } from "@/components/admin-kit";

type MediaRow = { id: string; path: string; name: string; mime: string; size: number; width: number | null; height: number | null; createdAt: string };
type StorageSettings = {
  enabled: boolean;
  cloudName: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  configured: boolean;
};

const ACCEPT =
  "image/*,video/*,audio/*,.pdf,.svg,.avif,.heic,.ico,.bmp,.tif,.tiff,.zip,.7z,.gz,.tar,.csv,.txt,.rtf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.json,.mp3,.wav,.ogg,.aac,.m4a,.flac,.mov,.webm,.mp4";

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function MediaPage() {
  const module = moduleBySlug("media");
  const { notify } = useStore();
  const { data, reload } = useApi<{ items: MediaRow[] }>("/api/admin/media");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [cloudName, setCloudName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasApiSecret, setHasApiSecret] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    api<StorageSettings>("/api/admin/storage")
      .then((saved) => {
        setEnabled(saved.enabled);
        setCloudName(saved.cloudName);
        setHasApiKey(saved.hasApiKey);
        setHasApiSecret(saved.hasApiSecret);
        setConfigured(saved.configured);
      })
      .catch(() => undefined);
  }, []);

  function applySaved(saved: StorageSettings) {
    setEnabled(saved.enabled);
    setCloudName(saved.cloudName);
    setHasApiKey(saved.hasApiKey);
    setHasApiSecret(saved.hasApiSecret);
    setConfigured(saved.configured);
    setApiKey("");
    setApiSecret("");
  }

  async function saveStorage(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = await api<StorageSettings>("/api/admin/storage", {
        method: "PUT",
        body: JSON.stringify({ enabled, cloudName, apiKey, apiSecret }),
      });
      applySaved(saved);
      notify("Cloudinary settings saved");
      setNote({
        ok: true,
        text: saved.enabled
          ? `Uploads now go to Cloudinary cloud “${saved.cloudName}”. The API key and secret stay on the server.`
          : "Saved. Cloudinary is off, so new files stay on this server.",
      });
    } catch (problem) {
      setNote({ ok: false, text: (problem as Error).message });
    }
  }

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
      <form onSubmit={saveStorage} className="space-y-4">
        <section className="rounded-md border border-[#e6e8ef] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Cloudinary</h2>
              <p className="mt-1 text-sm text-[#667085]">
                {enabled && configured
                  ? `Connected to “${cloudName}”. Logos, banners, and library files upload there.`
                  : "Connect your Cloudinary account. Images, video, audio, PDFs, and other files Cloudinary supports go there when this is on."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((value) => !value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${enabled ? "bg-[#0b6e4f] text-white" : "bg-[#f2f4f7] text-[#667085]"}`}
            >
              {enabled ? "On" : "Off"}
            </button>
          </div>
          <details className="mt-4 rounded-md border border-[#e6e8ef] bg-[#f8f9fc] px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">How to get the cloud name, API key, and API secret</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[#667085]">
              <li>Open the Cloudinary dashboard and copy the cloud name.</li>
              <li>Go to Settings → API Keys and copy the API key and API secret.</li>
              <li>Paste them here, save, then send a test.</li>
            </ol>
          </details>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Cloud name">
                <TextInput value={cloudName} onChange={(event) => setCloudName(event.target.value)} placeholder="your-cloud-name" />
              </Field>
            </div>
            <Field label="API key">
              <SecretInput saved={hasApiKey} value={apiKey} onChange={setApiKey} placeholder="123456789012345" />
            </Field>
            <Field label="API secret">
              <SecretInput saved={hasApiSecret} value={apiSecret} onChange={setApiSecret} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit">Save</Button>
            <Button
              type="button"
              tone="ghost"
              onClick={async () => {
                try {
                  const result = await api<{ cloudName: string }>("/api/admin/storage/test", {
                    method: "POST",
                    body: JSON.stringify({ cloudName, apiKey, apiSecret }),
                  });
                  notify(`Cloudinary “${result.cloudName}” is ready`);
                  setNote({ ok: true, text: `Cloudinary “${result.cloudName}” accepted the credentials.` });
                } catch (problem) {
                  setNote({ ok: false, text: (problem as Error).message });
                }
              }}
            >
              Test connection
            </Button>
          </div>
          {note && <p className={`mt-3 text-sm ${note.ok ? "text-[#12b76a]" : "text-[var(--danger)]"}`}>{note.text}</p>}
        </section>
      </form>

      <Card
        className="mt-4"
        title="Upload"
        description={
          enabled
            ? "Images, video, audio, PDF, ZIP, and other files Cloudinary supports. Up to 10 MB (40 MB for video)."
            : "PNG, JPG, WebP, GIF, video, audio, or PDF. Connect Cloudinary above to store every supported file type in the cloud."
        }
      >
        <input
          type="file"
          disabled={busy}
          accept={ACCEPT}
          onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}
          className="text-sm"
        />
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
              ) : row.mime.startsWith("audio/") ? (
                <audio src={row.path} controls className="w-full px-3" />
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
