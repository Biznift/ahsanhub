"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { NAV_GROUPS, isPinnedNav, moduleBySlug, navModules } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";
import { api } from "@/components/admin-kit";

const card = "rounded-md border border-[#e6e8ef] bg-white p-5";

export default function SettingsPage() {
  const module = moduleBySlug("settings");
  const { notify, hiddenSlugs, setFeatureOn, showAllFeatures } = useStore();
  const menuItems = navModules();
  const shown = menuItems.filter((item) => isPinnedNav(item.slug) || !hiddenSlugs.includes(item.slug)).length;
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contactEmail: "hello@example.com",
    theme: "light",
    maintenance: false,
    youtube: "",
    facebook: "",
    linkedin: "",
    tiktok: "",
    whatsapp: "",
    whatsappMessage: "Hi! I found you on your website.",
    gaId: "",
    pixelId: "",
    phone: "",
    address: "Dhaka, Bangladesh",
    invoiceNote: "Thank you for your business.",
  });
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    api<typeof form>("/api/admin/settings")
      .then((saved) => setForm((current) => ({ ...current, ...saved })))
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = await api<typeof form>("/api/admin/settings", { method: "PUT", body: JSON.stringify(form) });
      setForm((current) => ({ ...current, ...saved }));
      setError(null);
      notify(saved.maintenance ? "Settings saved. Maintenance mode is on." : "Settings saved");
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  return (
    <ModuleFrame module={module}>
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Menu</h2>
            <p className="mt-1 max-w-2xl text-sm text-[#667085]">
              Turn a feature off to hide it from the menu. Turn it back on whenever you need it. Hidden pages keep their data.
              Dashboard and Settings stay in the menu.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#667085]">
              {shown} of {menuItems.length} shown
            </p>
            {shown < menuItems.length && (
              <button type="button" onClick={showAllFeatures} className="text-sm font-medium text-[#0b6e4f]">
                Show all
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {NAV_GROUPS.map((group) => {
            const items = menuItems.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98a2b3]">{group}</p>
                <ul className="mt-2 divide-y divide-[#eef0f4] rounded-lg border border-[#e6e8ef]">
                  {items.map((item) => {
                    const pinned = isPinnedNav(item.slug);
                    const on = pinned || !hiddenSlugs.includes(item.slug);
                    return (
                      <li key={item.slug} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1d2939]">{item.label}</p>
                          <p className="truncate text-xs text-[#667085]">{pinned ? "Always in the menu" : item.summary}</p>
                        </div>
                        <button
                          type="button"
                          disabled={pinned}
                          aria-pressed={on}
                          aria-label={`${on ? "Hide" : "Show"} ${item.label}`}
                          onClick={() => setFeatureOn(item.slug, !on)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium disabled:cursor-default ${
                            on ? "bg-[#0b6e4f] text-white disabled:opacity-80" : "bg-[#f2f4f7] text-[#667085]"
                          }`}
                        >
                          {on ? "On" : "Hidden"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
      <form onSubmit={save} className="mt-4 space-y-4">
        <p className="rounded-md border border-[#e6e8ef] bg-white px-4 py-3 text-sm text-[#667085]">
          Site name, slogan, logo, and SEO live in{" "}
          <Link href="/admin/branding" className="font-medium text-[#0b6e4f]">Branding & SEO</Link>.
          The payment gateway lives in{" "}
          <Link href="/admin/payments" className="font-medium text-[#0b6e4f]">Payments</Link>.
        </p>
        <section className={`${card} grid gap-3 sm:grid-cols-2`}>
          <Field label="Contact email">
            <TextInput value={form.contactEmail} onChange={(event) => set({ contactEmail: event.target.value })} />
          </Field>
          <Field label="Default theme">
            <SelectInput value={form.theme} onChange={(event) => set({ theme: event.target.value })}>
              <option value="light">light</option>
              <option value="dark">dark</option>
            </SelectInput>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.maintenance} onChange={(event) => set({ maintenance: event.target.checked })} />
            Maintenance mode
          </label>
        </section>
        <section className={card}>
          <h2 className="font-semibold">Social links</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["youtube", "facebook", "linkedin", "tiktok"] as const).map((key) => (
              <Field key={key} label={key}>
                <TextInput value={form[key]} onChange={(event) => set({ [key]: event.target.value })} placeholder="https://" />
              </Field>
            ))}
          </div>
        </section>
        <section className={card}>
          <h2 className="font-semibold">WhatsApp chat button</h2>
          <p className="mt-1 text-sm text-[#667085]">A floating button on public pages. Leave the number empty to hide it.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp number">
              <TextInput value={form.whatsapp} onChange={(event) => set({ whatsapp: event.target.value })} placeholder="8801XXXXXXXXX" />
            </Field>
            <Field label="Pre-filled message">
              <TextInput value={form.whatsappMessage} onChange={(event) => set({ whatsappMessage: event.target.value })} />
            </Field>
          </div>
        </section>
        <section className={card}>
          <h2 className="font-semibold">Analytics</h2>
          <p className="mt-1 text-sm text-[#667085]">Tracking runs on public pages only, never in the admin.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Google Analytics 4 measurement ID">
              <TextInput value={form.gaId} onChange={(event) => set({ gaId: event.target.value })} placeholder="G-XXXXXXXXXX" />
            </Field>
            <Field label="Facebook Pixel ID">
              <TextInput value={form.pixelId} onChange={(event) => set({ pixelId: event.target.value })} placeholder="123456789012345" />
            </Field>
          </div>
        </section>
        <section className={card}>
          <h2 className="font-semibold">Invoice details</h2>
          <p className="mt-1 text-sm text-[#667085]">Printed with the site name and contact email.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Business phone">
              <TextInput value={form.phone} onChange={(event) => set({ phone: event.target.value })} placeholder="+880 1XXX-XXXXXX" />
            </Field>
            <Field label="Address">
              <TextInput value={form.address} onChange={(event) => set({ address: event.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Invoice note">
                <textarea
                  rows={2}
                  value={form.invoiceNote}
                  onChange={(event) => set({ invoiceNote: event.target.value })}
                  className="w-full rounded-lg border border-[#e6e8ef] px-3 py-2 text-sm outline-none ring-[#0b6e4f] focus:ring-2"
                />
              </Field>
            </div>
          </div>
        </section>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit">Save settings</Button>
      </form>
    </ModuleFrame>
  );
}
