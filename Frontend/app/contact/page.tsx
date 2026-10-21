"use client";

import { FormEvent, useState } from "react";
import { Container, SectionHeader } from "@/components/section";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          kind: form.get("kind"),
          title: form.get("title"),
          body: form.get("body"),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Could not send the message");
      }
      setSent(true);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="max-w-2xl py-10">
      <SectionHeader title="Contact" description="Bug, idea, or a note. It lands in the admin inbox." />
      {sent ? (
        <p className="rounded-2xl border border-line bg-surface p-5 text-ink">Message received. Jazakallahu khairan.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <input name="name" required minLength={2} placeholder="Name" className="h-11 w-full rounded-xl border border-line px-3" />
          <input name="email" type="email" required placeholder="Email" className="h-11 w-full rounded-xl border border-line px-3" />
          <select name="kind" className="h-11 w-full rounded-xl border border-line px-3">
            <option value="FEEDBACK">Feedback</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature</option>
          </select>
          <input name="title" required minLength={4} placeholder="Subject" className="h-11 w-full rounded-xl border border-line px-3" />
          <textarea name="body" required minLength={10} rows={5} placeholder="Message" className="w-full rounded-xl border border-line px-3 py-2" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="h-11 rounded-xl bg-brand px-5 font-semibold text-white disabled:opacity-60">
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </Container>
  );
}
