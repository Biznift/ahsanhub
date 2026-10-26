"use client";

import { useMemo, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { HistoryButton } from "@/components/user-history";
import { Badge, Button, Field, SelectInput, TextInput } from "@/components/ui";
import { api, useApi } from "@/components/admin-kit";
import {
  CRM_PACKAGES,
  CRM_STAGES,
  downloadText,
  featureOptions,
  filterPeople,
  formatWhen,
  packageByName,
  packageColumnNames,
  peopleCounts,
  peopleToCsv,
  personalize,
  stageLabel,
  type CrmPerson,
  type CrmStage,
  type MailRecord,
} from "@/lib/crm";

const STAGE_TONE = {
  free: "muted",
  pending: "warn",
  paid: "ok",
  disabled: "danger",
} as const;

export default function CrmPage() {
  const module = moduleBySlug("crm");
  const { notify } = useStore();
  const { data, reload } = useApi<{ people: CrmPerson[]; mails: MailRecord[] }>("/api/admin/crm");
  const people = data?.people ?? [];
  const mails = data?.mails ?? [];
  const [query, setQuery] = useState("");
  const [packageName, setPackageName] = useState("all");
  const [stage, setStage] = useState<"all" | CrmStage>("all");
  const [feature, setFeature] = useState("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [board, setBoard] = useState<"package" | "status">("package");
  const [selected, setSelected] = useState<string[]>([]);
  const [composer, setComposer] = useState<CrmPerson[] | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const counts = useMemo(() => peopleCounts(people), [people]);
  const columns = useMemo(() => packageColumnNames(people, counts), [people, counts]);
  const features = useMemo(() => featureOptions(people), [people]);
  const shown = useMemo(
    () => filterPeople(people, { query, packageName, stage, feature }),
    [people, query, packageName, stage, feature],
  );
  const shownIds = shown.map((person) => person.id);
  const allSelected = shown.length > 0 && shown.every((person) => selected.includes(person.id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleShown() {
    setSelected((current) => {
      if (allSelected) return current.filter((id) => !shownIds.includes(id));
      return [...new Set([...current, ...shownIds])];
    });
  }

  function openComposer(list: CrmPerson[]) {
    if (list.length === 0) return;
    setComposer(list);
  }

  const paidPeople = people.filter((person) => person.stage === "paid").length;
  const freePeople = people.filter((person) => person.stage === "free").length;

  return (
    <ModuleFrame module={module}>
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <Stat label="People" value={String(people.length)} />
          <Stat label="No listing" value={String(freePeople)} />
          <Stat label="Live" value={String(paidPeople)} />
          <Stat label="Published" value={String(people.reduce((sum, person) => sum + person.payments, 0))} />
        </div>
        <p className="text-sm text-[#667085]">
          People are the real accounts. Status follows their listings: no listing, in review, or live. Dragging changes the label only, not their admin role. The count is how many listings are published.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" aria-label="Search people" />
          </div>
          <FilterSelect label="Package" value={packageName} onChange={setPackageName}>
            <option value="all">All packages</option>
            {columns.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Status" value={stage} onChange={(value) => setStage(value as "all" | CrmStage)}>
            <option value="all">All statuses</option>
            {CRM_STAGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Feature" value={feature} onChange={setFeature}>
            <option value="all">All features</option>
            {features.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#e6e8ef] bg-white p-0.5">
            <ViewButton active={view === "list"} onClick={() => setView("list")}>
              List
            </ViewButton>
            <ViewButton active={view === "board"} onClick={() => setView("board")}>
              Kanban
            </ViewButton>
          </div>
          {view === "board" && (
            <div className="flex rounded-lg border border-[#e6e8ef] bg-white p-0.5">
              <ViewButton active={board === "package"} onClick={() => setBoard("package")}>
                By package
              </ViewButton>
              <ViewButton active={board === "status"} onClick={() => setBoard("status")}>
                By status
              </ViewButton>
            </div>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              tone="ghost"
              disabled={shown.length === 0}
              onClick={() => {
                downloadText("crm-users.csv", peopleToCsv(shown), "text/csv;charset=utf-8");
                notify(`Exported ${shown.length} ${shown.length === 1 ? "person" : "people"}`);
              }}
            >
              Export {shown.length}
            </Button>
            <Button
              type="button"
              tone="ghost"
              disabled={selected.length === 0}
              onClick={() => openComposer(people.filter((person) => selected.includes(person.id)))}
            >
              Message selected{selected.length > 0 ? ` (${selected.length})` : ""}
            </Button>
            <Button type="button" disabled={shown.length === 0} onClick={() => openComposer(shown)}>
              Message filter
            </Button>
          </div>
        </div>
        <p className="text-sm text-[#667085]">
          Showing {shown.length} of {people.length}
          {packageName !== "all" ? ` · ${packageName}` : ""}
          {stage !== "all" ? ` · ${stageLabel(stage)}` : ""}
          {feature !== "all" ? ` · has ${feature}` : ""}
        </p>

        {view === "list" ? (
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleShown} aria-label="Select everyone in this filter" />
                  </th>
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-4 py-3 font-medium">Package</th>
                  <th className="px-4 py-3 font-medium">Features</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {shown.map((person) => (
                  <tr key={person.id} className="border-t border-[var(--line)] align-top">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(person.id)}
                        onChange={() => toggle(person.id)}
                        aria-label={`Select ${person.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{person.name}</span>
                        <HistoryButton userId={person.id} name={person.name} />
                      </div>
                      <div className="text-xs text-[#667085]">{person.email}</div>
                      <div className="mt-1 text-xs text-[#667085]">
                        {person.payments} paid
                        {person.pendingItem ? ` · waiting on ${person.pendingItem}` : ""}
                        {person.lastMailAt ? ` · emailed ${formatWhen(person.lastMailAt)}` : person.stage === "paid" ? " · no email yet" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SelectInput
                        value={person.packageName}
                        onChange={async (event) => {
                          await api(`/api/admin/users/${person.id}/plan`, { method: "PATCH", body: JSON.stringify({ plan: event.target.value }) });
                          reload();
                        }}
                        aria-label={`Package for ${person.name}`}
                      >
                        {packageChoices(person.packageName).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </SelectInput>
                    </td>
                    <td className="px-4 py-3">
                      <FeatureLine features={person.features} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STAGE_TONE[person.stage]}>{stageLabel(person.stage)}</Badge>
                      {person.role === "admin" && <span className="ml-1"><Badge tone="info">admin</Badge></span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" tone="ghost" onClick={() => openComposer([person])}>
                        Message
                      </Button>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#667085]">
                      No one matches this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(board === "package" ? columns : CRM_STAGES.map((item) => item.id)).map((key) => {
              const cards =
                board === "package"
                  ? shown.filter((person) => person.packageName === key)
                  : shown.filter((person) => person.stage === key);
              const pack = board === "package" ? packageByName(key) : null;
              const commerce = board === "package" ? counts.get(key) : undefined;
              const stageMeta = board === "status" ? CRM_STAGES.find((item) => item.id === key) : null;
              const title = board === "package" ? key : stageMeta?.label ?? key;
              return (
                <section
                  key={key}
                  onDragOver={
                    board === "package"
                      ? (event) => {
                          event.preventDefault();
                          setOverColumn(key);
                        }
                      : undefined
                  }
                  onDragLeave={board === "package" ? () => setOverColumn((current) => (current === key ? null : current)) : undefined}
                  onDrop={
                    board === "package"
                      ? (event) => {
                          event.preventDefault();
                          const id = event.dataTransfer.getData("text/plain");
                          setOverColumn(null);
                          if (!id) return;
                          const person = people.find((item) => item.id === id);
                          if (!person || person.packageName === key) return;
                          void api(`/api/admin/users/${id}/plan`, { method: "PATCH", body: JSON.stringify({ plan: key }) }).then(() => reload());
                        }
                      : undefined
                  }
                  className={`w-72 shrink-0 rounded-2xl border bg-[#f8f9fc] ${overColumn === key ? "border-[#0b6e4f]" : "border-[#e6e8ef]"}`}
                >
                  <header className="border-b border-[#e6e8ef] px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-[#1d2939]">{title}</h2>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#344054]">{cards.length}</span>
                    </div>
                    {pack && (
                      <p className="mt-1 text-xs text-[#667085]">
                        {pack.priceLabel}
                        {commerce ? ` · ${commerce.purchases} purchased` : " · 0 purchased"}
                        {commerce?.pending ? ` · ${commerce.pending} waiting` : ""}
                      </p>
                    )}
                    {stageMeta && <p className="mt-1 text-xs text-[#667085]">{stageMeta.hint}</p>}
                    {pack && <FeatureLine features={pack.features} />}
                  </header>
                  <div className="space-y-2 p-2">
                    {cards.map((person) => (
                      <article key={person.id} className="rounded-xl border border-[#e6e8ef] bg-white p-3">
                        <div className="flex items-start gap-2">
                          {board === "package" && (
                            <button
                              type="button"
                              draggable
                              aria-label={`Drag ${person.name}`}
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", person.id);
                                event.dataTransfer.effectAllowed = "move";
                              }}
                              className="mt-0.5 cursor-grab text-[#98a2b3] active:cursor-grabbing"
                            >
                              <GripVertical size={16} />
                            </button>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-1">
                                  <span className="truncate font-medium">{person.name}</span>
                                  <HistoryButton userId={person.id} name={person.name} />
                                </div>
                                <div className="truncate text-xs text-[#667085]">{person.email}</div>
                              </div>
                              <input
                                type="checkbox"
                                checked={selected.includes(person.id)}
                                onChange={() => toggle(person.id)}
                                aria-label={`Select ${person.name}`}
                              />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge tone={STAGE_TONE[person.stage]}>{stageLabel(person.stage)}</Badge>
                              {person.pendingItem && person.packageName !== person.pendingItem && (
                                <Badge tone="warn">Waiting · {person.pendingItem}</Badge>
                              )}
                            </div>
                            <p className="mt-2 text-xs text-[#667085]">
                              {person.payments} paid
                              {person.lastMailAt ? ` · emailed ${formatWhen(person.lastMailAt)}` : person.stage === "paid" ? " · no email yet" : ""}
                            </p>
                            <button type="button" onClick={() => openComposer([person])} className="mt-2 text-sm font-medium text-[#0b6e4f]">
                              Message
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                    {cards.length === 0 && <p className="px-2 py-6 text-center text-xs text-[#98a2b3]">No one in this filter.</p>}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {mails.length > 0 && (
          <section className="rounded-2xl border border-[#e6e8ef] bg-white p-4">
            <h2 className="font-semibold">Recent emails</h2>
            <ul className="mt-3 divide-y divide-[#eef0f4]">
              {mails.slice(0, 6).map((mail) => {
                const person = people.find((item) => item.id === mail.userId);
                return (
                  <li key={mail.id} className="py-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{person?.name ?? "Removed account"}</span>
                      <span className="text-xs text-[#667085]">{formatWhen(mail.sentAt)}</span>
                    </div>
                    <p className="text-[#344054]">{mail.subject}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
      {composer && (
        <Composer
          people={composer}
          onClose={() => setComposer(null)}
          onSend={async (subject, body) => {
            try {
              await api("/api/admin/crm/messages", {
                method: "POST",
                body: JSON.stringify({ userIds: composer.map((person) => person.id), subject, body }),
              });
              setComposer(null);
              notify("Email sent");
              reload();
              return null;
            } catch (problem) {
              return (problem as Error).message;
            }
          }}
        />
      )}
    </ModuleFrame>
  );
}

function packageChoices(current: string) {
  const names = CRM_PACKAGES.map((item) => item.name);
  if (!names.includes(current)) names.push(current);
  return names;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e6e8ef] bg-white px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-[#667085]">{label}</div>
      <div className="text-xl font-semibold text-[#1d2939]">{value}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-[#344054]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block rounded-lg border border-[#e6e8ef] bg-white px-2 py-2 text-sm font-normal"
      >
        {children}
      </select>
    </label>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-[#e7f3ee] text-[#0b6e4f]" : "text-[#344054]"}`}
    >
      {children}
    </button>
  );
}

function FeatureLine({ features }: { features: string[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {features.map((feature) => (
        <span key={feature} className="rounded-full bg-[#e7f3ee] px-2 py-0.5 text-[11px] font-medium text-[#0b6e4f]">
          {feature}
        </span>
      ))}
    </div>
  );
}

function Composer({
  people,
  onClose,
  onSend,
}: {
  people: CrmPerson[];
  onClose: () => void;
  onSend: (subject: string, body: string) => Promise<string | null>;
}) {
  const [subject, setSubject] = useState("Hello {{name}}");
  const [body, setBody] = useState("Hi {{name}},\n\nYou are on the {{plan}} package.\n");
  const [error, setError] = useState<string | null>(null);
  const preview = personalize(subject, people[0]);
  const disabled = people.some((person) => person.accountStatus === "disabled");

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#101828]/40 p-4">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError(await onSend(subject, body));
        }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">Email {people.length === 1 ? people[0].name : `${people.length} people`}</h2>
        <p className="mt-1 text-sm text-[#667085]">{"{{name}} and {{plan}} are filled in for each person. Email is sent through the saved email settings."}</p>
        {disabled && <p className="mt-2 text-sm text-[#b54708]">This includes a disabled account.</p>}
        <div className="mt-3 flex flex-wrap gap-1">
          {people.slice(0, 8).map((person) => (
            <span key={person.id} className="rounded-full bg-[#f5f6fa] px-2 py-0.5 text-xs">
              {person.name}
            </span>
          ))}
          {people.length > 8 && <span className="text-xs text-[#667085]">+{people.length - 8}</span>}
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Subject">
            <TextInput value={subject} onChange={(event) => setSubject(event.target.value)} />
          </Field>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              className="w-full rounded-lg border border-[#e6e8ef] px-3 py-2 text-sm outline-none ring-[#0b6e4f] focus:ring-2"
            />
          </Field>
          <p className="rounded-lg bg-[#f8f9fc] px-3 py-2 text-sm text-[#344054]">Preview: {preview}</p>
          {error && <p className="text-sm text-[#d92d20]">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Send</Button>
        </div>
      </form>
    </div>
  );
}
