"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, TextInput, cn, controlClass } from "@/components/ui";
import { Card, api, useApi } from "@/components/admin-kit";
import { SOCIALS } from "@/components/listing-editor";

type Site = {
  name: string;
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  contactEmail: string;
  socials: Record<string, string>;
  announcement: string;
  logo: string;
  favicon: string;
  appleTouchIcon: string;
  ogImage: string;
  showBismillah: boolean;
};

type AssetKey = "logo" | "favicon" | "appleTouchIcon" | "ogImage";

export default function BrandingPage() {
  const module = moduleBySlug("branding");
  const { notify } = useStore();
  const { data } = useApi<Site>("/api/admin/site");
  const [form, setForm] = useState<Site | null>(null);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<AssetKey | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        logo: data.logo ?? "",
        favicon: data.favicon ?? "",
        appleTouchIcon: data.appleTouchIcon ?? "",
        ogImage: data.ogImage ?? "",
        showBismillah: data.showBismillah ?? false,
      });
    }
  }, [data]);

  if (!form) return <ModuleFrame module={module}><p className="text-sm text-[#667085]">Loading…</p></ModuleFrame>;
  const set = (patch: Partial<Site>) => setForm({ ...form, ...patch });

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      setForm(await api<Site>("/api/admin/site", { method: "PUT", body: JSON.stringify(form) }));
      setError(null);
      notify("Branding and SEO saved");
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  function addKeyword() {
    const next = keyword.trim();
    if (!next || form!.keywords.includes(next)) return;
    set({ keywords: [...form!.keywords, next] });
    setKeyword("");
  }

  async function uploadAsset(key: AssetKey, file: File) {
    const body = new FormData();
    body.set("file", file);
    setUploading(key);
    try {
      const saved = await api<{ path: string }>("/api/admin/media", { method: "POST", body });
      set({ [key]: saved.path });
      setError(null);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setUploading(null);
    }
  }

  return (
    <ModuleFrame module={module}>
      <form onSubmit={save} className="space-y-4">
        <Card title="Identity" description="Shown in the header, footer, and share previews.">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Site name">
              <TextInput value={form.name} onChange={(event) => set({ name: event.target.value })} />
            </Field>
            <Field label="Contact email">
              <TextInput value={form.contactEmail} onChange={(event) => set({ contactEmail: event.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Tagline">
                <TextInput value={form.tagline} onChange={(event) => set({ tagline: event.target.value })} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Announcement bar (empty hides it)">
                <TextInput value={form.announcement} maxLength={140} onChange={(event) => set({ announcement: event.target.value })} />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Logo & icons" description="Leave empty to keep the built-in arch mark.">
          <div className="grid gap-6 md:grid-cols-2">
            <AssetField
              label="Logo"
              hint="Square works best (shown at 40×40). PNG/SVG with transparent background."
              accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
              value={form.logo}
              busy={uploading === "logo"}
              onChange={(logo) => set({ logo })}
              onUpload={(file) => uploadAsset("logo", file)}
            />
            <AssetField
              label="Favicon"
              hint="The browser tab. Square PNG, 64×64 or larger. ICO and SVG also work."
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico,.svg"
              value={form.favicon}
              busy={uploading === "favicon"}
              onChange={(favicon) => set({ favicon })}
              onUpload={(file) => uploadAsset("favicon", file)}
            />
            <AssetField
              label="Apple touch icon"
              hint="Home-screen icon on iPhone. 180×180 PNG. Uses the favicon if empty."
              accept="image/png,image/jpeg,image/webp"
              value={form.appleTouchIcon}
              busy={uploading === "appleTouchIcon"}
              onChange={(appleTouchIcon) => set({ appleTouchIcon })}
              onUpload={(file) => uploadAsset("appleTouchIcon", file)}
            />
            <AssetField
              label="Social share image"
              hint="Shown when the site is shared on Facebook, LinkedIn, WhatsApp. 1200×630."
              accept="image/png,image/jpeg,image/webp"
              value={form.ogImage}
              busy={uploading === "ogImage"}
              shape="wide"
              onChange={(ogImage) => set({ ogImage })}
              onUpload={(file) => uploadAsset("ogImage", file)}
            />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-[#344054]">
            <input
              type="checkbox"
              checked={form.showBismillah}
              onChange={(event) => set({ showBismillah: event.target.checked })}
              className="h-4 w-4 rounded border-[#d0d5dd] accent-[#0b6e4f]"
            />
            Show Bismillah above the header
          </label>
        </Card>

        <Card title="Search engines" description="How the home page appears in Google. Product and category pages build their own titles from the listing. The social share image above is used for Open Graph and Twitter cards.">
          <div className="grid gap-3">
            <Field label={`Title (${form.seoTitle.length}/60)`}>
              <TextInput value={form.seoTitle} maxLength={70} onChange={(event) => set({ seoTitle: event.target.value })} />
            </Field>
            <Field label={`Description (${form.seoDescription.length}/160)`}>
              <textarea value={form.seoDescription} rows={3} maxLength={170} onChange={(event) => set({ seoDescription: event.target.value })} className={controlClass} />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-[#344054]">Keywords</p>
              <div className="flex flex-wrap gap-2">
                {form.keywords.map((item) => (
                  <button key={item} type="button" onClick={() => set({ keywords: form.keywords.filter((word) => word !== item) })} className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs text-[#0b6e4f]">
                    {item} ×
                  </button>
                ))}
              </div>
              <div className="mt-2 flex max-w-md gap-2">
                <TextInput
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Add keyword"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    addKeyword();
                  }}
                />
                <Button type="button" tone="ghost" onClick={addKeyword}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Footer social links">
          <div className="grid gap-3 md:grid-cols-2">
            {SOCIALS.map((social) => (
              <Field key={social.key} label={social.label}>
                <TextInput value={form.socials[social.key] ?? ""} onChange={(event) => set({ socials: { ...form.socials, [social.key]: event.target.value } })} placeholder="https://" />
              </Field>
            ))}
          </div>
        </Card>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit">Save branding</Button>
      </form>
    </ModuleFrame>
  );
}

function AssetField({
  label,
  hint,
  value,
  accept,
  busy,
  shape = "round",
  onChange,
  onUpload,
}: {
  label: string;
  hint: string;
  value: string;
  accept: string;
  busy: boolean;
  shape?: "round" | "wide";
  onChange: (next: string) => void;
  onUpload: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const round = shape === "round";

  return (
    <div className="flex gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className={cn("shrink-0 border border-[#e6e8ef] bg-[#f8f9fc] object-cover", round ? "h-14 w-14 rounded-full" : "h-14 w-24 rounded-xl")}
        />
      ) : (
        <span className={cn("grid shrink-0 place-items-center border border-dashed border-[#d0d5dd] bg-[#f8f9fc] text-[11px] text-[#98a2b3]", round ? "h-14 w-14 rounded-full" : "h-14 w-24 rounded-xl")}>
          {round ? "—" : "1200×630"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">{label}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onUpload(file);
            }}
          />
          <Button type="button" tone="ghost" className="px-3 py-1.5 text-sm" disabled={busy} onClick={() => input.current?.click()}>
            <Upload size={14} />
            {busy ? "Uploading…" : "Upload"}
          </Button>
          <button
            type="button"
            disabled={!value}
            onClick={() => onChange("")}
            className="text-sm text-[#667085] hover:text-[#1d2939] disabled:opacity-40"
          >
            × Use default
          </button>
        </div>
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-[#344054]">Image URL</span>
            <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder="https:// — Cloudinary or any image link" />
          </label>
          <p className="mt-1 text-xs leading-5 text-[#667085]">{hint} Upload a file, or paste a link from Cloudinary or another host.</p>
      </div>
    </div>
  );
}
