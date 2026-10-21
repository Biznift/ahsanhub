"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Desk } from "@/components/desk";
import { useStore } from "@/components/store";
import { classifyCode, formatMoney, formatUsd, quoteCheckout, rememberReferralCode, type Currency } from "@/lib/referrals";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";

const PLANS = [
  { id: "monthly", item: "Monthly plan", listPrice: 2500, currency: "BDT" as const },
  { id: "brand", item: "Brand kit", listPrice: 15000, currency: "BDT" as const },
  { id: "studio", item: "Studio plan", listPrice: 29, currency: "USD" as const },
];

function CheckoutForm() {
  const params = useSearchParams();
  const { affiliates, coupons, users, checkout } = useStore();
  const [buyerId, setBuyerId] = useState("u2");
  const [planId, setPlanId] = useState(PLANS[0].id);
  const [listPrice, setListPrice] = useState(String(PLANS[0].listPrice));
  const [currency, setCurrency] = useState<Currency>(PLANS[0].currency);
  const [draft, setDraft] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [refTouched, setRefTouched] = useState(false);
  const [useBalance, setUseBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromLink = rememberReferralCode(params.get("ref"));
    if (refTouched) return;
    const buyer = affiliates.users.find((user) => user.id === buyerId);
    if (!buyer || buyer.completed_payments > 0) {
      setReferralCode(null);
      return;
    }
    setReferralCode(fromLink || buyer?.saved_ref || null);
  }, [params, buyerId, refTouched, affiliates.users]);

  function choosePlan(nextId: string) {
    const plan = PLANS.find((item) => item.id === nextId) ?? PLANS[0];
    setPlanId(plan.id);
    setListPrice(String(plan.listPrice));
    setCurrency(plan.currency);
  }

  const buyer = affiliates.users.find((user) => user.id === buyerId) ?? null;
  const account = users.find((user) => user.id === buyerId);
  const disabledAccount = account?.status === "disabled";
  const price = Number(listPrice);
  const quote = useMemo(() => {
    if (!buyer) return { ok: false as const, error: "Choose a customer." };
    return quoteCheckout(affiliates, coupons, {
      buyerId,
      listPrice: price,
      currency,
      couponCode,
      referralCode,
      useReferralBalance: useBalance,
    });
  }, [affiliates, coupons, buyer, buyerId, price, currency, couponCode, referralCode, useBalance]);

  const plan = PLANS.find((item) => item.id === planId) ?? PLANS[0];

  function pay(event: FormEvent, outcome: "completed" | "failed") {
    event.preventDefault();
    const message = checkout({
      buyerId,
      item: plan.item,
      listPrice: price,
      currency,
      couponCode,
      referralCode,
      useReferralBalance: useBalance,
      outcome,
    });
    setError(message);
  }

  return (
    <Desk
      title="Checkout"
      lede="One code box accepts a coupon or a referral code. Coupons win. A referral discount applies only on the first completed purchase, and never together with a balance payment."
    >
      <form onSubmit={(event) => pay(event, "completed")} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-5">
          <Field label="Customer">
            <SelectInput
              value={buyerId}
              onChange={(event) => {
                setBuyerId(event.target.value);
                setRefTouched(false);
                setCouponCode(null);
              }}
            >
              {affiliates.users.map((user) => {
                const status = users.find((account) => account.id === user.id)?.status;
                return (
                <option key={user.id} value={user.id}>
                  {user.name}
                  {status === "disabled" ? " · disabled" : ""} · {user.completed_payments} paid · {formatUsd(user.referral_balance_usd)}
                </option>
                );
              })}
            </SelectInput>
          </Field>
          <Field label="Plan">
            <SelectInput value={planId} onChange={(event) => choosePlan(event.target.value)}>
              {PLANS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price">
              <TextInput value={listPrice} onChange={(event) => setListPrice(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Currency">
              <SelectInput value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
                <option value="BDT">BDT</option>
                <option value="USD">USD</option>
              </SelectInput>
            </Field>
          </div>
          <Field label="Coupon or referral code">
            <div className="flex gap-2">
              <TextInput
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="WELCOME10 or a referral code"
                className="mono"
              />
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  const result = classifyCode(affiliates, coupons, draft, buyerId);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setError(null);
                  setDraft("");
                  if (result.kind === "coupon") setCouponCode(result.coupon.code);
                  else {
                    setRefTouched(true);
                    setReferralCode(result.code);
                  }
                }}
              >
                Apply
              </Button>
            </div>
          </Field>
          <div className="flex flex-wrap gap-2 text-sm">
            {couponCode && (
              <button type="button" className="rounded-full bg-[#f3f9f6] px-3 py-1" onClick={() => setCouponCode(null)}>
                Coupon {couponCode} ×
              </button>
            )}
            {referralCode && (
              <button
                type="button"
                className="rounded-full bg-[#f3f9f6] px-3 py-1"
                onClick={() => {
                  setRefTouched(true);
                  setReferralCode(null);
                }}
              >
                Referral {referralCode} ×
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-[#344054]">
            <input type="checkbox" checked={useBalance} onChange={(event) => setUseBalance(event.target.checked)} />
            Pay with referral balance
          </label>
          {disabledAccount && <p className="text-sm text-[var(--danger)]">This account is disabled.</p>}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!quote.ok || disabledAccount}>
              {useBalance ? "Pay with balance" : "Pay with PayStation"}
            </Button>
            {!useBalance && (
              <Button type="button" tone="ghost" disabled={!quote.ok || disabledAccount} onClick={(event) => pay(event, "failed")}>
                Record a failed charge
              </Button>
            )}
          </div>
        </div>
        <aside className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5 text-sm">
          <h2>Quote</h2>
          {quote.ok ? (
            <dl className="space-y-2">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Coupon off</dt>
                <dd>{formatMoney(quote.quote.couponOff, currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Referral off</dt>
                <dd>
                  {formatMoney(quote.quote.referralOff, currency)}
                  {quote.quote.session.discount_percent ? ` · ${quote.quote.session.discount_percent}%` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-3 font-semibold">
                <dt>Due</dt>
                <dd>{formatMoney(quote.quote.payable, currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">USD value</dt>
                <dd>{formatUsd(quote.quote.priceUsd)}</dd>
              </div>
              <div className="text-xs text-[var(--muted)]">
                {quote.quote.session.referrer_user_id
                  ? `Referrer ${affiliates.users.find((user) => user.id === quote.quote.session.referrer_user_id)?.name ?? quote.quote.session.code}`
                  : "No referrer on this checkout"}
                {referralCode && useBalance ? ". Balance payment skips the referral discount." : ""}
              </div>
            </dl>
          ) : (
            <p className="text-[var(--danger)]">{quote.error}</p>
          )}
        </aside>
      </form>
    </Desk>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Opening checkout…</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
