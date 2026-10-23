"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { CircleAlert, Check, ImagePlus, Lock, Plus, Trash2, X } from "lucide-react";
import type { Account, AlternativeRef, Category, EditableListing, ListingKind, Pricing, SocialKey, Socials } from "@/lib/types";
import { KIND_LABEL, LISTING_KINDS, PLATFORM_LABEL, PRICING_LABEL, categoryKind, cn } from "@/lib/format";
import { CategoryPicker } from "@/components/category-picker";
import { AlternativePicker } from "@/components/alternative-picker";
import { IMAGE_RULES, checkImage, type ImageRule } from "@/lib/image-check";
import { RichTextEditor } from "@/components/rich-text-editor";
import { BrandIcon, SOCIAL_KEYS, SOCIAL_LABEL } from "@/components/brand-icons";

type FounderDraft = { key: string; id?: string; name: string; role: string; bio: string; socials: Socials; photo: string | null; photoUrl: string; file: File | null; removePhoto: boolean };

type Draft = {
  name: string;
  website: string;
  overview: string;
  pricing: Pricing;
  kind: ListingKind;
  categoryIds: string[];
  proposedCategories: string[];
  country: string;
  platforms: string[];
  halalNote: string;
  description: string;
  socials: Socials;
};

const SECTIONS = [
  { id: "company", label: "Company" },
  { id: "media", label: "Logo and banner" },
  { id: "description", label: "Description" },
  { id: "links", label: "Social links" },
  { id: "founders", label: "Founders" },
];

let keySeed = 0;
const newKey = () => `f${++keySeed}`;

function emptyFounder(): FounderDraft {
  return { key: newKey(), name: "", role: "", bio: "", socials: {}, photo: null, photoUrl: "", file: null, removePhoto: false };
}

export function SubmitForm({ categories, existing }: { categories: Category[]; existing?: EditableListing }) {
  const editing = Boolean(existing);
  const [account, setAccount] = useState<Account | null>(null);
  const [draft, setDraft] = useState<Draft>(() => ({
    name: existing?.name ?? "",
    website: existing?.website ?? "",
    overview: existing?.overview ?? "",
    pricing: existing?.pricing ?? "freemium",
    kind: existing?.kind ?? "software",
    categoryIds: existing?.categoryIds ?? [],
    proposedCategories: [],
    country: existing?.country ?? "",
    platforms: existing?.platforms ?? ["web"],
    halalNote: existing?.halalNote ?? "",
    description: existing?.description ?? "",
    socials: existing?.socials ?? {},
  }));
  const [textLength, setTextLength] = useState(existing ? 999 : 0);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const [removeBanner, setRemoveBanner] = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeRef[]>(existing?.alternatives ?? []);
  const [founders, setFounders] = useState<FounderDraft[]>(() =>
    existing?.founders.length ? existing.founders.map((founder) => ({ ...founder, key: newKey(), photoUrl: "", file: null, removePhoto: false })) : [emptyFounder()],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactName, setContactName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ slug: string; hasAccount: boolean; createdAccount: boolean } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editing) return;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((body: { user: Account | null }) => setAccount(body.user))
      .catch(() => undefined);
  }, [editing]);

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const setFounder = (key: string, patch: Partial<FounderDraft>) => setFounders((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!editing && !logo && !logoUrl.trim()) return fail("Upload a logo or paste an image URL.", "media");
    if (draft.categoryIds.length + draft.proposedCategories.length === 0) return fail("Pick at least one category.", "company");
    if (textLength < 80) return fail("The description needs at least 80 characters.", "description");

    const form = new FormData();
    form.set(
      "data",
      JSON.stringify({
        ...draft,
        alternativeIds: alternatives.map((item) => item.id),
        removeBanner: bannerUrl.trim() ? false : removeBanner,
        logoUrl,
        bannerUrl,
        founders: founders
          .filter((founder) => founder.name.trim())
          .map(({ id, name, role, bio, socials, removePhoto, photoUrl }) => ({ id, name, role, bio, socials, removePhoto, photoUrl })),
      }),
    );
    if (logo) form.set("logo", logo);
    if (banner) form.set("banner", banner);
    founders.filter((founder) => founder.name.trim()).forEach((founder, index) => founder.file && form.set(`founderPhoto:${index}`, founder.file));
    if (!editing) {
      form.set("email", email);
      if (password) form.set("password", password);
      if (contactName) form.set("contactName", contactName);
    }

    setBusy(true);
    try {
      const response = await fetch(editing ? `/api/account/listings/${existing!.id}` : "/api/public/listings", { method: editing ? "PATCH" : "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
      if (editing) {
        setSaved(true);
        setLogo(null);
        setBanner(null);
        window.setTimeout(() => setSaved(false), 3000);
      } else {
        setDone(body);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function fail(message: string, section: string) {
    setError(message);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (done) return <SubmittedNotice result={done} name={draft.name} />;

  const signedIn = Boolean(account);
  const sections = editing ? SECTIONS : [...SECTIONS, { id: "account", label: "Your account" }];

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_minmax(0,1fr)]" noValidate={false}>
      <nav className="hidden lg:block" aria-label="Form sections">
        <ol className="sticky top-24 space-y-1 border-l border-line">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="-ml-px flex items-center gap-3 border-l border-transparent py-1.5 pl-4 text-[14px] text-muted transition hover:border-ink hover:text-ink">
                <span className="text-[12px] tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 space-y-6">
        <Section id="company" index={1} title="Company" description="The basics people see first.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Company or product name" required>
              <Input value={draft.name} onChange={(name) => set({ name })} required minLength={2} maxLength={80} placeholder="Qibla Ledger" />
            </Field>
            <Field label="Website" required>
              <Input value={draft.website} onChange={(website) => set({ website })} required type="url" placeholder="https://example.com" inputMode="url" />
            </Field>
          </div>
          <Field label="Overview" required hint={`${draft.overview.length}/180. One sentence on what it does and for whom.`}>
            <Input value={draft.overview} onChange={(overview) => set({ overview })} required minLength={10} maxLength={180} placeholder="Bookkeeping for small businesses that keeps interest out of the books." />
          </Field>
          <Field label="What are you listing?" required hint="Software and SaaS, a service you provide, or an online shop. Categories below belong to this type.">
            <div className="grid gap-2 sm:grid-cols-3">
              {LISTING_KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => value !== draft.kind && set({ kind: value, categoryIds: [], proposedCategories: [] })}
                  aria-pressed={draft.kind === value}
                  className={cn("h-11 rounded-xl border px-3 text-[14px] font-medium transition", draft.kind === value ? "border-brand bg-brand-soft text-brand-text" : "border-line text-ink-soft hover:border-line-strong")}
                >
                  {KIND_LABEL[value]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Pricing" required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(PRICING_LABEL) as Pricing[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set({ pricing: value })}
                  aria-pressed={draft.pricing === value}
                  className={cn("h-11 rounded-xl border text-[14px] font-medium transition", draft.pricing === value ? "border-brand bg-brand-soft text-brand-text" : "border-line text-ink-soft hover:border-line-strong")}
                >
                  {PRICING_LABEL[value]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Categories" required hint={`${draft.categoryIds.length + draft.proposedCategories.length}/5 selected. Choose more than one if it fits. A category you add yourself stays pending until an admin approves it.`}>
            <CategoryPicker
              categories={categories.filter((category) => categoryKind(category) === draft.kind && category.status !== "rejected")}
              categoryIds={draft.categoryIds}
              proposed={draft.proposedCategories}
              onChange={(next) => set(next)}
            />
          </Field>
          <Field label="Alternative tools" hint={`${alternatives.length}/5. Type to find a saved tool, or add a new name. It stays in the list for the next listing.`}>
            <AlternativePicker selected={alternatives} onChange={setAlternatives} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Based in" hint="Optional">
              <Input value={draft.country} onChange={(country) => set({ country })} maxLength={60} placeholder="United Kingdom" />
            </Field>
            <Field label="Halal practices" hint="Optional. For example: no interest-based features.">
              <Input value={draft.halalNote} onChange={(halalNote) => set({ halalNote })} maxLength={300} placeholder="Payments processed without riba" />
            </Field>
          </div>
          <Field label="Platforms" hint="Optional">
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_LABEL).map(([value, label]) => {
                const on = draft.platforms.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ platforms: on ? draft.platforms.filter((item) => item !== value) : [...draft.platforms, value] })}
                    className={cn("h-9 rounded-lg border px-3 text-[13.5px] font-medium transition", on ? "border-ink bg-ink text-bg" : "border-line text-ink-soft hover:border-line-strong")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        <Section id="media" index={2} title="Logo and banner" description="Sharp images make your listing stand out in every list.">
          <div className="grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
            <ImageDrop
              label="Logo"
              required={!editing}
              spec="Square · 512 × 512 · PNG, JPG or WebP · up to 2 MB. Or paste a Cloudinary link or any image URL."
              rule={IMAGE_RULES.logo}
              file={logo}
              url={logoUrl}
              current={existing?.logo ?? null}
              onFile={setLogo}
              onUrl={setLogoUrl}
              shape="square"
            />
            <ImageDrop
              label="Banner"
              spec="Optional · 16:9 landscape · 1600 × 900 · up to 5 MB. Or paste an image URL."
              rule={IMAGE_RULES.banner}
              file={banner}
              url={bannerUrl}
              current={removeBanner ? null : (existing?.banner ?? null)}
              onFile={(file) => {
                setBanner(file);
                if (file) setRemoveBanner(false);
              }}
              onUrl={(value) => {
                setBannerUrl(value);
                if (value.trim()) setRemoveBanner(false);
              }}
              onRemoveCurrent={existing?.banner ? () => setRemoveBanner(true) : undefined}
              shape="wide"
            />
          </div>
        </Section>

        <Section id="description" index={3} title="Description" description="Explain what it does, who it is for, and why it is different. Use headings and lists to make it easy to scan.">
          <RichTextEditor
            value={draft.description}
            placeholder="Start with the problem you solve…"
            onChange={(description, length) => {
              set({ description });
              setTextLength(length);
            }}
          />
          <p className={cn("mt-2 text-[13px]", textLength < 80 ? "text-muted" : "text-brand-text")}>{textLength < 80 ? `${80 - Math.min(textLength, 80)} more characters needed` : "Looks good"}</p>
        </Section>

        <Section id="links" index={4} title="Company social links" description="Optional. Add the profiles you keep up to date.">
          <SocialInputs value={draft.socials} onChange={(socials) => set({ socials })} />
        </Section>

        <Section id="founders" index={5} title="Founders" description="People trust products with real people behind them. Add up to five.">
          <div className="space-y-4">
            {founders.map((founder, index) => (
              <FounderCard
                key={founder.key}
                founder={founder}
                index={index}
                canRemove={founders.length > 1 || Boolean(founder.name)}
                onChange={(patch) => setFounder(founder.key, patch)}
                onRemove={() => setFounders((current) => (current.length > 1 ? current.filter((item) => item.key !== founder.key) : [emptyFounder()]))}
              />
            ))}
          </div>
          {founders.length < 5 && (
            <button type="button" onClick={() => setFounders((current) => [...current, emptyFounder()])} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 text-[14px] font-medium text-ink-soft transition hover:border-ink hover:text-ink">
              <Plus size={16} /> Add another founder
            </button>
          )}
        </Section>

        {!editing && (
          <Section id="account" index={6} title="Your account" description="We email you when your listing goes live.">
            {signedIn ? (
              <p className="flex items-center gap-2 rounded-xl border border-line bg-band px-4 py-3 text-[14px] text-ink-soft">
                <Lock size={15} /> Submitting as <span className="font-semibold text-ink">{account!.email}</span>. You can edit this listing from your account.
              </p>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Email" required>
                    <Input value={email} onChange={setEmail} type="email" required autoComplete="email" placeholder="you@company.com" />
                  </Field>
                  <Field label="Your name" hint="Optional">
                    <Input value={contactName} onChange={setContactName} maxLength={80} autoComplete="name" />
                  </Field>
                </div>
                <Field label="Password" hint="Optional. Creates an account with this email so you can edit the listing later.">
                  <Input value={password} onChange={setPassword} type="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
                </Field>
                {password.length === 0 ? (
                  <div className="flex gap-3 rounded-xl border border-warn-text/30 bg-warn-soft p-4 text-[14px] leading-relaxed text-warn-text" role="note">
                    <CircleAlert size={18} className="mt-0.5 shrink-0" />
                    <p>
                      <span className="font-semibold">Without a password you will not be able to edit this listing later.</span> You can still submit. Our team reviews it and can make changes for you on request, but you will not have an account to update it yourself.
                    </p>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-[13px] text-brand-text">
                    <Check size={14} strokeWidth={2.6} /> An account will be created for {email || "this email"}. Already have one? Enter its password.
                  </p>
                )}
              </>
            )}
          </Section>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[14px] text-danger" role="alert">
            <CircleAlert size={17} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="sticky bottom-0 z-20 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-glass px-5 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
          <p className="text-[13px] text-muted">
            {editing
              ? saved
                ? existing?.status === "published"
                  ? "Saved. It is hidden again until an admin approves the changes."
                  : "Saved. It stays in review until an admin publishes it."
                : existing?.status === "published"
                  ? "Saving sends this live listing back to review."
                  : "Changes stay in review until an admin publishes the listing."
              : "Every listing is reviewed by a person before it is published."}
          </p>
          <button type="submit" disabled={busy} className="h-11 rounded-xl bg-brand px-6 text-[15px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60">
            {busy ? (editing ? "Saving…" : "Submitting…") : editing ? "Save changes" : "Submit for review"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SubmittedNotice({ result, name }: { result: { slug: string; hasAccount: boolean; createdAccount: boolean }; name: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 text-center sm:p-10">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand text-white">
        <Check size={24} strokeWidth={2.6} />
      </span>
      <h2 className="mt-5 text-[26px] font-semibold tracking-[-0.02em] text-ink">{name} is in the review queue</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        We check every product by hand, usually within a few days. {result.hasAccount ? "You can follow its status and edit it from your account." : "Because you submitted without a password, our team will make any changes for you."}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {result.hasAccount && (
          <Link href="/account" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-hover">
            Go to my listings
          </Link>
        )}
        <Link href="/explore" className="inline-flex h-11 items-center rounded-xl border border-line px-5 text-[15px] font-semibold text-ink hover:border-line-strong">
          Explore products
        </Link>
      </div>
    </div>
  );
}

function Section({ id, index, title, description, children }: { id: string; index: number; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="mb-6 flex items-start gap-4">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-[12px] font-semibold tabular-nums text-muted">{index}</span>
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {description && <p className="mt-1 text-[14px] leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[14px] font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </p>
      {children}
      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, className, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { value: string; onChange: (value: string) => void }) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn("h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] text-ink outline-none transition placeholder:text-muted focus:border-brand", className)}
    />
  );
}

function usePreview(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}

function ImageDrop({
  label,
  required,
  spec,
  rule,
  file,
  url = "",
  current,
  onFile,
  onUrl,
  onRemoveCurrent,
  shape,
}: {
  label: string;
  required?: boolean;
  spec: string;
  rule: ImageRule;
  file: File | null;
  url?: string;
  current: string | null;
  onFile: (file: File | null) => void;
  onUrl?: (url: string) => void;
  onRemoveCurrent?: () => void;
  shape: "square" | "wide" | "round";
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const preview = usePreview(file) ?? (url.trim() || null) ?? current;

  async function take(next: File | undefined) {
    if (!next) return;
    const message = await checkImage(next, rule);
    setProblem(message);
    if (!message) onUrl?.("");
    onFile(message ? null : next);
  }

  return (
    <div>
      <p className="mb-2 text-[14px] font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </p>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files[0]);
        }}
        className={cn(
          "group relative grid cursor-pointer place-items-center overflow-hidden border border-dashed bg-bg transition",
          shape === "square" && "aspect-square w-full max-w-[200px] rounded-2xl",
          shape === "wide" && "aspect-video w-full rounded-2xl",
          shape === "round" && "h-20 w-20 rounded-full",
          dragging ? "border-brand bg-brand-soft" : problem ? "border-danger" : "border-line-strong hover:border-ink",
        )}
      >
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => take(event.target.files?.[0])} />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-3 text-center text-muted">
            <ImagePlus size={shape === "round" ? 18 : 22} strokeWidth={1.7} />
            {shape !== "round" && <span className="text-[13px] font-medium">Drop an image or click to upload</span>}
          </span>
        )}
        {preview && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-center text-[12px] font-medium text-white opacity-0 transition group-hover:opacity-100">Replace</span>}
      </label>
      {shape !== "round" && <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{spec}</p>}
      {(file || (current && onRemoveCurrent)) && shape !== "round" && (
        <button
          type="button"
          onClick={() => {
            if (file) onFile(null);
            else onRemoveCurrent?.();
          }}
          className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-danger"
        >
          <X size={13} /> Remove
        </button>
      )}
      {onUrl && shape !== "round" && (
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">or paste an image URL</span>
          <Input
            value={url}
            onChange={(value) => {
              onUrl(value);
              if (value.trim()) onFile(null);
            }}
            placeholder="https://res.cloudinary.com/… or any image link"
          />
        </label>
      )}
      {problem && <p className="mt-1.5 text-[13px] text-danger">{problem}</p>}
    </div>
  );
}

function SocialInputs({ value, onChange, compact = false }: { value: Socials; onChange: (next: Socials) => void; compact?: boolean }) {
  return (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
      {SOCIAL_KEYS.map((key: SocialKey) => (
        <label key={key} className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 transition focus-within:border-brand">
          <span className="text-muted">
            <BrandIcon name={key} size={15} />
          </span>
          <span className="sr-only">{SOCIAL_LABEL[key]}</span>
          <input
            value={value[key] ?? ""}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
            placeholder={key === "whatsapp" ? "WhatsApp number or link" : `${SOCIAL_LABEL[key]} URL`}
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
          />
        </label>
      ))}
    </div>
  );
}

function FounderCard({ founder, index, canRemove, onChange, onRemove }: { founder: FounderDraft; index: number; canRemove: boolean; onChange: (patch: Partial<FounderDraft>) => void; onRemove: () => void }) {
  const [showLinks, setShowLinks] = useState(Object.keys(founder.socials).length > 0);
  return (
    <div className="rounded-xl border border-line p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Founder {index + 1}</p>
        {canRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove founder ${index + 1}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-5 sm:grid-cols-[88px_minmax(0,1fr)]">
        <div>
          <ImageDrop
            label="Photo"
            spec=""
            rule={IMAGE_RULES.founder}
            file={founder.file}
            url={founder.photoUrl}
            current={founder.removePhoto ? null : founder.photo}
            onFile={(file) => onChange(file ? { file, photoUrl: "", removePhoto: false } : { file, removePhoto: false })}
            shape="round"
          />
          {(founder.file || (founder.photo && !founder.removePhoto)) && (
            <button type="button" onClick={() => onChange(founder.file ? { file: null } : { removePhoto: true })} className="mt-1 text-[12px] font-medium text-muted hover:text-danger">
              Remove
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={founder.name} onChange={(name) => onChange({ name })} maxLength={80} placeholder="Aisha Rahman" />
            </Field>
            <Field label="Role">
              <Input value={founder.role} onChange={(role) => onChange({ role })} maxLength={80} placeholder="Founder & CEO" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="or photo URL">
                <Input
                  value={founder.photoUrl}
                  onChange={(photoUrl) => onChange(photoUrl.trim() ? { photoUrl, file: null, removePhoto: false } : { photoUrl })}
                  placeholder="https://res.cloudinary.com/… or any image link"
                />
              </Field>
            </div>
          </div>
          <Field label="Short bio">
            <textarea
              value={founder.bio}
              onChange={(event) => onChange({ bio: event.target.value })}
              maxLength={600}
              rows={3}
              placeholder="Background, what they built before, why they started this."
              className="w-full rounded-xl border border-line bg-bg px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-muted focus:border-brand"
            />
          </Field>
          {showLinks ? (
            <SocialInputs value={founder.socials} onChange={(socials) => onChange({ socials })} compact />
          ) : (
            <button type="button" onClick={() => setShowLinks(true)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-text">
              <Plus size={15} /> Add founder social links
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
