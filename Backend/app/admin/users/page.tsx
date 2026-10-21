"use client";

import { FormEvent, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";
import { Card, Empty, StatusPill, api, formatDate, useApi } from "@/components/admin-kit";

type Role = "admin" | "owner";
type User = { id: string; name: string; email: string; role: Role; status: "active" | "disabled"; listings: number; createdAt: string };

export default function UsersPage() {
  const module = moduleBySlug("users");
  const { notify, session } = useStore();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, reload } = useApi<{ items: User[] }>(`/api/admin/users${submitted ? `?q=${encodeURIComponent(submitted)}` : ""}`);
  const [form, setForm] = useState({ name: "", email: "", role: "owner" as Role, password: "" });
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
      notify(`${form.email} added`);
      setForm({ name: "", email: "", role: "owner", password: "" });
      setError(null);
      reload();
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  async function patch(user: User, change: Partial<User> & { password?: string }) {
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify(change) });
      notify("Saved");
      reload();
    } catch (problem) {
      notify((problem as Error).message);
    }
  }

  async function remove(user: User) {
    if (!window.confirm(`Delete ${user.email}? Their ${user.listings} listings stay, without an owner.`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, { method: "DELETE" });
      reload();
    } catch (problem) {
      notify((problem as Error).message);
    }
  }

  return (
    <ModuleFrame module={module}>
      <Card title="Add an account">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-[1fr_1fr_140px_1fr_auto]">
          <Field label="Name">
            <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </Field>
          <Field label="Role">
            <SelectInput value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </SelectInput>
          </Field>
          <Field label="Password">
            <TextInput type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Add</Button>
          </div>
          {error && <p className="text-sm text-[var(--danger)] md:col-span-5">{error}</p>}
        </form>
      </Card>

      <form
        className="mt-4 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(query.trim());
        }}
      >
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" />
        <Button type="submit" tone="ghost">
          Search
        </Button>
      </form>

      {data?.items.length === 0 && <div className="mt-4"><Empty>No accounts match.</Empty></div>}
      {data && data.items.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#e6e8ef] bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#e6e8ef] text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Listings</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => {
                const self = user.email === session?.email;
                return (
                  <tr key={user.id} className="border-t border-[#eef0f4]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1d2939]">{user.name}</p>
                      <p className="text-xs text-[#667085]">
                        {user.email} · joined {formatDate(user.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <SelectInput value={user.role} disabled={self} onChange={(event) => patch(user, { role: event.target.value as Role })} className="py-1.5" aria-label={`Role for ${user.email}`}>
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                      </SelectInput>
                    </td>
                    <td className="px-4 py-3 text-[#344054]">{user.listings}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={user.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          tone="ghost"
                          className="px-3 py-1.5 text-sm"
                          onClick={() => {
                            const password = window.prompt(`New password for ${user.email} (8+ characters)`);
                            if (password) patch(user, { password });
                          }}
                        >
                          Reset password
                        </Button>
                        {!self && (
                          <>
                            <Button type="button" tone="ghost" className="px-3 py-1.5 text-sm" onClick={() => patch(user, { status: user.status === "active" ? "disabled" : "active" })}>
                              {user.status === "active" ? "Disable" : "Enable"}
                            </Button>
                            <Button type="button" tone="danger" className="px-3 py-1.5 text-sm" onClick={() => remove(user)}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ModuleFrame>
  );
}
