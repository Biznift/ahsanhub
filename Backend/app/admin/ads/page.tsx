"use client";

import { FormEvent, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";
import { Card, Empty, Switch, api, useApi } from "@/components/admin-kit";

type Placement = { label: string; width: number; height: number };
type Ad = { id: string; placement: string; title: string; kind: "image" | "gif" | "video"; file: string; url: string; active: boolean; createdAt: string };

export default function AdsPage() {
  const module = moduleBySlug("ads");
  const { notify } = useStore();
  const { data, reload, setData } = useApi<{ placements: Record<string, Placement>; items: Ad[] }>("/api/admin/ads");
  const [placement, setPlacement] = useState("home-leaderboard");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const size = data?.placements[placement];

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file && !fileUrl.trim()) return setError("Upload a file or paste an image URL.");
    const form = new FormData();
    form.set("placement", placement);
    form.set("title", title);
    form.set("url", url);
    if (file) form.set("file", file);
    else form.set("fileUrl", fileUrl.trim());
    setBusy(true);
    try {
      await api("/api/admin/ads", { method: "POST", body: form });
      setTitle("");
      setUrl("");
      setFile(null);
      setFileUrl("");
      event.currentTarget?.reset();
      setError(null);
      notify("Creative uploaded");
      reload();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(ad: Ad, change: Partial<Ad>) {
    await api(`/api/admin/ads/${ad.id}`, { method: "PATCH", body: JSON.stringify(change) });
    setData((current) => current && { ...current, items: current.items.map((item) => (item.id === ad.id ? { ...item, ...change } : item)) });
  }

  async function remove(ad: Ad) {
    if (!window.confirm(`Delete ${ad.title}?`)) return;
    await api(`/api/admin/ads/${ad.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <ModuleFrame module={module}>
      <Card title="Placements and sizes" description="Images must match the size exactly, or be exactly double for sharp screens. Videos (MP4 or WebM) are cropped to the slot and play muted on a loop. When several creatives are active in one placement, the site rotates them.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="py-2 font-medium">Placement</th>
                <th className="py-2 font-medium">Where</th>
                <th className="py-2 font-medium">Size</th>
                <th className="py-2 font-medium">Limits</th>
              </tr>
            </thead>
            <tbody>
              {data &&
                Object.entries(data.placements).map(([key, item]) => (
                  <tr key={key} className="border-t border-[#eef0f4]">
                    <td className="mono py-2 text-[#0b6e4f]">{key}</td>
                    <td className="py-2 text-[#344054]">{item.label}</td>
                    <td className="py-2 font-medium">
                      {item.width} × {item.height}
                    </td>
                    <td className="py-2 text-[#667085]">Image 2 MB · GIF 8 MB · Video 12 MB</td>
                  </tr>
                ))}
              <tr className="border-t border-[#eef0f4]">
                <td className="mono py-2 text-[#0b6e4f]">explore-inline</td>
                <td className="py-2 text-[#344054]">Explore grid, every 8 cards</td>
                <td className="py-2 font-medium">Native card</td>
                <td className="py-2 text-[#667085]">Sponsored listings only, no upload</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Upload a creative" className="mt-4">
        <form onSubmit={upload} className="grid gap-3 md:grid-cols-2">
          <Field label="Placement">
            <SelectInput value={placement} onChange={(event) => setPlacement(event.target.value)}>
              {data &&
                Object.entries(data.placements).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label} ({item.width} × {item.height})
                  </option>
                ))}
            </SelectInput>
          </Field>
          <Field label="Title (used as alt text)">
            <TextInput value={title} onChange={(event) => setTitle(event.target.value)} required />
          </Field>
          <Field label="Click-through link">
            <TextInput value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://" />
          </Field>
          <Field label={size ? `File: ${size.width} × ${size.height} PNG, JPG, WebP, GIF, or MP4/WebM` : "File"}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                setFile(next);
                if (next) setFileUrl("");
              }}
              className="block w-full py-2 text-sm"
            />
          </Field>
          <Field label="or image URL">
            <TextInput
              value={fileUrl}
              onChange={(event) => {
                setFileUrl(event.target.value);
                if (event.target.value.trim()) setFile(null);
              }}
              placeholder="https://res.cloudinary.com/… or any image link"
            />
          </Field>
          {error && <p className="text-sm text-[var(--danger)] md:col-span-2">{error}</p>}
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 space-y-3">
        {data?.items.length === 0 && <Empty>No creatives yet. Empty placements show sponsored free listings, or nothing if there are none.</Empty>}
        {data?.items.map((ad) => {
          const slot = data.placements[ad.placement];
          return (
            <div key={ad.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e6e8ef] bg-white p-4">
              <div className="overflow-hidden rounded-md border border-[#eef0f4] bg-[#f9fafb]" style={{ width: 180, aspectRatio: slot ? `${slot.width} / ${slot.height}` : "4 / 1" }}>
                {ad.kind === "video" ? (
                  <video src={ad.file} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ad.file} alt={ad.title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#1d2939]">{ad.title}</p>
                <p className="text-sm text-[#667085]">
                  {slot?.label ?? ad.placement} · {ad.kind}
                </p>
                <a href={ad.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#0b6e4f]">
                  {ad.url} <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#475467]">
                Active <Switch label="Active" checked={ad.active} onChange={(active) => patch(ad, { active })} />
              </div>
              <button type="button" aria-label={`Delete ${ad.title}`} onClick={() => remove(ad)} className="rounded-md p-2 text-[#b42318] hover:bg-[#fdecea]">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ModuleFrame>
  );
}
