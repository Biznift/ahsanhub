"use client";

import { FormEvent, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, TextInput } from "@/components/ui";
import { Card, Empty, Switch, api, useApi } from "@/components/admin-kit";

type Category = { id: string; name: string; slug: string; description: string; hidden: boolean; sortOrder: number; count: number };

export default function CategoriesPage() {
  const module = moduleBySlug("categories");
  const { notify } = useStore();
  const { data, reload } = useApi<{ items: Category[] }>("/api/admin/categories");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/admin/categories", { method: "POST", body: JSON.stringify({ name, description }) });
      setName("");
      setDescription("");
      setError(null);
      notify(`${name} added`);
      reload();
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  async function patch(id: string, change: Partial<Category>) {
    try {
      await api(`/api/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(change) });
      reload();
    } catch (problem) {
      notify((problem as Error).message);
    }
  }

  async function move(index: number, by: -1 | 1) {
    const items = data?.items ?? [];
    const other = items[index + by];
    const self = items[index];
    if (!other || !self) return;
    await Promise.all([
      api(`/api/admin/categories/${self.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: other.sortOrder }) }),
      api(`/api/admin/categories/${other.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: self.sortOrder === other.sortOrder ? self.sortOrder + by : self.sortOrder }) }),
    ]);
    reload();
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete ${category.name}? ${category.count} listings lose this category.`)) return;
    await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    notify(`${category.name} deleted`);
    reload();
  }

  return (
    <ModuleFrame module={module}>
      <Card title="Add a category">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <Field label="Name">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} required placeholder="Islamic Finance" />
          </Field>
          <Field label="Description (shown on the category page)">
            <TextInput value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Add</Button>
          </div>
          {error && <p className="text-sm text-[var(--danger)] md:col-span-3">{error}</p>}
        </form>
      </Card>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#e6e8ef] bg-white">
        {data?.items.length === 0 && <Empty>No categories yet.</Empty>}
        <ul className="divide-y divide-[#eef0f4]">
          {data?.items.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className="text-[#98a2b3] hover:text-[#0b6e4f] disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button type="button" aria-label="Move down" disabled={index === data.items.length - 1} onClick={() => move(index, 1)} className="text-[#98a2b3] hover:text-[#0b6e4f] disabled:opacity-30">
                  <ArrowDown size={14} />
                </button>
              </div>
              {editing === category.id ? (
                <EditRow
                  category={category}
                  onCancel={() => setEditing(null)}
                  onSave={async (change) => {
                    await patch(category.id, change);
                    setEditing(null);
                  }}
                />
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#1d2939]">
                    {category.name} <span className="ml-1 text-xs font-normal text-[#98a2b3]">/{category.slug}</span>
                  </p>
                  <p className="truncate text-sm text-[#667085]">{category.description || "No description"}</p>
                </div>
              )}
              <span className="w-24 text-right text-sm text-[#667085]">{category.count} listings</span>
              <div className="flex items-center gap-2 text-sm text-[#475467]">
                Visible <Switch label="Visible on site" checked={!category.hidden} onChange={(visible) => patch(category.id, { hidden: !visible })} />
              </div>
              {editing !== category.id && (
                <Button type="button" tone="ghost" className="px-3 py-1.5 text-sm" onClick={() => setEditing(category.id)}>
                  Edit
                </Button>
              )}
              <button type="button" aria-label={`Delete ${category.name}`} onClick={() => remove(category)} className="rounded-md p-2 text-[#b42318] hover:bg-[#fdecea]">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ModuleFrame>
  );
}

function EditRow({ category, onSave, onCancel }: { category: Category; onSave: (change: Partial<Category>) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);
  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
      <TextInput value={name} onChange={(event) => setName(event.target.value)} className="w-48" />
      <TextInput value={description} onChange={(event) => setDescription(event.target.value)} className="min-w-[220px] flex-1" placeholder="Description" />
      <Button type="button" className="px-3 py-1.5 text-sm" onClick={() => onSave({ name, description })}>
        Save
      </Button>
      <Button type="button" tone="ghost" className="px-3 py-1.5 text-sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
