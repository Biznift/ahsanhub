"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  audiencePeople,
  buildPeople,
  personalize,
  type CampaignAudience,
  type CampaignRecord,
  type MailRecord,
} from "@/lib/crm";
import { moduleBySlug, navModules, isPinnedNav } from "@/lib/catalog";
import {
  completeCheckout,
  createAffiliateUser,
  creditPayment,
  decideWithdrawal as decideWithdrawalRequest,
  demoAffiliates,
  refundPayment,
  removeAffiliateUser,
  renameReferralCode,
  requestWithdrawal,
  updateReferralSettings,
  updateUserReferralRates,
  type AffiliateDb,
  type Currency,
  type PayoutMethod,
  type ReferralSettings,
} from "@/lib/referrals";

const MENU_KEY = "sak-menu";

function persistMenu(slugs: string[]) {
  fetch("/api/admin/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hiddenSlugs: slugs }),
  }).catch(() => undefined);
}

export type Role = "admin" | "customer";
export type AccountStatus = "active" | "disabled";
export type OrderStatus = "pending" | "paid" | "cancelled";
export type CouponType = "percent" | "fixed";
export type ContentKind = "page" | "post";
export type ContentStatus = "draft" | "published";

export type Session = { name: string; email: string };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
};

export type OrderRow = {
  id: string;
  number: string;
  customer: string;
  item: string;
  amount: number;
  currency: Currency;
  status: OrderStatus;
  createdAt: string;
  at: string;
};

export type CouponRow = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  maxUses: number | null;
  used: number;
  active: boolean;
};

export type ContentRow = {
  id: string;
  title: string;
  kind: ContentKind;
  status: ContentStatus;
  updatedAt: string;
};

export type MediaRow = {
  id: string;
  name: string;
  kind: "image" | "file";
  size: string;
};

export type BackupSnapshot = {
  users: UserRow[];
  orders: OrderRow[];
  coupons: CouponRow[];
  content: ContentRow[];
  media: MediaRow[];
  gateway: Gateway;
  storage: StorageSettings;
  affiliates: AffiliateDb;
  mails: MailRecord[];
  campaigns: CampaignRecord[];
};

export type BackupRow = {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  automatic: boolean;
  snapshot: BackupSnapshot | null;
};

export type Gateway = {
  enabled: boolean;
  mode: "sandbox" | "live";
  merchantId: string;
  hasPassword: boolean;
  lastTest: string | null;
};

export type StorageSettings = {
  cloudName: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  configured: boolean;
  lastTest: string | null;
  lastTestOk: boolean;
};

export type NotifEvent = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type Activity = { id: string; text: string; at: string };
export type Toast = { id: string; text: string };

type Store = {
  ready: boolean;
  session: Session | null;
  users: UserRow[];
  orders: OrderRow[];
  coupons: CouponRow[];
  content: ContentRow[];
  media: MediaRow[];
  backups: BackupRow[];
  gateway: Gateway;
  storage: StorageSettings;
  notifEnabled: boolean;
  hiddenSlugs: string[];
  setFeatureOn: (slug: string, on: boolean) => void;
  showAllFeatures: () => void;
  events: NotifEvent[];
  activity: Activity[];
  toasts: Toast[];
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  notify: (text: string) => void;
  addUser: (input: { name: string; email: string; role: Role }) => string | null;
  setUserRole: (id: string, role: Role) => void;
  setUserStatus: (id: string, status: AccountStatus) => void;
  deleteUser: (id: string) => void;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  addCoupon: (input: { code: string; type: CouponType; value: number; maxUses: number | null }) => string | null;
  toggleCoupon: (id: string) => void;
  deleteCoupon: (id: string) => void;
  addContent: (input: { title: string; kind: ContentKind }) => void;
  toggleContent: (id: string) => void;
  deleteContent: (id: string) => void;
  addMedia: (input: { name: string; kind: "image" | "file"; size: string }) => void;
  deleteMedia: (id: string) => void;
  saveStorage: (input: { cloudName: string; apiKey: string; apiSecret: string }) => void;
  testStorage: () => void;
  saveGateway: (input: { enabled: boolean; mode: "sandbox" | "live"; merchantId: string; password: string }) => void;
  testGateway: () => void;
  setNotifEnabled: (enabled: boolean) => void;
  toggleEvent: (key: string) => void;
  testNotification: () => void;
  addBackup: () => void;
  deleteBackup: (id: string) => void;
  restoreBackup: (id: string) => void;
  affiliates: AffiliateDb;
  mails: MailRecord[];
  campaigns: CampaignRecord[];
  setUserPlan: (userId: string, packageName: string) => void;
  sendMail: (input: { userIds: string[]; subject: string; body: string }) => string | null;
  saveCampaign: (input: {
    id: string | null;
    name: string;
    subject: string;
    body: string;
    audience: CampaignAudience;
  }) => { ok: true; id: string } | { ok: false; error: string };
  sendCampaign: (input: {
    id: string | null;
    name: string;
    subject: string;
    body: string;
    audience: CampaignAudience;
  }) => { ok: true; id: string } | { ok: false; error: string };
  deleteCampaign: (id: string) => void;
  registerCustomer: (input: { name: string; email: string; savedRef: string | null }) =>
    | { ok: true; id: string; code: string }
    | { ok: false; error: string };
  saveReferralCode: (userId: string, code: string) => string | null;
  saveReferralSettings: (input: ReferralSettings) => string | null;
  saveUserReferralRates: (
    userId: string,
    input: { commission: number | null; discount: number | null; durationMonths: number | null },
  ) => string | null;
  checkout: (input: {
    buyerId: string;
    item: string;
    listPrice: number;
    currency: Currency;
    couponCode?: string | null;
    referralCode?: string | null;
    useReferralBalance: boolean;
    outcome: "completed" | "failed";
  }) => string | null;
  creditInvoice: (invoice: string) => string | null;
  refundInvoice: (invoice: string) => string | null;
  askWithdrawal: (input: {
    userId: string;
    amountUsd: number;
    paymentMethod: PayoutMethod;
    accountNumber: string;
    note: string;
  }) => string | null;
  decideWithdrawal: (id: string, decision: "approved" | "rejected") => string | null;
};

const StoreContext = createContext<Store | null>(null);

function nid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function clock() {
  return new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<UserRow[]>([
    { id: "u1", name: "Nusrat Rahman", email: "nusrat@example.com", role: "admin", status: "active" },
    { id: "u2", name: "Imran Hossain", email: "imran@example.com", role: "customer", status: "active" },
    { id: "u3", name: "Maya Chowdhury", email: "maya@example.com", role: "customer", status: "disabled" },
    { id: "u4", name: "Farhan Kabir", email: "farhan@example.com", role: "customer", status: "active" },
  ]);
  const [orders, setOrders] = useState<OrderRow[]>([
    { id: "o1", number: "1042", customer: "Imran Hossain", item: "Brand kit", amount: 15000, currency: "BDT", status: "pending", createdAt: "19 Oct, 09:10", at: "2026-10-19T09:10:00.000Z" },
    { id: "o2", number: "1041", customer: "Farhan Kabir", item: "Monthly plan", amount: 2500, currency: "BDT", status: "paid", createdAt: "18 Oct, 16:42", at: "2026-10-18T16:42:00.000Z" },
    { id: "o3", number: "1038", customer: "Maya Chowdhury", item: "Landing page", amount: 8000, currency: "BDT", status: "cancelled", createdAt: "17 Oct, 11:05", at: "2026-10-17T11:05:00.000Z" },
    { id: "o4", number: "1034", customer: "Imran Hossain", item: "Logo pack", amount: 4500, currency: "BDT", status: "paid", createdAt: "15 Oct, 13:20", at: "2026-10-15T13:20:00.000Z" },
  ]);
  const [coupons, setCoupons] = useState<CouponRow[]>([
    { id: "c1", code: "WELCOME10", type: "percent", value: 10, maxUses: 100, used: 24, active: true },
    { id: "c2", code: "FLAT500", type: "fixed", value: 500, maxUses: 20, used: 3, active: true },
    { id: "c3", code: "OLD20", type: "percent", value: 20, maxUses: null, used: 11, active: false },
  ]);
  const [content, setContent] = useState<ContentRow[]>([
    { id: "p1", title: "Home", kind: "page", status: "published", updatedAt: "12 Oct" },
    { id: "p2", title: "About", kind: "page", status: "draft", updatedAt: "18 Oct" },
    { id: "p3", title: "Launch note", kind: "post", status: "published", updatedAt: "16 Oct" },
    { id: "p4", title: "Pricing notes", kind: "post", status: "draft", updatedAt: "19 Oct" },
  ]);
  const [media, setMedia] = useState<MediaRow[]>([
    { id: "m1", name: "hero.webp", kind: "image", size: "240 KB" },
    { id: "m2", name: "logo.svg", kind: "image", size: "12 KB" },
    { id: "m3", name: "invoice.pdf", kind: "file", size: "88 KB" },
  ]);
  const [backups, setBackups] = useState<BackupRow[]>([
    { id: "b1", name: "auto-2026-10-19.json.gz", size: "1.8 MB", createdAt: "19 Oct, 03:00", automatic: true, snapshot: null },
    { id: "b2", name: "manual-2026-10-17.json.gz", size: "1.7 MB", createdAt: "17 Oct, 20:14", automatic: false, snapshot: null },
  ]);
  const [gateway, setGateway] = useState<Gateway>({
    enabled: true,
    mode: "sandbox",
    merchantId: "demo-merchant",
    hasPassword: true,
    lastTest: null,
  });
  const [storage, setStorage] = useState<StorageSettings>({
    cloudName: "demo-cloud",
    hasApiKey: true,
    hasApiSecret: true,
    configured: true,
    lastTest: null,
    lastTestOk: false,
  });
  const [notifEnabled, setNotifEnabledState] = useState(true);
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);
  const [events, setEvents] = useState<NotifEvent[]>([
    { key: "order.created", label: "New order", description: "A customer places an order", enabled: true },
    { key: "payment.received", label: "Payment received", description: "An order is marked paid", enabled: true },
    { key: "user.created", label: "New user", description: "An account is created", enabled: false },
    { key: "coupon.used", label: "Coupon used", description: "A code is applied at checkout", enabled: true },
    { key: "backup.failed", label: "Backup failed", description: "A snapshot does not finish", enabled: true },
  ]);
  const [activity, setActivity] = useState<Activity[]>([
    { id: "a1", text: "Order 1042 is waiting for payment", at: "19 Oct, 09:10" },
    { id: "a2", text: "Coupon WELCOME10 was used", at: "18 Oct, 16:40" },
    { id: "a3", text: "Maya Chowdhury was disabled", at: "18 Oct, 12:02" },
  ]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateDb>(demoAffiliates);
  const [mails, setMails] = useState<MailRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([
    {
      id: "cmp-welcome",
      name: "Free plan check-in",
      subject: "{{name}}, your {{plan}} workspace is ready",
      body: "Hi {{name}},\n\nYou are on the {{plan}} package. Reply if you want help choosing a paid plan.\n\n— Kit",
      audience: { kind: "stages", stages: ["free"] },
      status: "draft",
      createdAt: "2026-10-19T09:00:00.000Z",
      sentAt: null,
      recipientIds: [],
    },
  ]);

  useEffect(() => {
    let menuLoaded = false;
    let sessionLoaded = false;
    const finish = () => {
      if (menuLoaded && sessionLoaded) setReady(true);
    };
    fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((body: { user: Session | null }) => setSession(body.user ? { name: body.user.name, email: body.user.email } : null))
      .catch(() => setSession(null))
      .finally(() => {
        sessionLoaded = true;
        finish();
      });
    const known = new Set(navModules().map((item) => item.slug));
    const applyMenu = (slugs: unknown) => {
      if (!Array.isArray(slugs)) return;
      setHiddenSlugs(slugs.filter((slug): slug is string => typeof slug === "string" && known.has(slug) && !isPinnedNav(slug)));
    };
    const savedMenu = localStorage.getItem(MENU_KEY);
    if (savedMenu) {
      try {
        applyMenu(JSON.parse(savedMenu));
      } catch {
        localStorage.removeItem(MENU_KEY);
      }
    }
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { hiddenSlugs?: unknown } | null) => {
        if (body?.hiddenSlugs) {
          applyMenu(body.hiddenSlugs);
          localStorage.setItem(MENU_KEY, JSON.stringify(body.hiddenSlugs));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        menuLoaded = true;
        finish();
      });
  }, []);

  const pushActivity = (text: string) => {
    setActivity((prev) => [{ id: nid("a"), text, at: clock() }, ...prev].slice(0, 12));
  };

  const notify = (text: string) => {
    const id = nid("t");
    setToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 2800);
  };

  const value = useMemo<Store>(() => {
    return {
      ready,
      session,
      users,
      orders,
      coupons,
      content,
      media,
      backups,
      gateway,
      storage,
      notifEnabled,
      hiddenSlugs,
      setFeatureOn: (slug, on) => {
        if (isPinnedNav(slug)) return;
        const label = moduleBySlug(slug).label;
        setHiddenSlugs((prev) => {
          const next = on ? prev.filter((item) => item !== slug) : prev.includes(slug) ? prev : [...prev, slug];
          persistMenu(next);
          localStorage.setItem(MENU_KEY, JSON.stringify(next));
          return next;
        });
        notify(on ? `${label} is back in the menu` : `${label} is hidden from the menu`);
      },
      showAllFeatures: () => {
        setHiddenSlugs([]);
        persistMenu([]);
        localStorage.setItem(MENU_KEY, "[]");
        notify("Every feature is in the menu");
      },
      events,
      activity,
      toasts,
      mails,
      campaigns,
      login: async (email, password) => {
        try {
          const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const body = await response.json();
          if (!response.ok) return body.error ?? "Could not sign in.";
          setSession({ name: body.user.name, email: body.user.email });
          return null;
        } catch {
          return "The server did not answer. Try again.";
        }
      },
      logout: async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
        setSession(null);
      },
      notify,
      addUser: ({ name, email, role }) => {
        const id = nid("u");
        const created = createAffiliateUser(affiliates, {
          id,
          name,
          email,
          savedRef: null,
        });
        if (!created.ok) return created.error;
        setAffiliates(created.state);
        setUsers((prev) => [
          { id, name: name.trim(), email: email.trim().toLowerCase(), role, status: "active" },
          ...prev,
        ]);
        pushActivity(`Created ${role} ${email.trim().toLowerCase()}`);
        notify("User created");
        return null;
      },
      setUserRole: (id, role) => {
        const user = users.find((item) => item.id === id);
        setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, role } : item)));
        if (user && user.role !== role) notify(`${user.name} is now ${role}`);
      },
      setUserStatus: (id, status) => {
        const user = users.find((item) => item.id === id);
        setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        if (user) {
          pushActivity(`${user.name} is ${status}`);
          notify(`${user.name} is ${status}`);
        }
      },
      deleteUser: (id) => {
        const user = users.find((item) => item.id === id);
        setUsers((prev) => prev.filter((item) => item.id !== id));
        setAffiliates(removeAffiliateUser(affiliates, id));
        if (user) {
          pushActivity(`Deleted ${user.email}`);
          notify("User deleted");
        }
      },
      setOrderStatus: (id, status) => {
        const order = orders.find((item) => item.id === id);
        if (!order || order.status === status) return;
        if (status === "paid" && order.status === "cancelled") {
          notify("A cancelled order cannot be marked paid.");
          return;
        }
        if (status === "cancelled") {
          const payment = affiliates.payments.find(
            (item) => item.invoice_number === order.number && item.status === "completed",
          );
          if (payment) {
            const result = refundPayment(affiliates, coupons, order.number);
            if (!result.ok) {
              notify(result.error);
              return;
            }
            setAffiliates(result.state);
            setCoupons(result.coupons);
          }
        }
        setOrders((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        pushActivity(`Order ${order.number} marked ${status}`);
        notify(`Order ${order.number} is ${status}`);
      },
      addCoupon: ({ code, type, value: amount, maxUses }) => {
        const normalized = code.trim().toUpperCase();
        if (!normalized) return "Add a code.";
        if (coupons.some((coupon) => coupon.code.toUpperCase() === normalized)) return "That code already exists.";
        if (type === "percent" && amount > 100) return "A percent coupon cannot be over 100.";
        if (!Number.isFinite(amount) || amount <= 0) return "Value must be above zero.";
        if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) return "Max uses must be a whole number above zero.";
        setCoupons((prev) => [
          { id: nid("c"), code: normalized, type, value: amount, maxUses, used: 0, active: true },
          ...prev,
        ]);
        pushActivity(`Coupon ${normalized} created`);
        notify(`Coupon ${normalized} created`);
        return null;
      },
      toggleCoupon: (id) => {
        const coupon = coupons.find((item) => item.id === id);
        setCoupons((prev) => prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
        if (coupon) notify(`${coupon.code} ${coupon.active ? "paused" : "activated"}`);
      },
      deleteCoupon: (id) => {
        const coupon = coupons.find((item) => item.id === id);
        setCoupons((prev) => prev.filter((item) => item.id !== id));
        if (coupon) notify(`${coupon.code} deleted`);
      },
      addContent: ({ title, kind }) => {
        setContent((prev) => [
          { id: nid("p"), title: title.trim(), kind, status: "draft", updatedAt: "Just now" },
          ...prev,
        ]);
        pushActivity(`Draft ${kind} “${title.trim()}” added`);
        notify("Draft saved");
      },
      toggleContent: (id) => {
        const item = content.find((row) => row.id === id);
        if (!item) return;
        const status: ContentStatus = item.status === "published" ? "draft" : "published";
        setContent((prev) => prev.map((row) => (row.id === id ? { ...row, status, updatedAt: "Just now" } : row)));
        notify(`${item.title} is ${status}`);
      },
      deleteContent: (id) => {
        const item = content.find((row) => row.id === id);
        setContent((prev) => prev.filter((row) => row.id !== id));
        if (item) notify(`${item.title} deleted`);
      },
      addMedia: ({ name, kind, size }) => {
        setMedia((prev) => [{ id: nid("m"), name, kind, size }, ...prev]);
        pushActivity(`Uploaded ${name}`);
        notify(`${name} added to the library`);
      },
      deleteMedia: (id) => {
        const file = media.find((item) => item.id === id);
        setMedia((prev) => prev.filter((item) => item.id !== id));
        if (file) notify(`${file.name} removed`);
      },
      saveStorage: ({ cloudName, apiKey, apiSecret }) => {
        const name = cloudName.trim();
        setStorage((prev) => {
          const hasApiKey = apiKey.trim().length > 0 ? true : prev.hasApiKey;
          const hasApiSecret = apiSecret.trim().length > 0 ? true : prev.hasApiSecret;
          return {
            ...prev,
            cloudName: name,
            hasApiKey,
            hasApiSecret,
            configured: name.length > 0 && hasApiKey && hasApiSecret,
          };
        });
        notify("Cloudinary credentials saved");
      },
      testStorage: () => {
        const ready = storage.cloudName.trim().length > 0 && storage.hasApiKey && storage.hasApiSecret;
        const message = ready
          ? `Cloudinary “${storage.cloudName}” is ready`
          : "Add a cloud name, API key, and API secret first";
        setStorage((prev) => ({ ...prev, lastTest: message, lastTestOk: ready }));
        notify(message);
      },
      saveGateway: ({ enabled, mode, merchantId, password }) => {
        setGateway((prev) => ({
          ...prev,
          enabled,
          mode,
          merchantId: merchantId.trim(),
          hasPassword: password.trim().length > 0 ? true : prev.hasPassword,
        }));
        notify("Gateway saved");
      },
      testGateway: () => {
        const message = gateway.enabled
          ? `PayStation ${gateway.mode} answered for ${gateway.merchantId || "this merchant"}`
          : "Turn the gateway on before testing";
        setGateway((prev) => ({ ...prev, lastTest: message }));
        notify(message);
      },
      setNotifEnabled: (enabled) => {
        setNotifEnabledState(enabled);
        notify(enabled ? "Notifications on" : "Notifications off");
      },
      toggleEvent: (key) => {
        setEvents((prev) => prev.map((item) => (item.key === key ? { ...item, enabled: !item.enabled } : item)));
      },
      testNotification: () => {
        const message = notifEnabled ? "Test notification sent" : "Turn notifications on before sending a test";
        if (notifEnabled) pushActivity("Test notification sent");
        notify(message);
      },
      addBackup: () => {
        const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
        const name = `manual-${stamp}.json`;
        const snapshot: BackupSnapshot = {
          users,
          orders,
          coupons,
          content,
          media,
          gateway,
          storage,
          affiliates,
          mails,
          campaigns,
        };
        const bytes = new Blob([JSON.stringify(snapshot)]).size;
        const size = bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        setBackups((prev) => [
          { id: nid("b"), name, size, createdAt: clock(), automatic: false, snapshot: structuredClone(snapshot) },
          ...prev,
        ]);
        pushActivity(`Backup ${name} created`);
        notify("Snapshot created");
      },
      deleteBackup: (id) => {
        setBackups((prev) => prev.filter((item) => item.id !== id));
        notify("Snapshot removed");
      },
      restoreBackup: (id) => {
        const backup = backups.find((item) => item.id === id);
        if (!backup) return;
        if (!backup.snapshot) {
          notify("This snapshot has no stored data. Create a new backup first.");
          return;
        }
        const snapshot = structuredClone(backup.snapshot);
        setUsers(snapshot.users);
        setOrders(snapshot.orders);
        setCoupons(snapshot.coupons);
        setContent(snapshot.content);
        setMedia(snapshot.media);
        setGateway(snapshot.gateway);
        setStorage(snapshot.storage);
        setAffiliates(snapshot.affiliates);
        setMails(snapshot.mails ?? []);
        setCampaigns(snapshot.campaigns ?? []);
        pushActivity(`Restored ${backup.name}`);
        notify(`Restored ${backup.name}`);
      },
      affiliates,
      setUserPlan: (userId, packageName) => {
        const account = users.find((user) => user.id === userId);
        const next = structuredClone(affiliates);
        const profile = next.users.find((user) => user.id === userId);
        if (!account || !profile) return;
        profile.plan = packageName === "Free" ? null : packageName;
        setAffiliates(next);
        notify(`${account.name} is on ${packageName}`);
      },
      sendMail: ({ userIds, subject, body }) => {
        const cleanSubject = subject.trim();
        const cleanBody = body.trim();
        if (!cleanSubject || !cleanBody) return "Add a subject and a message.";
        const people = buildPeople({ users, profiles: affiliates.users, orders, mails });
        const chosen = people.filter((person) => userIds.includes(person.id));
        if (chosen.length === 0) return "Choose at least one person.";
        const sentAt = new Date().toISOString();
        setMails((prev) => [
          ...chosen.map((person) => ({
            id: nid("mail"),
            userId: person.id,
            campaignId: null,
            subject: personalize(cleanSubject, person),
            body: personalize(cleanBody, person),
            sentAt,
          })),
          ...prev,
        ]);
        pushActivity(`Emailed ${chosen.length === 1 ? chosen[0].name : `${chosen.length} people`}`);
        notify(chosen.length === 1 ? `Email queued for ${chosen[0].name}` : `Email queued for ${chosen.length} people`);
        return null;
      },
      saveCampaign: (input) => {
        const name = input.name.trim();
        if (!name) return { ok: false, error: "Name the campaign." };
        if (input.id) {
          const existing = campaigns.find((item) => item.id === input.id);
          if (!existing) return { ok: false, error: "Campaign not found." };
          if (existing.status === "sent") return { ok: false, error: "A sent campaign stays as a record." };
          setCampaigns((prev) =>
            prev.map((item) =>
              item.id === input.id
                ? { ...item, name, subject: input.subject, body: input.body, audience: input.audience }
                : item,
            ),
          );
          notify("Campaign saved");
          return { ok: true, id: input.id };
        }
        const id = nid("cmp");
        setCampaigns((prev) => [
          {
            id,
            name,
            subject: input.subject,
            body: input.body,
            audience: input.audience,
            status: "draft",
            createdAt: new Date().toISOString(),
            sentAt: null,
            recipientIds: [],
          },
          ...prev,
        ]);
        notify("Draft saved");
        return { ok: true, id };
      },
      sendCampaign: (input) => {
        const name = input.name.trim();
        const subject = input.subject.trim();
        const body = input.body.trim();
        if (!name || !subject || !body) return { ok: false, error: "Add a name, subject, and message before sending." };
        if (input.id && campaigns.some((item) => item.id === input.id && item.status === "sent")) {
          return { ok: false, error: "This campaign was already sent." };
        }
        const people = buildPeople({ users, profiles: affiliates.users, orders, mails });
        const recipients = audiencePeople(people, input.audience);
        if (recipients.length === 0) return { ok: false, error: "No active people match this audience." };
        const id = input.id ?? nid("cmp");
        const sentAt = new Date().toISOString();
        setMails((prev) => [
          ...recipients.map((person) => ({
            id: nid("mail"),
            userId: person.id,
            campaignId: id,
            subject: personalize(subject, person),
            body: personalize(body, person),
            sentAt,
          })),
          ...prev,
        ]);
        setCampaigns((prev) => {
          const createdAt = prev.find((item) => item.id === id)?.createdAt ?? sentAt;
          const record: CampaignRecord = {
            id,
            name,
            subject: input.subject,
            body: input.body,
            audience: input.audience,
            status: "sent",
            createdAt,
            sentAt,
            recipientIds: recipients.map((person) => person.id),
          };
          return prev.some((item) => item.id === id) ? prev.map((item) => (item.id === id ? record : item)) : [record, ...prev];
        });
        pushActivity(`Campaign “${name}” sent to ${recipients.length}`);
        notify(`Campaign sent to ${recipients.length}`);
        return { ok: true, id };
      },
      deleteCampaign: (id) => {
        const campaign = campaigns.find((item) => item.id === id);
        setCampaigns((prev) => prev.filter((item) => item.id !== id));
        if (campaign) notify(`${campaign.name} deleted`);
      },
      registerCustomer: ({ name, email, savedRef }) => {
        const id = nid("u");
        const created = createAffiliateUser(affiliates, { id, name, email, savedRef });
        if (!created.ok) return created;
        setAffiliates(created.state);
        setUsers((prev) => [
          { id, name: name.trim(), email: email.trim().toLowerCase(), role: "customer", status: "active" },
          ...prev,
        ]);
        pushActivity(`Registered ${email.trim().toLowerCase()} with code ${created.user.referral_code}`);
        notify("Account created");
        return { ok: true, id, code: created.user.referral_code };
      },
      saveReferralCode: (userId, code) => {
        const result = renameReferralCode(affiliates, userId, code);
        if (!result.ok) return result.error;
        setAffiliates(result.state);
        notify("Referral code saved");
        return null;
      },
      saveReferralSettings: (input) => {
        const result = updateReferralSettings(affiliates, input);
        if (!result.ok) return result.error;
        setAffiliates(result.state);
        notify("Referral settings saved");
        return null;
      },
      saveUserReferralRates: (userId, input) => {
        const result = updateUserReferralRates(affiliates, userId, input);
        if (!result.ok) return result.error;
        setAffiliates(result.state);
        const user = result.state.users.find((item) => item.id === userId);
        notify(user ? `Rates saved for ${user.name}` : "Rates saved");
        return null;
      },
      checkout: (input) => {
        const account = users.find((user) => user.id === input.buyerId);
        if (account?.status === "disabled") return "This account is disabled.";
        const result = completeCheckout(affiliates, coupons, input);
        if (!result.ok) return result.error;
        setAffiliates(result.state);
        setCoupons(result.coupons);
        const buyer = affiliates.users.find((item) => item.id === input.buyerId);
        setOrders((prev) => [
          {
            id: nid("o"),
            number: result.invoice,
            customer: buyer?.name ?? "Customer",
            item: input.item,
            amount: result.payable,
            currency: input.currency,
            status: input.outcome === "completed" ? "paid" : "cancelled",
            createdAt: clock(),
            at: new Date().toISOString(),
          },
          ...prev,
        ]);
        if (input.outcome === "failed") {
          pushActivity(`${result.invoice} failed for ${buyer?.name ?? "a customer"}`);
          notify(`${result.invoice} failed. Commission was not credited.`);
          return null;
        }
        pushActivity(`${result.invoice} completed via ${input.useReferralBalance ? "referral balance" : "PayStation"}`);
        notify(
          result.credited
            ? `${result.invoice} completed and commission credited`
            : `${result.invoice} completed`,
        );
        return null;
      },
      creditInvoice: (invoice) => {
        const result = creditPayment(affiliates, invoice);
        if (!result.ok) return result.error;
        if (result.already) return "That invoice is already credited.";
        setAffiliates(result.state);
        pushActivity(`Credited commission for ${invoice}`);
        notify(`Commission credited for ${invoice}`);
        return null;
      },
      refundInvoice: (invoice) => {
        const result = refundPayment(affiliates, coupons, invoice);
        if (!result.ok) return result.error;
        setAffiliates(result.state);
        setCoupons(result.coupons);
        setOrders((prev) => prev.map((order) => (order.number === invoice ? { ...order, status: "cancelled" } : order)));
        pushActivity(`${invoice} refunded${result.reversed ? " and commission reversed" : ""}`);
        notify(result.reversed ? `${invoice} refunded and commission reversed` : `${invoice} refunded`);
        return null;
      },
      askWithdrawal: (input) => {
        const account = users.find((user) => user.id === input.userId);
        if (account?.status === "disabled") return "This account is disabled.";
        const result = requestWithdrawal(affiliates, input);
        if (!result.ok) return result.error;
        setAffiliates(result.state);
        notify("Withdrawal request submitted");
        return null;
      },
      decideWithdrawal: (id, decision) => {
        const result = decideWithdrawalRequest(affiliates, {
          id,
          decision,
          processedBy: session?.email ?? "admin",
        });
        if (!result.ok) return result.error;
        setAffiliates(result.state);
        notify(decision === "approved" ? "Withdrawal approved" : "Withdrawal rejected");
        return null;
      },
    };
    // notify and pushActivity close over latest setters; listing state is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    session,
    users,
    orders,
    coupons,
    content,
    media,
    backups,
    gateway,
    storage,
    notifEnabled,
    hiddenSlugs,
    events,
    activity,
    toasts,
    affiliates,
    mails,
    campaigns,
  ]);

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100%-2rem,22rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-lg border border-[var(--line)] bg-white px-3.5 py-3 text-sm text-[var(--text)] shadow-lg"
          >
            {toast.text}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}

export function taka(amount: number) {
  return `৳${amount.toLocaleString("en-BD")}`;
}
