"use client";

import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, SelectInput, TextInput, cn, controlClass } from "@/components/ui";
import { RichText } from "@/components/rich-text";
import { Card, useApi } from "@/components/admin-kit";
import { KIND_LABEL, LISTING_KINDS, type ListingKind } from "@/lib/kinds";

export const SOCIALS = [
  { key: "x", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "github", label: "GitHub" },
  { key: "tiktok", label: "TikTok" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

const PLATFORMS = ["web", "ios", "android", "windows", "macos", "linux", "chrome"] as const;

export type EditableListing = {
  name: string;
  overview: string;
  description: string;
  website: string;
  logo: string | null;
  banner: string | null;
  pricing: string;
  country: string;
  platforms: string[];
  halalNote: string;
  socials: Record<string, string>;
  contactEmail: string;
  kind: ListingKind;
  categoryIds: string[];
  founders: { id: string; name: string; role: string; bio: string; photo: string | null; socials: Record<string, string> }[];
};

type FounderDraft = { id?: string; name: string; role: string; bio: string; photo: string | null; socials: Record<string, string>; file: File | null; removePhoto: boolean };

export function ListingEditor({ listing, onSave }: { listing: EditableListing; onSave: (form: FormData) => Promise<void> }) {
  const categories = useApi<{ items: { id: string; name: string; hidden: boolean; kind: ListingKind; status: "pending" | "approved" | "rejected" }[] }>("/api/admin/categories");
  const [draft, setDraft] = useState({ ...listing, kind: listing.kind ?? "software" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [founders, setFounders] = useState<FounderDraft[]>(listing.founders.map((item) => ({ ...item, file: null, removePhoto: false })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<EditableListing>) => setDraft((current) => ({ ...current, ...patch }));
  const setFounder = (index: number, patch: Partial<FounderDraft>) =>
    setFounders((current) => current.map((item, at) => (at === index ? { ...item, ...patch } : item)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set(
      "data",
      JSON.stringify({
        name: draft.name,
        overview: draft.overview,
        description: draft.description,
        website: draft.website,
        pricing: draft.pricing,
        kind: draft.kind,
        categoryIds: draft.categoryIds,
        country: draft.country,
        platforms: draft.platforms,
        halalNote: draft.halalNote,
        socials: draft.socials,
        removeBanner,
        founders: founders.map(({ id, name, role, bio, socials, removePhoto }) => ({ id, name, role, bio, socials, removePhoto })),
      }),
    );
    form.set("email", draft.contactEmail);
    if (logoFile) form.set("logo", logoFile);
    if (bannerFile) form.set("banner", bannerFile);
    founders.forEach((founder, index) => founder.file && form.set(`founderPhoto:${index}`, founder.file));
    try {
      await onSave(form);
      setLogoFile(null);
      setBannerFile(null);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title="Company">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Company name">
            <TextInput value={draft.name} onChange={(event) => set({ name: event.target.value })} required />
          </Field>
          <Field label="Website">
            <TextInput value={draft.website} onChange={(event) => set({ website: event.target.value })} required />
          </Field>
          <div className="md:col-span-2">
            <Field label={`Overview (${draft.overview.length}/180)`}>
              <TextInput value={draft.overview} maxLength={180} onChange={(event) => set({ overview: event.target.value })} required />
            </Field>
          </div>
          <Field label="Type">
            <SelectInput
              value={draft.kind}
              onChange={(event) => {
                const nextKind = event.target.value as ListingKind;
                const allowed = new Set((categories.data?.items ?? []).filter((category) => category.kind === nextKind).map((category) => category.id));
                set({ kind: nextKind, categoryIds: draft.categoryIds.filter((id) => allowed.has(id)) });
              }}
            >
              {LISTING_KINDS.map((value) => (
                <option key={value} value={value}>
                  {KIND_LABEL[value]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Pricing">
            <SelectInput value={draft.pricing} onChange={(event) => set({ pricing: event.target.value })}>
              <option value="free">Free</option>
              <option value="freemium">Freemium</option>
              <option value="paid">Paid</option>
              <option value="open_source">Open source</option>
            </SelectInput>
          </Field>
          <Field label="Contact email">
            <TextInput type="email" value={draft.contactEmail} onChange={(event) => set({ contactEmail: event.target.value })} />
          </Field>
          <Field label="Country">
            <TextInput value={draft.country} onChange={(event) => set({ country: event.target.value })} />
          </Field>
          <Field label="Halal note">
            <TextInput value={draft.halalNote} onChange={(event) => set({ halalNote: event.target.value })} />
          </Field>
        </div>
        <p className="mb-1.5 mt-4 text-sm font-semibold text-[#344054]">Platforms</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <Chip
              key={platform}
              on={draft.platforms.includes(platform)}
              onClick={() => set({ platforms: draft.platforms.includes(platform) ? draft.platforms.filter((item) => item !== platform) : [...draft.platforms, platform] })}
            >
              {platform}
            </Chip>
          ))}
        </div>
        <p className="mb-1.5 mt-4 text-sm font-semibold text-[#344054]">Categories (up to 5)</p>
        <div className="flex flex-wrap gap-2">
          {categories.data?.items
            .filter((category) => category.kind === draft.kind && category.status !== "rejected")
            .map((category) => {
            const on = draft.categoryIds.includes(category.id);
            return (
              <Chip
                key={category.id}
                on={on}
                onClick={() =>
                  set({ categoryIds: on ? draft.categoryIds.filter((id) => id !== category.id) : draft.categoryIds.length < 5 ? [...draft.categoryIds, category.id] : draft.categoryIds })
                }
              >
                {category.name}
                {category.status === "pending" ? " (pending)" : ""}
                {category.hidden ? " (hidden)" : ""}
              </Chip>
            );
          })}
        </div>
      </Card>

      <Card title="Logo and banner" description="Logo: square PNG, JPG or WebP, 512 × 512 recommended, under 2 MB. Banner: optional 16:9, 1600 × 900 recommended, under 5 MB.">
        <div className="grid gap-4 md:grid-cols-[160px_1fr]">
          <div>
            <Preview src={logoFile ? URL.createObjectURL(logoFile) : draft.logo} className="aspect-square w-32" />
            <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 w-full text-xs" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Preview src={bannerFile ? URL.createObjectURL(bannerFile) : removeBanner ? null : draft.banner} className="aspect-video w-full max-w-md" />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input type="file" accept="image/png,image/jpeg,image/webp" className="text-xs" onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)} />
              {draft.banner && !bannerFile && (
                <label className="flex items-center gap-1.5 text-sm text-[#475467]">
                  <input type="checkbox" checked={removeBanner} onChange={(event) => setRemoveBanner(event.target.checked)} /> Remove banner
                </label>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Description">
        <RichText value={draft.description} onChange={(description) => set({ description })} />
      </Card>

      <Card title="Company social links">
        <SocialFields value={draft.socials} onChange={(socials) => set({ socials })} />
      </Card>

      <Card
        title="Founders"
        action={
          founders.length < 5 && (
            <Button type="button" tone="ghost" onClick={() => setFounders((current) => [...current, { name: "", role: "", bio: "", photo: null, socials: {}, file: null, removePhoto: false }])}>
              <Plus size={15} /> Add founder
            </Button>
          )
        }
      >
        {founders.length === 0 && <p className="text-sm text-[#667085]">No founders listed.</p>}
        <div className="space-y-4">
          {founders.map((founder, index) => (
            <div key={founder.id ?? `new-${index}`} className="rounded-lg border border-[#eef0f4] p-4">
              <div className="grid gap-3 md:grid-cols-[96px_1fr_1fr_auto]">
                <div>
                  <Preview src={founder.file ? URL.createObjectURL(founder.file) : founder.removePhoto ? null : founder.photo} className="aspect-square w-20 rounded-full" />
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 w-24 text-[11px]" onChange={(event) => setFounder(index, { file: event.target.files?.[0] ?? null })} />
                </div>
                <Field label="Name">
                  <TextInput value={founder.name} onChange={(event) => setFounder(index, { name: event.target.value })} required />
                </Field>
                <Field label="Role">
                  <TextInput value={founder.role} onChange={(event) => setFounder(index, { role: event.target.value })} />
                </Field>
                <button type="button" title="Remove founder" onClick={() => setFounders((current) => current.filter((_, at) => at !== index))} className="self-start rounded-md p-2 text-[#b42318] hover:bg-[#fdecea]">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-3">
                <Field label="Short bio">
                  <textarea value={founder.bio} rows={2} maxLength={600} onChange={(event) => setFounder(index, { bio: event.target.value })} className={controlClass} />
                </Field>
              </div>
              {founder.photo && !founder.file && (
                <label className="mt-2 flex items-center gap-1.5 text-sm text-[#475467]">
                  <input type="checkbox" checked={founder.removePhoto} onChange={(event) => setFounder(index, { removePhoto: event.target.checked })} /> Remove photo
                </label>
              )}
              <div className="mt-3">
                <SocialFields value={founder.socials} onChange={(socials) => setFounder(index, { socials })} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="sticky bottom-0 -mx-1 flex justify-end border-t border-[#e6e8ef] bg-[#f5f6fa]/95 px-1 py-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save content"}
        </Button>
      </div>
    </form>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1 text-sm capitalize", on ? "border-[#0b6e4f] bg-[#e7f3ee] font-medium text-[#0b6e4f]" : "border-[#e6e8ef] bg-white text-[#475467] hover:border-[#98a2b3]")}
    >
      {children}
    </button>
  );
}

function Preview({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("rounded-lg border border-[#e6e8ef] object-cover", className)} />
  ) : (
    <div className={cn("grid place-items-center rounded-lg border border-dashed border-[#d0d5dd] bg-[#f9fafb] text-xs text-[#98a2b3]", className)}>None</div>
  );
}

function SocialFields({ value, onChange }: { value: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {SOCIALS.map((social) => (
        <Field key={social.key} label={social.label}>
          <TextInput value={value[social.key] ?? ""} onChange={(event) => onChange({ ...value, [social.key]: event.target.value })} placeholder="https://" />
        </Field>
      ))}
    </div>
  );
}
