export type CrmRole = "admin" | "owner" | "customer";
export type CrmAccountStatus = "active" | "disabled";
export type CrmOrderStatus = "pending" | "paid" | "cancelled";
export type CrmStage = "free" | "pending" | "paid" | "disabled";

export type CrmPackage = {
  id: string;
  name: string;
  paid: boolean;
  priceLabel: string;
  features: string[];
};

export const CRM_PACKAGES: CrmPackage[] = [
  {
    id: "owner",
    name: "Owner",
    paid: false,
    priceLabel: "Directory",
    features: ["Submit listings", "Edit own listings"],
  },
  {
    id: "live",
    name: "Published maker",
    paid: true,
    priceLabel: "Live",
    features: ["Public listing", "Reviews", "Upvotes"],
  },
  {
    id: "admin",
    name: "Admin",
    paid: true,
    priceLabel: "Staff",
    features: ["Moderation", "Settings", "Backups"],
  },
];

export const CRM_STAGES: { id: CrmStage; label: string; hint: string }[] = [
  { id: "free", label: "No listing", hint: "Account with nothing in review or live" },
  { id: "pending", label: "In review", hint: "A listing is waiting for approval" },
  { id: "paid", label: "Live", hint: "At least one listing is published" },
  { id: "disabled", label: "Disabled", hint: "Account is turned off" },
];

export type CrmPerson = {
  id: string;
  name: string;
  email: string;
  role: CrmRole;
  accountStatus: CrmAccountStatus;
  plan: string | null;
  packageName: string;
  paid: boolean;
  features: string[];
  stage: CrmStage;
  payments: number;
  pendingItem: string | null;
  lastMailAt: string | null;
};

export type CrmFilter = {
  query: string;
  packageName: string;
  stage: "all" | CrmStage;
  feature: string;
};

export type CampaignAudience =
  | { kind: "all" }
  | { kind: "packages"; packages: string[] }
  | { kind: "stages"; stages: CrmStage[] }
  | { kind: "users"; userIds: string[] };

export type MailRecord = {
  id: string;
  userId: string;
  campaignId: string | null;
  subject: string;
  body: string;
  sentAt: string;
};

export type CampaignRecord = {
  id: string;
  name: string;
  subject: string;
  body: string;
  audience: CampaignAudience;
  status: "draft" | "sent";
  createdAt: string;
  sentAt: string | null;
  recipientIds: string[];
};

type CrmUser = {
  id: string;
  name: string;
  email: string;
  role: CrmRole;
  status: CrmAccountStatus;
};

type CrmProfile = {
  id: string;
  plan: string | null;
  completed_payments: number;
};

type CrmOrder = {
  number: string;
  customer: string;
  item: string;
  status: CrmOrderStatus;
};

type CrmPayment = {
  invoice_number: string;
  buyer_id: string;
  item: string;
  status: "completed" | "failed" | "refunded";
};

export function packageByName(name: string | null | undefined): CrmPackage {
  if (!name || name.toLowerCase() === "free") return CRM_PACKAGES[0];
  const found = CRM_PACKAGES.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    paid: true,
    priceLabel: "Custom",
    features: ["Custom package"],
  };
}

export function stageLabel(stage: CrmStage) {
  return CRM_STAGES.find((item) => item.id === stage)?.label ?? stage;
}

export function buildPeople(input: {
  users: CrmUser[];
  profiles: CrmProfile[];
  orders: CrmOrder[];
  mails: MailRecord[];
}): CrmPerson[] {
  return input.users.map((user) => {
    const profile = input.profiles.find((item) => item.id === user.id);
    const pack = packageByName(profile?.plan);
    const pending = input.orders.find((order) => order.customer === user.name && order.status === "pending");
    let stage: CrmStage = "free";
    if (user.status === "disabled") stage = "disabled";
    else if (profile?.plan && pack.paid) stage = "paid";
    else if (pending) stage = "pending";
    const lastMail = input.mails.find((mail) => mail.userId === user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.status,
      plan: profile?.plan ?? null,
      packageName: pack.name,
      paid: pack.paid,
      features: pack.features,
      stage,
      payments: profile?.completed_payments ?? 0,
      pendingItem: pending?.item ?? null,
      lastMailAt: lastMail?.sentAt ?? null,
    };
  });
}

function saleKey(value: string) {
  return value.trim().toLowerCase().replace(/^inv-/, "");
}

export function commerceCounts(orders: CrmOrder[], payments: CrmPayment[]) {
  const map = new Map<string, { purchases: number; pending: number; seen: Set<string> }>();
  function bucket(item: string) {
    const existing = map.get(item);
    if (existing) return existing;
    const created = { purchases: 0, pending: 0, seen: new Set<string>() };
    map.set(item, created);
    return created;
  }
  for (const payment of payments) {
    if (payment.status !== "completed") continue;
    const row = bucket(payment.item);
    const key = saleKey(payment.invoice_number);
    if (row.seen.has(key)) continue;
    row.seen.add(key);
    row.purchases += 1;
  }
  for (const order of orders) {
    if (order.status === "paid") {
      const row = bucket(order.item);
      const key = saleKey(order.number);
      if (row.seen.has(key)) continue;
      row.seen.add(key);
      row.purchases += 1;
    } else if (order.status === "pending") {
      bucket(order.item).pending += 1;
    }
  }
  return map;
}

export function peopleCounts(people: CrmPerson[]) {
  const map = new Map<string, { purchases: number; pending: number }>();
  for (const person of people) {
    const row = map.get(person.packageName) ?? { purchases: 0, pending: 0 };
    row.purchases += person.payments;
    if (person.pendingItem) row.pending += 1;
    map.set(person.packageName, row);
  }
  return map;
}

export function packageColumnNames(people: CrmPerson[], counts: Map<string, { purchases: number; pending: number }>) {
  const names = CRM_PACKAGES.map((item) => item.name);
  for (const person of people) {
    if (!names.includes(person.packageName)) names.push(person.packageName);
  }
  const extras = [...counts.keys()].filter((name) => !names.includes(name)).sort((a, b) => a.localeCompare(b));
  return [...names, ...extras];
}

export function filterPeople(people: CrmPerson[], filter: CrmFilter) {
  const query = filter.query.trim().toLowerCase();
  return people.filter((person) => {
    if (query && !`${person.name} ${person.email}`.toLowerCase().includes(query)) return false;
    if (filter.packageName !== "all" && person.packageName !== filter.packageName) return false;
    if (filter.stage !== "all" && person.stage !== filter.stage) return false;
    if (filter.feature !== "all" && !person.features.includes(filter.feature)) return false;
    return true;
  });
}

export function featureOptions(people: CrmPerson[]) {
  const names = new Set<string>();
  for (const pack of CRM_PACKAGES) {
    for (const feature of pack.features) names.add(feature);
  }
  for (const person of people) {
    for (const feature of person.features) names.add(feature);
  }
  return [...names];
}

export function audiencePeople(people: CrmPerson[], audience: CampaignAudience) {
  const active = people.filter((person) => person.accountStatus === "active");
  if (audience.kind === "all") return active;
  if (audience.kind === "packages") {
    return active.filter((person) => audience.packages.includes(person.packageName));
  }
  if (audience.kind === "stages") {
    return active.filter((person) => audience.stages.includes(person.stage));
  }
  const ids = new Set(audience.userIds);
  return active.filter((person) => ids.has(person.id));
}

export function audienceLabel(audience: CampaignAudience) {
  if (audience.kind === "all") return "All active users";
  if (audience.kind === "packages") {
    return audience.packages.length ? audience.packages.join(", ") : "No package selected";
  }
  if (audience.kind === "stages") {
    return audience.stages.length ? audience.stages.map(stageLabel).join(", ") : "No status selected";
  }
  return audience.userIds.length === 1 ? "1 specific person" : `${audience.userIds.length} specific people`;
}

export function personalize(template: string, person: { name: string; packageName: string }) {
  return template.replaceAll("{{name}}", person.name).replaceAll("{{plan}}", person.packageName);
}

export function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function peopleToCsv(people: CrmPerson[]) {
  const header = ["Name", "Email", "Role", "Account", "Package", "Status", "Features", "Payments", "Pending order", "Last email"];
  const lines = people.map((person) =>
    [
      person.name,
      person.email,
      person.role,
      person.accountStatus,
      person.packageName,
      stageLabel(person.stage),
      person.features.join("; "),
      person.payments,
      person.pendingItem ?? "",
      person.lastMailAt ? formatWhen(person.lastMailAt) : "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
