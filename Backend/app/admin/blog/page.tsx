"use client";

import { FormEvent, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Badge, Button, Field, SelectInput, TextInput } from "@/components/ui";
import { api, useApi } from "@/components/admin-kit";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  tags: string;
  cover: string;
  status: "draft" | "published";
  publishedAt: string;
};

const EMPTY: Omit<Post, "id"> = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  tags: "",
  cover: "",
  status: "draft",
  publishedAt: "",
};

export default function BlogPage() {
  const module = moduleBySlug("blog");
  const { notify } = useStore();
  const { data, reload } = useApi<{ items: Post[] }>("/api/admin/posts?kind=blog");
  const posts = data?.items ?? [];
  const [editing, setEditing] = useState<Post | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setEditing({ id: "", ...EMPTY });
    setPreview(false);
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editing.title.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      const { id, ...fields } = editing;
      const payload = { ...fields, kind: "blog" as const };
      if (id) await api(`/api/admin/posts/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/api/admin/posts", { method: "POST", body: JSON.stringify(payload) });
      setError(null);
      notify(editing.status === "published" ? "Post published" : "Draft saved");
      setEditing(null);
      reload();
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  return (
    <ModuleFrame module={module}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#667085]">Articles published at /blog. Write in Markdown.</p>
          {!editing && <Button type="button" onClick={openNew}>New post</Button>}
        </div>

        {editing ? (
          <form onSubmit={save} className="space-y-3 rounded-md border border-[#e6e8ef] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{editing.id ? "Edit post" : "New post"}</h2>
              <Button type="button" tone="ghost" onClick={() => setPreview((value) => !value)}>{preview ? "Edit" : "Preview"}</Button>
            </div>
            {preview ? (
              <article className="rounded-md bg-[#f8f9fc] p-4">
                <h3 className="text-xl font-semibold">{editing.title || "Untitled"}</h3>
                <p className="mt-2 text-sm text-[#667085]">{editing.excerpt}</p>
                <p className="mt-4 whitespace-pre-wrap text-sm">{editing.body || "Nothing written yet."}</p>
              </article>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title">
                    <TextInput value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} />
                  </Field>
                  <Field label="Slug">
                    <TextInput value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value })} placeholder="auto from title" />
                  </Field>
                </div>
                <Field label="Excerpt">
                  <TextInput value={editing.excerpt} onChange={(event) => setEditing({ ...editing, excerpt: event.target.value })} />
                </Field>
                <Field label="Body">
                  <textarea
                    rows={8}
                    value={editing.body}
                    onChange={(event) => setEditing({ ...editing, body: event.target.value })}
                    className="w-full rounded-lg border border-[#e6e8ef] px-3 py-2 font-mono text-sm outline-none ring-[#0b6e4f] focus:ring-2"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tags">
                    <TextInput value={editing.tags} onChange={(event) => setEditing({ ...editing, tags: event.target.value })} placeholder="admin, kit" />
                  </Field>
                  <Field label="Cover image">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file || !editing) return;
                        const form = new FormData();
                        form.set("file", file);
                        try {
                          const saved = await api<{ path: string }>("/api/admin/media", { method: "POST", body: form });
                          setEditing({ ...editing, cover: saved.path });
                        } catch (problem) {
                          setError((problem as Error).message);
                        }
                      }}
                      className="block w-full text-sm text-[#667085] file:mr-3 file:rounded-md file:border-0 file:bg-[#e7f3ee] file:px-3 file:py-1.5 file:text-sm file:text-[#0b6e4f]"
                    />
                    {editing.cover && <p className="mt-1 text-xs text-[#98a2b3]">{editing.cover}</p>}
                  </Field>
                  <Field label="Status">
                    <SelectInput value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as Post["status"] })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </SelectInput>
                  </Field>
                  <Field label="Publish at">
                    <TextInput type="datetime-local" value={editing.publishedAt} onChange={(event) => setEditing({ ...editing, publishedAt: event.target.value })} />
                  </Field>
                </div>
              </>
            )}
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit">{editing.status === "published" ? "Publish" : "Save draft"}</Button>
              <Button type="button" tone="ghost" onClick={() => setEditing(null)}>Back to list</Button>
            </div>
          </form>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#e6e8ef] bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-4 py-3 font-medium">Post</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t border-[#e6e8ef]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{post.title}</div>
                      <div className="text-xs text-[#98a2b3]">/blog/{post.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={post.status === "published" ? "ok" : "warn"}>{post.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button type="button" tone="ghost" onClick={() => setEditing(post)}>Edit</Button>
                        <Button
                          type="button"
                          tone="ghost"
                          onClick={async () => {
                            const status = post.status === "published" ? "draft" : "published";
                            await api(`/api/admin/posts/${post.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
                            notify(status === "published" ? "Post published" : "Post unpublished");
                            reload();
                          }}
                        >
                          {post.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          type="button"
                          tone="danger"
                          onClick={async () => {
                            await api(`/api/admin/posts/${post.id}`, { method: "DELETE" });
                            notify("Post deleted");
                            reload();
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleFrame>
  );
}
