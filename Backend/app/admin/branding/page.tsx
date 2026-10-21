"use client";

import { FormEvent, useEffect, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, TextInput, controlClass } from "@/components/ui";
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
};

export default function BrandingPage() {
  const module = moduleBySlug("branding");
  const { notify } = useStore();
  const { data } = useApi<Site>("/api/admin/site");
  const [form, setForm] = useState<Site | null>(null);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
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

        <Card title="Search engines" description="How the home page appears in Google. Product and category pages build their own titles from the listing.">
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
