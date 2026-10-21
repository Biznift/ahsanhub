"use client";

import { useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Badge, Button, Field, TextInput } from "@/components/ui";
import { api, useApi } from "@/components/admin-kit";

type Backup = { id: string; name: string; size: string; automatic: boolean; createdAt: string };

export default function BackupsPage() {
  const module = moduleBySlug("backups");
  const { notify } = useStore();
  const { data, reload } = useApi<{ items: Backup[] }>("/api/admin/backups");
  const backups = data?.items ?? [];
  const [target, setTarget] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const selected = backups.find((item) => item.id === target) ?? null;

  return (
    <ModuleFrame module={module}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
          <div>
            <h2 className="font-semibold">Snapshots</h2>
            <p className="text-sm text-[var(--muted)]">A snapshot stores the database rows. Uploaded files stay on disk. Restore asks you to type RESTORE.</p>
          </div>
          <Button
            type="button"
            onClick={async () => {
              await api("/api/admin/backups", { method: "POST" });
              notify("Backup created");
              reload();
            }}
          >
            Create backup
          </Button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{backup.name}</div>
                    <Badge tone={backup.automatic ? "info" : "muted"}>{backup.automatic ? "automatic" : "manual"}</Badge>
                  </td>
                  <td className="px-4 py-3">{backup.createdAt}</td>
                  <td className="px-4 py-3">{backup.size}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        tone="ghost"
                        onClick={() => {
                          window.location.href = `/api/admin/backups/${backup.id}/download`;
                        }}
                      >
                        Download
                      </Button>
                      <Button
                        type="button"
                        tone="ghost"
                        onClick={() => {
                          setTarget(backup.id);
                          setConfirmText("");
                        }}
                      >
                        Restore
                      </Button>
                      <Button
                        type="button"
                        tone="danger"
                        onClick={async () => {
                          await api(`/api/admin/backups/${backup.id}`, { method: "DELETE" });
                          if (target === backup.id) setTarget(null);
                          notify("Backup deleted");
                          reload();
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                    No snapshots yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {selected && (
          <form
            className="max-w-lg space-y-3 rounded-2xl border border-[#f0c7bf] bg-[#fff7f5] p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (confirmText !== "RESTORE" || !selected) return;
              try {
                await api(`/api/admin/backups/${selected.id}/restore`, { method: "POST", body: JSON.stringify({ confirm: "RESTORE" }) });
                notify("Backup restored. Sign in again if your session was replaced.");
                setTarget(null);
                setConfirmText("");
                reload();
              } catch (problem) {
                notify((problem as Error).message);
              }
            }}
          >
            <h2 className="font-semibold">Restore {selected.name}</h2>
            <p className="text-sm text-[var(--muted)]">
              Type RESTORE to confirm. This replaces the current database rows with the snapshot. Your admin account must be inside that snapshot.
            </p>
            <Field label="Confirmation">
              <TextInput value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="RESTORE" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={confirmText !== "RESTORE"}>
                Restore snapshot
              </Button>
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  setTarget(null);
                  setConfirmText("");
                }}
              >
                Close
              </Button>
            </div>
          </form>
        )}
      </div>
    </ModuleFrame>
  );
}
