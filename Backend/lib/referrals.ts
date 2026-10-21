export type Currency = "USD" | "BDT";

export type PayoutMethod = "bkash" | "nagad" | "bank" | "paypal" | "wise" | "binance";

export const PAYOUT_METHODS: { id: PayoutMethod; label: string }[] = [
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "bank", label: "Bank" },
  { id: "paypal", label: "PayPal" },
  { id: "wise", label: "Wise" },
  { id: "binance", label: "Binance" },
];

export const REF_STORAGE_KEY = "sak-ref";
export const BUYER_STORAGE_KEY = "sak-buyer";

export type AffiliateUser = {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  referred_by: string | null;
  saved_ref: string | null;
  referral_commission_rate: number | null;
  referral_discount_rate: number | null;
  referral_commission_duration_months: number | null;
  referred_commission_until: string | null;
  referral_balance_usd: number;
  referral_paddle_discount_id: null;
  completed_payments: number;
  plan: string | null;
};

export type ReferralSettings = {
  id: "default";
  default_commission_percent: number;
  default_discount_percent: number;
  default_commission_duration_months: number;
  min_withdraw_usd: number;
  usd_conversion_rate: number;
};

export type WithdrawalStatus = "pending" | "approved" | "rejected";

export type Withdrawal = {
  id: string;
  user_id: string;
  amount_usd: number;
  payment_method: PayoutMethod;
  account_number: string;
  note: string | null;
  status: WithdrawalStatus;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
};

export type LedgerKind = "referral_commission_credit" | "referral_commission_reversal";

export type LedgerEvent = {
  id: string;
  kind: LedgerKind;
  referrer_user_id: string;
  buyer_id: string;
  invoice_number: string;
  commission_percent: number;
  commission_amount_usd: number;
  payment_base_amount: number;
  payment_currency: Currency;
  created_at: string;
};

export type PaymentSession = {
  code: string | null;
  referrer_user_id: string | null;
  discount_percent: number;
};

export type AffiliatePayment = {
  invoice_number: string;
  buyer_id: string;
  item: string;
  list_price: number;
  paid_amount: number;
  currency: Currency;
  status: "completed" | "failed" | "refunded";
  gateway: "paystation" | "referral_balance" | null;
  coupon_code: string | null;
  paid_usd: number;
  session: PaymentSession;
  created_at: string;
};

export type CheckoutCoupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  maxUses: number | null;
  used: number;
  active: boolean;
};

export type AffiliateDb = {
  users: AffiliateUser[];
  settings: ReferralSettings;
  withdrawals: Withdrawal[];
  ledger: LedgerEvent[];
  payments: AffiliatePayment[];
};

export type Quote = {
  payable: number;
  priceUsd: number;
  couponOff: number;
  referralOff: number;
  session: PaymentSession;
  coupon: CheckoutCoupon | null;
};

type Ok<T extends object = object> = { ok: true; state: AffiliateDb } & T;
type Err = { ok: false; error: string };

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function money(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatUsd(amount: number) {
  return `$${money(amount).toFixed(2)}`;
}

export function formatMoney(amount: number, currency: Currency) {
  if (currency === "USD") return formatUsd(amount);
  return `৳${money(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function defaultSettings(): ReferralSettings {
  return {
    id: "default",
    default_commission_percent: 10,
    default_discount_percent: 10,
    default_commission_duration_months: 24,
    min_withdraw_usd: 1,
    usd_conversion_rate: 110,
  };
}

export function effectiveCommission(user: AffiliateUser, settings: ReferralSettings) {
  return user.referral_commission_rate ?? settings.default_commission_percent;
}

export function effectiveDiscount(user: AffiliateUser, settings: ReferralSettings) {
  return user.referral_discount_rate ?? settings.default_discount_percent;
}

export function effectiveDuration(user: AffiliateUser, settings: ReferralSettings) {
  return user.referral_commission_duration_months ?? settings.default_commission_duration_months;
}

export function normalizeCode(raw: string | null | undefined) {
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  if (!/^[a-z0-9]{4,16}$/.test(code)) return null;
  return code;
}

export function rememberReferralCode(queryValue: string | null) {
  const fromQuery = normalizeCode(queryValue);
  if (typeof window === "undefined") return fromQuery;
  if (fromQuery) sessionStorage.setItem(REF_STORAGE_KEY, fromQuery);
  return fromQuery || normalizeCode(sessionStorage.getItem(REF_STORAGE_KEY));
}

function randomCode(length = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function codeFromName(name: string, taken: Set<string>) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
  const seed = base.length >= 4 ? base : randomCode(8);
  if (!taken.has(seed)) return seed;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = randomCode(4);
    const next = `${seed.slice(0, 12)}${suffix}`.slice(0, 16);
    if (next.length >= 4 && !taken.has(next)) return next;
  }
  return randomCode(12);
}

function blankUser(input: { id: string; name: string; email: string; code: string; savedRef: string | null }): AffiliateUser {
  return {
    id: input.id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    referral_code: input.code,
    referred_by: null,
    saved_ref: input.savedRef,
    referral_commission_rate: null,
    referral_discount_rate: null,
    referral_commission_duration_months: null,
    referred_commission_until: null,
    referral_balance_usd: 0,
    referral_paddle_discount_id: null,
    completed_payments: 0,
    plan: null,
  };
}

export function createAffiliateUser(
  db: AffiliateDb,
  input: { id: string; name: string; email: string; savedRef: string | null },
): Ok<{ user: AffiliateUser }> | Err {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: "Name is required." };
  if (!email.includes("@")) return { ok: false, error: "Email is required." };
  if (db.users.some((user) => user.email === email)) return { ok: false, error: "That email is already registered." };
  const next = clone(db);
  const code = codeFromName(name, new Set(next.users.map((user) => user.referral_code)));
  const saved = normalizeCode(input.savedRef);
  const user = blankUser({ id: input.id, name, email, code, savedRef: saved });
  next.users = [user, ...next.users];
  return { ok: true, state: next, user };
}

export function spendableBalance(db: AffiliateDb, userId: string) {
  const user = db.users.find((item) => item.id === userId);
  if (!user) return 0;
  const held = db.withdrawals.reduce((sum, item) => {
    if (item.user_id !== userId || item.status !== "pending") return sum;
    return sum + item.amount_usd;
  }, 0);
  return money(Math.max(0, user.referral_balance_usd - held));
}

export function removeAffiliateUser(db: AffiliateDb, userId: string) {
  const next = clone(db);
  const now = new Date().toISOString();
  next.withdrawals = next.withdrawals.map((item) =>
    item.user_id === userId && item.status === "pending"
      ? { ...item, status: "rejected", processed_at: now, processed_by: "account-deleted" }
      : item,
  );
  next.users = next.users.filter((user) => user.id !== userId);
  return next;
}

export function renameReferralCode(db: AffiliateDb, userId: string, raw: string): Ok<{ code: string }> | Err {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, error: "Use 4–16 letters or numbers." };
  const owner = db.users.find((user) => user.referral_code === code);
  if (owner && owner.id !== userId) return { ok: false, error: "That code is already taken." };
  const next = clone(db);
  const user = next.users.find((item) => item.id === userId);
  if (!user) return { ok: false, error: "Account not found." };
  user.referral_code = code;
  return { ok: true, state: next, code };
}

function readPercent(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) return `${label} must be between 0 and 100.`;
  return null;
}

export function updateReferralSettings(db: AffiliateDb, input: ReferralSettings): Ok | Err {
  const commission = readPercent(input.default_commission_percent, "Commission");
  if (commission) return { ok: false, error: commission };
  const discount = readPercent(input.default_discount_percent, "Discount");
  if (discount) return { ok: false, error: discount };
  if (!Number.isInteger(input.default_commission_duration_months) || input.default_commission_duration_months < 0) {
    return { ok: false, error: "Duration must be a whole number of months." };
  }
  if (!Number.isFinite(input.min_withdraw_usd) || input.min_withdraw_usd < 0) {
    return { ok: false, error: "Minimum withdrawal must be zero or more." };
  }
  if (!Number.isFinite(input.usd_conversion_rate) || input.usd_conversion_rate <= 0) {
    return { ok: false, error: "Conversion rate must be above zero." };
  }
  const next = clone(db);
  next.settings = {
    id: "default",
    default_commission_percent: money(input.default_commission_percent),
    default_discount_percent: money(input.default_discount_percent),
    default_commission_duration_months: input.default_commission_duration_months,
    min_withdraw_usd: money(input.min_withdraw_usd),
    usd_conversion_rate: input.usd_conversion_rate,
  };
  return { ok: true, state: next };
}

export function updateUserReferralRates(
  db: AffiliateDb,
  userId: string,
  input: { commission: number | null; discount: number | null; durationMonths: number | null },
): Ok | Err {
  if (input.commission != null) {
    const message = readPercent(input.commission, "Commission");
    if (message) return { ok: false, error: message };
  }
  if (input.discount != null) {
    const message = readPercent(input.discount, "Buyer discount");
    if (message) return { ok: false, error: message };
  }
  if (input.durationMonths != null && (!Number.isInteger(input.durationMonths) || input.durationMonths < 0)) {
    return { ok: false, error: "Duration must be a whole number of months, or blank for the default." };
  }
  const next = clone(db);
  const user = next.users.find((item) => item.id === userId);
  if (!user) return { ok: false, error: "Account not found." };
  user.referral_commission_rate = input.commission == null ? null : money(input.commission);
  user.referral_discount_rate = input.discount == null ? null : money(input.discount);
  user.referral_commission_duration_months = input.durationMonths;
  return { ok: true, state: next };
}

function findCoupon(coupons: CheckoutCoupon[], raw: string) {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  return coupons.find((coupon) => coupon.code.trim().toLowerCase() === key) ?? null;
}

export function toUsd(amount: number, currency: Currency, rate: number) {
  if (currency === "USD") return money(amount);
  return money(amount / rate);
}

export function classifyCode(
  db: AffiliateDb,
  coupons: CheckoutCoupon[],
  raw: string,
  buyerId: string,
): { ok: true; kind: "coupon"; coupon: CheckoutCoupon } | { ok: true; kind: "referral"; code: string } | Err {
  const buyer = db.users.find((user) => user.id === buyerId);
  if (!buyer) return { ok: false, error: "Choose the customer who is paying." };
  const text = raw.trim();
  if (!text) return { ok: false, error: "Enter a code." };
  const matchedCoupon = findCoupon(coupons, text);
  if (matchedCoupon) {
    if (!matchedCoupon.active) return { ok: false, error: "That coupon is not active." };
    if (matchedCoupon.maxUses != null && matchedCoupon.used >= matchedCoupon.maxUses) {
      return { ok: false, error: "That coupon has reached its limit." };
    }
    return { ok: true, kind: "coupon", coupon: matchedCoupon };
  }
  const code = normalizeCode(text);
  const referrer = code ? db.users.find((user) => user.referral_code === code) : null;
  if (!referrer) return { ok: false, error: "Enter a code we recognize, or leave it blank." };
  if (referrer.id === buyer.id) return { ok: false, error: "You cannot use your own referral code." };
  if (buyer.completed_payments > 0) return { ok: false, error: "Referral discount is only available on the first purchase." };
  return { ok: true, kind: "referral", code: referrer.referral_code };
}

export function quoteCheckout(
  db: AffiliateDb,
  coupons: CheckoutCoupon[],
  input: {
    buyerId: string;
    listPrice: number;
    currency: Currency;
    couponCode?: string | null;
    referralCode?: string | null;
    useReferralBalance: boolean;
  },
): { ok: true; quote: Quote } | Err {
  const buyer = db.users.find((user) => user.id === input.buyerId);
  if (!buyer) return { ok: false, error: "Choose the customer who is paying." };
  if (!Number.isFinite(input.listPrice) || input.listPrice <= 0) return { ok: false, error: "Enter a price above zero." };
  if (input.currency !== "USD" && input.currency !== "BDT") return { ok: false, error: "Currency must be USD or BDT." };

  let coupon: CheckoutCoupon | null = null;
  let session: PaymentSession = { code: null, referrer_user_id: null, discount_percent: 0 };
  const couponText = input.couponCode?.trim() ?? "";
  const referralText = input.referralCode?.trim() ?? "";

  if (couponText) {
    const matchedCoupon = findCoupon(coupons, couponText);
    if (!matchedCoupon) return { ok: false, error: "Enter a code we recognize, or leave it blank." };
    if (!matchedCoupon.active) return { ok: false, error: "That coupon is not active." };
    if (matchedCoupon.maxUses != null && matchedCoupon.used >= matchedCoupon.maxUses) {
      return { ok: false, error: "That coupon has reached its limit." };
    }
    coupon = matchedCoupon;
  }

  if (referralText) {
    const code = normalizeCode(referralText);
    const referrer = code ? db.users.find((user) => user.referral_code === code) : null;
    if (!referrer) return { ok: false, error: "Enter a code we recognize, or leave it blank." };
    if (referrer.id === buyer.id) return { ok: false, error: "You cannot use your own referral code." };
    if (buyer.completed_payments > 0) return { ok: false, error: "Referral discount is only available on the first purchase." };
    const discount = input.useReferralBalance ? 0 : effectiveDiscount(referrer, db.settings);
    session = { code: referrer.referral_code, referrer_user_id: referrer.id, discount_percent: discount };
  }

  let couponOff = 0;
  if (coupon) {
    if (coupon.type === "percent") {
      couponOff = input.listPrice * (coupon.value / 100);
    } else {
      const fixed = input.currency === "USD" ? coupon.value / db.settings.usd_conversion_rate : coupon.value;
      couponOff = Math.min(input.listPrice, fixed);
    }
  }
  const afterCoupon = Math.max(0, input.listPrice - couponOff);
  const referralOff = afterCoupon * (session.discount_percent / 100);
  const payable = money(Math.max(0, afterCoupon - referralOff));
  return {
    ok: true,
    quote: {
      payable,
      priceUsd: toUsd(payable, input.currency, db.settings.usd_conversion_rate),
      couponOff: money(couponOff),
      referralOff: money(referralOff),
      session,
      coupon,
    },
  };
}

function addMonths(iso: string, months: number) {
  const date = new Date(iso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

function hasCredit(db: AffiliateDb, invoice: string, referrerId: string) {
  return db.ledger.some(
    (event) =>
      event.kind === "referral_commission_credit" &&
      event.invoice_number === invoice &&
      event.referrer_user_id === referrerId,
  );
}

function applyCredit(
  db: AffiliateDb,
  payment: AffiliatePayment,
  at: string,
  id: string,
): { credited: boolean; already: boolean; reason: "none" | "window" | null } {
  if (payment.status !== "completed") return { credited: false, already: false, reason: "none" };
  const buyer = db.users.find((user) => user.id === payment.buyer_id);
  if (!buyer) return { credited: false, already: false, reason: "none" };
  const referrerId = payment.session.referrer_user_id || buyer.referred_by;
  if (!referrerId || referrerId === buyer.id) return { credited: false, already: false, reason: "none" };
  const referrer = db.users.find((user) => user.id === referrerId);
  if (!referrer) return { credited: false, already: false, reason: "none" };
  if (hasCredit(db, payment.invoice_number, referrer.id)) return { credited: false, already: true, reason: null };

  if (!buyer.referred_by) buyer.referred_by = referrer.id;

  const percent = effectiveCommission(referrer, db.settings);
  const duration = effectiveDuration(referrer, db.settings);
  if (duration !== 0 && buyer.referred_commission_until && Date.parse(at) > Date.parse(buyer.referred_commission_until)) {
    return { credited: false, already: false, reason: "window" };
  }
  if (duration !== 0 && !buyer.referred_commission_until) {
    buyer.referred_commission_until = addMonths(at, duration);
  }

  const commission =
    payment.currency === "USD"
      ? money((payment.paid_amount * percent) / 100)
      : money(money((payment.paid_amount * percent) / 100) / db.settings.usd_conversion_rate);
  referrer.referral_balance_usd = money(referrer.referral_balance_usd + commission);
  db.ledger = [
    {
      id,
      kind: "referral_commission_credit",
      referrer_user_id: referrer.id,
      buyer_id: buyer.id,
      invoice_number: payment.invoice_number,
      commission_percent: percent,
      commission_amount_usd: commission,
      payment_base_amount: payment.paid_amount,
      payment_currency: payment.currency,
      created_at: at,
    },
    ...db.ledger,
  ];
  return { credited: true, already: false, reason: null };
}

export function completeCheckout(
  db: AffiliateDb,
  coupons: CheckoutCoupon[],
  input: {
    buyerId: string;
    item: string;
    listPrice: number;
    currency: Currency;
    couponCode?: string | null;
    referralCode?: string | null;
    useReferralBalance: boolean;
    outcome: "completed" | "failed";
  },
  opts?: { now?: string; invoice?: string; id?: string },
): Ok<{ invoice: string; payable: number; priceUsd: number; coupons: CheckoutCoupon[]; credited: boolean }> | Err {
  const quoted = quoteCheckout(db, coupons, input);
  if (!quoted.ok) return quoted;
  const buyer = db.users.find((user) => user.id === input.buyerId);
  if (!buyer) return { ok: false, error: "Choose the customer who is paying." };

  if (input.useReferralBalance && input.outcome === "completed") {
    const available = spendableBalance(db, buyer.id);
    if (available + 0.001 < quoted.quote.priceUsd) {
      return {
        ok: false,
        error: `Referral balance available is ${formatUsd(available)}. Pending withdrawals stay reserved.`,
      };
    }
  }

  const next = clone(db);
  const at = opts?.now ?? new Date().toISOString();
  const invoice = opts?.invoice ?? `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const payingBuyer = next.users.find((user) => user.id === input.buyerId)!;
  let gateway: AffiliatePayment["gateway"] = null;
  let nextCoupons = coupons;

  if (input.outcome === "completed" && input.useReferralBalance) {
    payingBuyer.referral_balance_usd = money(payingBuyer.referral_balance_usd - quoted.quote.priceUsd);
    gateway = "referral_balance";
  } else if (input.outcome === "completed") {
    gateway = "paystation";
  }

  if (input.outcome === "completed") {
    payingBuyer.completed_payments += 1;
    payingBuyer.plan = input.item;
    if (quoted.quote.coupon) {
      nextCoupons = coupons.map((coupon) =>
        coupon.id === quoted.quote.coupon!.id ? { ...coupon, used: coupon.used + 1 } : coupon,
      );
    }
  }

  const payment: AffiliatePayment = {
    invoice_number: invoice,
    buyer_id: input.buyerId,
    item: input.item,
    list_price: money(input.listPrice),
    paid_amount: quoted.quote.payable,
    currency: input.currency,
    status: input.outcome,
    gateway,
    coupon_code: quoted.quote.coupon?.code ?? null,
    paid_usd: quoted.quote.priceUsd,
    session: quoted.quote.session,
    created_at: at,
  };
  next.payments = [payment, ...next.payments];
  const credit =
    input.outcome === "completed"
      ? applyCredit(next, payment, at, opts?.id ?? `led-${invoice.toLowerCase()}`)
      : { credited: false, already: false, reason: "none" as const };

  return {
    ok: true,
    state: next,
    invoice,
    payable: quoted.quote.payable,
    priceUsd: quoted.quote.priceUsd,
    coupons: nextCoupons,
    credited: credit.credited,
  };
}

export function creditPayment(
  db: AffiliateDb,
  invoice: string,
  opts?: { id?: string },
): Ok<{ already: boolean; credited: boolean }> | Err {
  const payment = db.payments.find((item) => item.invoice_number === invoice);
  if (!payment) return { ok: false, error: "Invoice not found." };
  if (payment.status !== "completed") return { ok: false, error: "Only a completed payment can be credited." };
  const next = clone(db);
  const stored = next.payments.find((item) => item.invoice_number === invoice)!;
  const result = applyCredit(next, stored, stored.created_at, opts?.id ?? `led-${invoice.toLowerCase()}-replay`);
  if (result.already) return { ok: true, state: db, already: true, credited: false };
  if (!result.credited && result.reason === "window") {
    return { ok: false, error: "Commission window has ended for this buyer." };
  }
  if (!result.credited) return { ok: false, error: "This invoice has no referrer to credit." };
  return { ok: true, state: next, already: false, credited: true };
}

export function refundPayment(
  db: AffiliateDb,
  coupons: CheckoutCoupon[],
  invoice: string,
  opts?: { now?: string; id?: string },
): Ok<{ reversed: boolean; coupons: CheckoutCoupon[] }> | Err {
  const payment = db.payments.find((item) => item.invoice_number === invoice);
  if (!payment) return { ok: false, error: "Invoice not found." };
  if (payment.status === "refunded") return { ok: false, error: "This payment is already refunded." };
  if (payment.status !== "completed") return { ok: false, error: "Only a completed payment can be refunded." };

  const next = clone(db);
  const stored = next.payments.find((item) => item.invoice_number === invoice)!;
  stored.status = "refunded";

  const buyer = next.users.find((user) => user.id === stored.buyer_id);
  if (buyer) {
    buyer.completed_payments = Math.max(0, buyer.completed_payments - 1);
    if (buyer.completed_payments === 0) buyer.plan = null;
    if (stored.gateway === "referral_balance") {
      buyer.referral_balance_usd = money(buyer.referral_balance_usd + stored.paid_usd);
    }
  }

  let nextCoupons = coupons;
  if (stored.coupon_code) {
    const index = coupons.findIndex(
      (coupon) => coupon.code.trim().toLowerCase() === stored.coupon_code!.trim().toLowerCase() && coupon.used > 0,
    );
    if (index >= 0) {
      nextCoupons = coupons.map((coupon, couponIndex) =>
        couponIndex === index ? { ...coupon, used: coupon.used - 1 } : coupon,
      );
    }
  }

  const credit = next.ledger.find(
    (event) => event.kind === "referral_commission_credit" && event.invoice_number === invoice,
  );
  const alreadyReversed = next.ledger.some(
    (event) => event.kind === "referral_commission_reversal" && event.invoice_number === invoice,
  );
  if (!credit || alreadyReversed) return { ok: true, state: next, reversed: false, coupons: nextCoupons };

  const referrer = next.users.find((user) => user.id === credit.referrer_user_id);
  if (referrer) referrer.referral_balance_usd = money(referrer.referral_balance_usd - credit.commission_amount_usd);
  next.ledger = [
    {
      id: opts?.id ?? `rev-${invoice.toLowerCase()}`,
      kind: "referral_commission_reversal",
      referrer_user_id: credit.referrer_user_id,
      buyer_id: credit.buyer_id,
      invoice_number: invoice,
      commission_percent: credit.commission_percent,
      commission_amount_usd: credit.commission_amount_usd,
      payment_base_amount: credit.payment_base_amount,
      payment_currency: credit.payment_currency,
      created_at: opts?.now ?? new Date().toISOString(),
    },
    ...next.ledger,
  ];
  return { ok: true, state: next, reversed: true, coupons: nextCoupons };
}

export function requestWithdrawal(
  db: AffiliateDb,
  input: { userId: string; amountUsd: number; paymentMethod: PayoutMethod; accountNumber: string; note: string },
  opts?: { now?: string; id?: string },
): Ok<{ id: string }> | Err {
  const user = db.users.find((item) => item.id === input.userId);
  if (!user) return { ok: false, error: "Account not found." };
  if (!PAYOUT_METHODS.some((method) => method.id === input.paymentMethod)) {
    return { ok: false, error: "Choose a payout method." };
  }
  const account = input.accountNumber.trim();
  if (!account) return { ok: false, error: "Account number is required." };
  const amount = money(input.amountUsd);
  if (!Number.isFinite(input.amountUsd) || amount <= 0) return { ok: false, error: "Enter an amount above zero." };
  if (amount + 0.001 < db.settings.min_withdraw_usd) {
    return { ok: false, error: `Amount must be at least ${formatUsd(db.settings.min_withdraw_usd)}.` };
  }
  const available = spendableBalance(db, user.id);
  if (amount > available + 0.001) {
    return { ok: false, error: `Amount cannot be more than ${formatUsd(available)}.` };
  }
  const next = clone(db);
  const id = opts?.id ?? `wd-${Math.random().toString(36).slice(2, 8)}`;
  next.withdrawals = [
    {
      id,
      user_id: input.userId,
      amount_usd: amount,
      payment_method: input.paymentMethod,
      account_number: account,
      note: input.note.trim() ? input.note.trim() : null,
      status: "pending",
      processed_at: null,
      processed_by: null,
      created_at: opts?.now ?? new Date().toISOString(),
    },
    ...next.withdrawals,
  ];
  return { ok: true, state: next, id };
}

export function decideWithdrawal(
  db: AffiliateDb,
  input: { id: string; decision: "approved" | "rejected"; processedBy: string },
  opts?: { now?: string },
): Ok | Err {
  const current = db.withdrawals.find((item) => item.id === input.id);
  if (!current) return { ok: false, error: "Withdrawal not found." };
  if (current.status !== "pending") return { ok: false, error: "This request is no longer pending." };
  const next = clone(db);
  const request = next.withdrawals.find((item) => item.id === input.id)!;
  if (input.decision === "approved") {
    const user = next.users.find((item) => item.id === request.user_id);
    if (!user || user.referral_balance_usd + 0.001 < request.amount_usd) {
      return { ok: false, error: "Balance no longer covers this withdrawal." };
    }
    user.referral_balance_usd = money(user.referral_balance_usd - request.amount_usd);
    request.status = "approved";
  } else {
    request.status = "rejected";
  }
  request.processed_at = opts?.now ?? new Date().toISOString();
  request.processed_by = input.processedBy;
  return { ok: true, state: next };
}

export type EarningRow = {
  buyerId: string;
  name: string;
  email: string;
  netUsd: number;
  refunded: boolean;
};

export function earningsFor(db: AffiliateDb, referrerId: string): EarningRow[] {
  const grouped = new Map<string, { credit: number; reversal: number }>();
  for (const event of db.ledger) {
    if (event.referrer_user_id !== referrerId) continue;
    const row = grouped.get(event.buyer_id) ?? { credit: 0, reversal: 0 };
    if (event.kind === "referral_commission_credit") row.credit += event.commission_amount_usd;
    if (event.kind === "referral_commission_reversal") row.reversal += event.commission_amount_usd;
    grouped.set(event.buyer_id, row);
  }
  return [...grouped.entries()].map(([buyerId, row]) => {
    const buyer = db.users.find((user) => user.id === buyerId);
    const net = money(row.credit - row.reversal);
    return {
      buyerId,
      name: buyer?.name ?? "Removed account",
      email: buyer?.email ?? "—",
      netUsd: net,
      refunded: row.credit > 0 && net <= 0,
    };
  });
}

export function netEarnings(db: AffiliateDb, referrerId: string) {
  const total = db.ledger.reduce((sum, event) => {
    if (event.referrer_user_id !== referrerId) return sum;
    if (event.kind === "referral_commission_credit") return sum + event.commission_amount_usd;
    return sum - event.commission_amount_usd;
  }, 0);
  return money(total);
}

export function referredBuyerCount(db: AffiliateDb, referrerId: string) {
  return db.users.filter((user) => user.referred_by === referrerId).length;
}

export function paymentCredited(db: AffiliateDb, invoice: string) {
  return db.ledger.some((event) => event.kind === "referral_commission_credit" && event.invoice_number === invoice);
}

export function sharePath(code: string) {
  return `/register?ref=${encodeURIComponent(code)}`;
}

export function demoAffiliates(): AffiliateDb {
  const settings = defaultSettings();
  const nusrat = blankUser({ id: "u1", name: "Nusrat Rahman", email: "nusrat@example.com", code: "nusratrahman", savedRef: null });
  const imran = blankUser({ id: "u2", name: "Imran Hossain", email: "imran@example.com", code: "imranhossain", savedRef: "nusratrahman" });
  const maya = blankUser({ id: "u3", name: "Maya Chowdhury", email: "maya@example.com", code: "mayachowdhury", savedRef: null });
  const farhan = blankUser({ id: "u4", name: "Farhan Kabir", email: "farhan@example.com", code: "farhankabir", savedRef: "nusratrahman" });

  imran.referred_by = "u1";
  imran.completed_payments = 1;
  imran.referred_commission_until = "2028-10-18T10:42:00.000Z";
  imran.plan = "Monthly plan";
  farhan.completed_payments = 1;
  farhan.plan = "Studio plan";
  nusrat.referral_balance_usd = 2.05;

  const imranPayment: AffiliatePayment = {
    invoice_number: "INV-1041",
    buyer_id: "u2",
    item: "Monthly plan",
    list_price: 2500,
    paid_amount: 2250,
    currency: "BDT",
    status: "completed",
    gateway: "paystation",
    coupon_code: null,
    paid_usd: toUsd(2250, "BDT", settings.usd_conversion_rate),
    session: { code: "nusratrahman", referrer_user_id: "u1", discount_percent: 10 },
    created_at: "2026-10-18T10:42:00.000Z",
  };
  const missed: AffiliatePayment = {
    invoice_number: "INV-1034",
    buyer_id: "u4",
    item: "Studio plan",
    list_price: 29,
    paid_amount: 29,
    currency: "USD",
    status: "completed",
    gateway: "paystation",
    coupon_code: null,
    paid_usd: 29,
    session: { code: "nusratrahman", referrer_user_id: "u1", discount_percent: 10 },
    created_at: "2026-10-15T07:20:00.000Z",
  };

  return {
    settings,
    users: [nusrat, imran, maya, farhan],
    withdrawals: [
      {
        id: "wd-demo",
        user_id: "u1",
        amount_usd: 1,
        payment_method: "bkash",
        account_number: "01711000000",
        note: null,
        status: "pending",
        processed_at: null,
        processed_by: null,
        created_at: "2026-10-19T08:00:00.000Z",
      },
    ],
    ledger: [
      {
        id: "led-1041",
        kind: "referral_commission_credit",
        referrer_user_id: "u1",
        buyer_id: "u2",
        invoice_number: "INV-1041",
        commission_percent: 10,
        commission_amount_usd: 2.05,
        payment_base_amount: 2250,
        payment_currency: "BDT",
        created_at: "2026-10-18T10:42:00.000Z",
      },
    ],
    payments: [imranPayment, missed],
  };
}
