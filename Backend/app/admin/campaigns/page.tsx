"use client";

import { useMemo, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { Badge, Button, Field, TextInput } from "@/components/ui";
import { api, useApi } from "@/components/admin-kit";
import {
  CRM_PACKAGES,
  CRM_STAGES,
  audienceLabel,
  audiencePeople,
  formatWhen,
  packageColumnNames,
  peopleCounts,
  personalize,
  type CampaignAudience,
  type CampaignRecord,
  type CrmPerson,
  type CrmStage,
} from "@/lib/crm";

export default function CampaignsPage() {
  const module = moduleBySlug("campaigns");
  const { data: crm } = useApi<{ people: CrmPerson[] }>("/api/admin/crm");
  const { data, reload } = useApi<{ items: CampaignRecord[] }>("/api/admin/campaigns");
  const [campaignId, setCampaignId] = useState<string>("new");
  const people = crm?.people ?? [];
  const campaigns = data?.items ?? [];
  const counts = useMemo(() => peopleCounts(people), [people]);
  const packages = useMemo(() => packageColumnNames(people, counts), [people, counts]);
  const selected = campaigns.find((item) => item.id === campaignId) ?? null;

  return (
    <ModuleFrame module={module}>
      <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <Button type="button" className="w-full" onClick={() => setCampaignId("new")}>
            New campaign
          </Button>
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => setCampaignId(campaign.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left ${
                campaignId === campaign.id ? "border-[#0b6e4f] bg-[#f3f9f6]" : "border-[#e6e8ef] bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{campaign.name}</span>
                <Badge tone={campaign.status === "sent" ? "ok" : "muted"}>{campaign.status}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-[#667085]">{audienceLabel(campaign.audience)}</p>
            </button>
          ))}
          {campaigns.length === 0 && <p className="px-1 text-sm text-[#667085]">No campaigns yet.</p>}
        </aside>
        <CampaignForm
          key={campaignId}
          campaign={selected}
          people={people}
          packages={packages}
          onSave={async (input) => {
            try {
              const body = JSON.stringify({ name: input.name, subject: input.subject, body: input.body, audience: input.audience });
              const saved = input.id
                ? await api<CampaignRecord>(`/api/admin/campaigns/${input.id}`, { method: "PATCH", body })
                : await api<CampaignRecord>("/api/admin/campaigns", { method: "POST", body });
              setCampaignId(saved.id);
              reload();
              return null;
            } catch (problem) {
              return (problem as Error).message;
            }
          }}
          onSend={async (input) => {
            try {
              const body = JSON.stringify({ name: input.name, subject: input.subject, body: input.body, audience: input.audience });
              const draft = input.id
                ? await api<CampaignRecord>(`/api/admin/campaigns/${input.id}`, { method: "PATCH", body })
                : await api<CampaignRecord>("/api/admin/campaigns", { method: "POST", body });
              await api(`/api/admin/campaigns/${draft.id}/send`, { method: "POST" });
              setCampaignId(draft.id);
              reload();
              return null;
            } catch (problem) {
              return (problem as Error).message;
            }
          }}
          onDelete={async () => {
            if (!selected) return;
            await api(`/api/admin/campaigns/${selected.id}`, { method: "DELETE" });
            setCampaignId("new");
            reload();
          }}
        />
      </div>
    </ModuleFrame>
  );
}

function CampaignForm({
  campaign,
  people,
  packages,
  onSave,
  onSend,
  onDelete,
}: {
  campaign: CampaignRecord | null;
  people: CrmPerson[];
  packages: string[];
  onSave: (input: { id: string | null; name: string; subject: string; body: string; audience: CampaignAudience }) => Promise<string | null>;
  onSend: (input: { id: string | null; name: string; subject: string; body: string; audience: CampaignAudience }) => Promise<string | null>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "Hello {{name}}");
  const [body, setBody] = useState(campaign?.body ?? "Hi {{name}},\n\nYou are on the {{plan}} package.\n");
  const [audience, setAudience] = useState<CampaignAudience>(campaign?.audience ?? { kind: "all" });
  const [error, setError] = useState<string | null>(null);
  const locked = campaign?.status === "sent";
  const recipients = audiencePeople(people, audience);
  const previewPerson = recipients[0] ?? people.find((person) => person.accountStatus === "active") ?? people[0];
  const sentPeople = campaign?.recipientIds.map((id) => people.find((person) => person.id === id)?.name ?? "Removed account") ?? [];

  function payload() {
    return { id: campaign?.id ?? null, name, subject, body, audience };
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(await onSave(payload()));
      }}
      className="space-y-4 rounded-2xl border border-[#e6e8ef] bg-white p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{campaign ? campaign.name : "New campaign"}</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Disabled accounts are left out. A sent campaign cannot be sent again.
          </p>
        </div>
        {campaign && <Badge tone={campaign.status === "sent" ? "ok" : "muted"}>{campaign.status}</Badge>}
      </div>

      <Field label="Name">
        <TextInput value={name} disabled={locked} onChange={(event) => setName(event.target.value)} placeholder="October check-in" />
      </Field>
      <Field label="Subject">
        <TextInput value={subject} disabled={locked} onChange={(event) => setSubject(event.target.value)} />
      </Field>
      <Field label="Message">
        <textarea
          value={body}
          disabled={locked}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          className="w-full rounded-lg border border-[#e6e8ef] px-3 py-2 text-sm outline-none ring-[#0b6e4f] focus:ring-2 disabled:bg-[#f8f9fc]"
        />
      </Field>
      <p className="text-xs text-[#667085]">Use {"{{name}}"} and {"{{plan}}"} so each email is personal.</p>

      <fieldset disabled={locked} className="space-y-3">
        <legend className="text-sm font-semibold text-[#344054]">Who receives it</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All active users"],
              ["packages", "By package"],
              ["stages", "By status"],
              ["users", "Specific people"],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => setAudience(emptyAudience(kind))}
              className={`rounded-full border px-3 py-1.5 text-sm ${audience.kind === kind ? "border-[#0b6e4f] bg-[#e7f3ee] text-[#0b6e4f]" : "border-[#e6e8ef]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {audience.kind === "packages" && (
          <CheckGrid
            options={packages.map((item) => ({ id: item, label: item }))}
            selected={audience.packages}
            onChange={(packages) => setAudience({ kind: "packages", packages })}
          />
        )}
        {audience.kind === "stages" && (
          <CheckGrid
            options={CRM_STAGES.filter((item) => item.id !== "disabled").map((item) => ({ id: item.id, label: item.label }))}
            selected={audience.stages}
            onChange={(stages) => setAudience({ kind: "stages", stages: stages as CrmStage[] })}
          />
        )}
        {audience.kind === "users" && (
          <CheckGrid
            options={people.filter((person) => person.accountStatus === "active").map((person) => ({ id: person.id, label: `${person.name} · ${person.packageName}` }))}
            selected={audience.userIds}
            onChange={(userIds) => setAudience({ kind: "users", userIds })}
          />
        )}
      </fieldset>

      <div className="rounded-xl bg-[#f8f9fc] px-3 py-3 text-sm">
        {locked ? (
          <>
            <p className="font-medium">Sent {campaign?.sentAt ? formatWhen(campaign.sentAt) : ""} to {sentPeople.length}</p>
            <p className="mt-1 text-[#667085]">{sentPeople.join(", ") || "No recipients stored."}</p>
          </>
        ) : (
          <>
            <p className="font-medium">
              {recipients.length} {recipients.length === 1 ? "person" : "people"} will receive this
            </p>
            <p className="mt-1 text-[#667085]">
              {recipients.length === 0 ? "Choose an audience with at least one active person." : recipients.map((person) => person.name).join(", ")}
            </p>
            {previewPerson && recipients.length > 0 && (
              <p className="mt-2 text-[#344054]">Preview subject: {personalize(subject, previewPerson)}</p>
            )}
          </>
        )}
      </div>
      {error && <p className="text-sm text-[#d92d20]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {!locked && (
          <>
            <Button type="submit" tone="ghost">
              Save draft
            </Button>
            <Button
              type="button"
              onClick={async () => setError(await onSend(payload()))}
            >
              Send now
            </Button>
          </>
        )}
        {campaign && (
          <Button type="button" tone="danger" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
      <p className="text-xs text-[#667085]">Packages on file: {CRM_PACKAGES.map((item) => item.name).join(", ")}. Extra packages appear when someone is on them or a purchase exists.</p>
    </form>
  );
}

function emptyAudience(kind: CampaignAudience["kind"]): CampaignAudience {
  if (kind === "all") return { kind: "all" };
  if (kind === "packages") return { kind: "packages", packages: [] };
  if (kind === "stages") return { kind: "stages", stages: [] };
  return { kind: "users", userIds: [] };
}

function CheckGrid({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <li key={option.id}>
            <label className="flex items-center gap-2 rounded-lg border border-[#e6e8ef] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((id) => id !== option.id) : [...selected, option.id])}
              />
              <span>{option.label}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
