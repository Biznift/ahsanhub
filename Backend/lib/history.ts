import { packageByName, type MailRecord, type CampaignRecord } from "@/lib/crm";
import { formatMoney, formatUsd, type AffiliatePayment, type LedgerEvent, type Withdrawal } from "@/lib/referrals";

export type HistoryArea = "account" | "orders" | "coupons" | "email" | "brand" | "support" | "api" | "team";

const FEATURE_AREAS: Record<string, HistoryArea[]> = {
  Account: ["account"],
  Dashboard: ["account"],
  Orders: ["orders"],
  Coupons: ["coupons"],
  "Email support": ["email"],
  "Brand assets": ["brand"],
  "Landing page": ["brand"],
  "Media library": ["brand"],
  "Priority support": ["support"],
  "Monthly features": ["orders", "coupons", "email"],
  "API access": ["api"],
  "Team seats": ["team"],
  "White label": ["brand"],
};

const AREA_LABEL: Record<HistoryArea, string> = {
  account: "Account",
  orders: "Orders",
  coupons: "Coupons",
  email: "Email",
  brand: "Brand and media",
  support: "Priority support",
  api: "API",
  team: "Team",
};

const AREA_EMPTY: Record<HistoryArea, string> = {
  account: "No account activity yet.",
  orders: "No orders on this package yet.",
  coupons: "No coupon use on this package yet.",
  email: "No emails on this package yet.",
  brand: "No brand, media, or white-label activity yet.",
  support: "No priority support notes yet.",
  api: "No API activity yet.",
  team: "No team changes yet.",
};

export type HistoryItem = {
  id: string;
  at: string | null;
  sort: number;
  title: string;
  detail: string;
};

export type UserHistory = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: string;
  packageName: string;
  features: string[];
  purchases: HistoryItem[];
  activity: HistoryItem[];
  hidden: string[];
};

type HistoryUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type HistoryProfile = {
  id: string;
  plan: string | null;
  referral_code: string;
  referral_balance_usd: number;
  referred_by: string | null;
  completed_payments: number;
};

type HistoryOrder = {
  id: string;
  number: string;
  customer: string;
  item: string;
  amount: number;
  currency: "USD" | "BDT";
  status: string;
  createdAt: string;
  at: string;
};

function saleKey(value: string) {
  return value.trim().toLowerCase().replace(/^inv-/, "");
}

function stamp(iso: string | null | undefined) {
  if (!iso) return 0;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
}

function areasFor(features: string[]) {
  const areas = new Set<HistoryArea>(["account"]);
  for (const feature of features) {
    for (const area of FEATURE_AREAS[feature] ?? []) areas.add(area);
  }
  return areas;
}

function item(id: string, title: string, detail: string, at: string | null, sort: number): HistoryItem {
  return { id, title, detail, at, sort };
}

function covered(area: HistoryArea, rows: HistoryItem[]) {
  if (area === "account") return rows.some((row) => row.id === "account-status");
  if (area === "orders") return rows.some((row) => row.id.startsWith("order-activity"));
  if (area === "coupons") return rows.some((row) => row.id.startsWith("coupon-"));
  if (area === "email") return rows.some((row) => row.id.startsWith("mail-"));
  if (area === "brand") return rows.some((row) => row.id.startsWith("brand-"));
  return false;
}

export function buildUserHistory(input: {
  user: HistoryUser | undefined;
  profile: HistoryProfile | undefined;
  orders: HistoryOrder[];
  payments: AffiliatePayment[];
  mails: MailRecord[];
  campaigns: CampaignRecord[];
  ledger: LedgerEvent[];
  withdrawals: Withdrawal[];
  activity: { id: string; text: string; at: string }[];
  people: { id: string; name: string }[];
}): UserHistory | null {
  const user = input.user;
  if (!user) return null;
  const pack = packageByName(input.profile?.plan);
  const unlocked = areasFor(pack.features);
  const name = user.name.toLowerCase();
  const purchases: HistoryItem[] = [];
  const activity: HistoryItem[] = [];
  const seenSales = new Set<string>();

  for (const payment of input.payments) {
    if (payment.buyer_id !== user.id) continue;
    const key = `${saleKey(payment.invoice_number)}:${payment.item.toLowerCase()}`;
    seenSales.add(key);
    purchases.push(
      item(
        `pay-${payment.invoice_number}`,
        `${payment.item} · ${payment.status}`,
        `${formatMoney(payment.paid_amount, payment.currency)} · ${payment.invoice_number}${payment.coupon_code ? ` · coupon ${payment.coupon_code}` : ""}`,
        payment.created_at,
        stamp(payment.created_at),
      ),
    );
    if (unlocked.has("coupons") && payment.coupon_code) {
      activity.push(
        item(
          `coupon-${payment.invoice_number}`,
          `Coupon ${payment.coupon_code}`,
          `Used on ${payment.item}`,
          payment.created_at,
          stamp(payment.created_at),
        ),
      );
    }
    if (unlocked.has("brand") && /brand|landing|media/i.test(payment.item)) {
      activity.push(
        item(
          `brand-${payment.invoice_number}`,
          payment.item,
          `${payment.status} purchase on this package`,
          payment.created_at,
          stamp(payment.created_at),
        ),
      );
    }
  }

  for (const order of input.orders) {
    if (order.customer.toLowerCase() !== name) continue;
    const key = `${saleKey(order.number)}:${order.item.toLowerCase()}`;
    if (!seenSales.has(key)) {
      purchases.push(
        item(
          `order-${order.id}`,
          `${order.item} · ${order.status}`,
          `${formatMoney(order.amount, order.currency)} · ${order.number}`,
          order.at,
          stamp(order.at),
        ),
      );
    }
    if (unlocked.has("orders")) {
      activity.push(
        item(
          `order-activity-${order.id}`,
          `Order ${order.number} is ${order.status}`,
          order.item,
          order.at,
          stamp(order.at),
        ),
      );
    }
    if (unlocked.has("brand") && /brand|landing|media/i.test(order.item) && !activity.some((row) => row.id === `brand-${order.number}`)) {
      activity.push(
        item(`brand-order-${order.id}`, order.item, `Order ${order.number} is ${order.status}`, order.at, stamp(order.at)),
      );
    }
  }

  if (unlocked.has("email")) {
    for (const mail of input.mails) {
      if (mail.userId !== user.id) continue;
      const campaign = mail.campaignId ? input.campaigns.find((row) => row.id === mail.campaignId) : null;
      activity.push(
        item(
          `mail-${mail.id}`,
          mail.subject,
          campaign ? `Campaign · ${campaign.name}` : "Direct email",
          mail.sentAt,
          stamp(mail.sentAt),
        ),
      );
    }
  }

  if (unlocked.has("account")) {
    activity.push(
      item(
        "account-status",
        `${user.name} is ${user.status}`,
        `${user.role} · ${user.email}`,
        null,
        Number.MAX_SAFE_INTEGER,
      ),
    );
    if (input.profile) {
      const referrer = input.people.find((person) => person.id === input.profile?.referred_by);
      activity.push(
        item(
          "referral-profile",
          `Referral code ${input.profile.referral_code}`,
          `${formatUsd(input.profile.referral_balance_usd)} balance${referrer ? ` · invited by ${referrer.name}` : ""}`,
          null,
          Number.MAX_SAFE_INTEGER - 1,
        ),
      );
    }
    for (const event of input.ledger) {
      const involved = event.referrer_user_id === user.id || event.buyer_id === user.id;
      if (!involved) continue;
      const asReferrer = event.referrer_user_id === user.id;
      const otherId = asReferrer ? event.buyer_id : event.referrer_user_id;
      const other = input.people.find((person) => person.id === otherId)?.name ?? "someone";
      const credit = event.kind === "referral_commission_credit";
      const title = asReferrer
        ? credit
          ? `Commission from ${other}`
          : `Commission reversed for ${other}`
        : credit
          ? `${other} earned commission on this purchase`
          : `Commission on this purchase was reversed`;
      activity.push(
        item(
          `ledger-${event.id}`,
          title,
          `${formatUsd(event.commission_amount_usd)} · ${event.invoice_number}`,
          event.created_at,
          stamp(event.created_at),
        ),
      );
    }
    for (const withdrawal of input.withdrawals) {
      if (withdrawal.user_id !== user.id) continue;
      activity.push(
        item(
          `wd-${withdrawal.id}`,
          `Withdrawal ${withdrawal.status}`,
          `${formatUsd(withdrawal.amount_usd)} · ${withdrawal.payment_method}`,
          withdrawal.created_at,
          stamp(withdrawal.created_at),
        ),
      );
    }
    for (const note of input.activity) {
      if (!note.text.toLowerCase().includes(name)) continue;
      activity.push(item(`note-${note.id}`, note.text, "Admin activity", note.at, Number.MAX_SAFE_INTEGER - 2));
    }
  }

  for (const area of unlocked) {
    if (covered(area, activity)) continue;
    activity.push(item(`empty-${area}`, AREA_EMPTY[area], AREA_LABEL[area], null, -1));
  }

  purchases.sort((a, b) => b.sort - a.sort);
  activity.sort((a, b) => b.sort - a.sort);

  const hidden = (Object.keys(AREA_LABEL) as HistoryArea[])
    .filter((area) => !unlocked.has(area))
    .map((area) => AREA_LABEL[area]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.status,
    packageName: pack.name,
    features: pack.features,
    purchases,
    activity,
    hidden,
  };
}
