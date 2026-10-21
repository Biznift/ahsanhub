"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import {
  PAYOUT_METHODS,
  effectiveCommission,
  effectiveDiscount,
  effectiveDuration,
  formatMoney,
  formatUsd,
  paymentCredited,
  type ReferralSettings,
} from "@/lib/referrals";
import { Badge, Button, Field, TextInput } from "@/components/ui";

function blankNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return Number(text);
}

export default function AffiliatesPage() {
  const module = moduleBySlug("affiliates");
  const {
    affiliates,
    saveReferralSettings,
    saveUserReferralRates,
    creditInvoice,
    refundInvoice,
    decideWithdrawal,
  } = useStore();
  const [draft, setDraft] = useState<ReferralSettings>(affiliates.settings);
  const [error, setError] = useState<string | null>(null);
  const [payoutFilter, setPayoutFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  useEffect(() => {
    setDraft(affiliates.settings);
  }, [affiliates.settings]);

  function saveSettings(event: FormEvent) {
    event.preventDefault();
    setError(saveReferralSettings(draft));
  }

  function saveRates(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(
      saveUserReferralRates(userId, {
        commission: blankNumber(data.get("commission")),
        discount: blankNumber(data.get("discount")),
        durationMonths: blankNumber(data.get("duration")),
      }),
    );
  }

  const payouts = affiliates.withdrawals.filter((item) => payoutFilter === "all" || item.status === payoutFilter);

  return (
    <ModuleFrame module={module}>
      <div className="space-y-8">
        <p className="text-sm text-[#475467]">
          <Link href="/dashboard/referrals" className="font-medium text-[#0b6e4f] hover:underline">
            Member desk
          </Link>
          <span className="mx-2 text-[#d0d5dd]">/</span>
          <Link href="/checkout" className="font-medium text-[#0b6e4f] hover:underline">
            Checkout
          </Link>
          <span className="mx-2 text-[#d0d5dd]">/</span>
          <Link href="/register" className="font-medium text-[#0b6e4f] hover:underline">
            Register
          </Link>
          <span className="mt-2 block">
            PayStation does not create discount codes. Checkout applies the referral percent, and every balance is USD.
          </span>
        </p>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <section className="space-y-3">
          <h2>Defaults</h2>
          <form onSubmit={saveSettings} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:grid-cols-2">
            <Field label="Default commission %">
              <TextInput
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={draft.default_commission_percent}
                onChange={(event) => setDraft({ ...draft, default_commission_percent: Number(event.target.value) })}
              />
            </Field>
            <Field label="Default buyer discount %">
              <TextInput
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={draft.default_discount_percent}
                onChange={(event) => setDraft({ ...draft, default_discount_percent: Number(event.target.value) })}
              />
            </Field>
            <Field label="Commission duration (months)">
              <TextInput
                type="number"
                min={0}
                step="1"
                value={draft.default_commission_duration_months}
                onChange={(event) => setDraft({ ...draft, default_commission_duration_months: Number(event.target.value) })}
              />
            </Field>
            <Field label="Minimum withdrawal (USD)">
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={draft.min_withdraw_usd}
                onChange={(event) => setDraft({ ...draft, min_withdraw_usd: Number(event.target.value) })}
              />
            </Field>
            <Field label="BDT per 1 USD">
              <TextInput
                type="number"
                min={0.0001}
                step="0.01"
                value={draft.usd_conversion_rate}
                onChange={(event) => setDraft({ ...draft, usd_conversion_rate: Number(event.target.value) })}
              />
            </Field>
            <div className="flex items-end justify-end">
              <Button type="submit">Save settings</Button>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <h2>Accounts</h2>
          <p className="text-sm text-[var(--muted)]">Leave a rate blank to use the default. 0 is a real zero.</p>
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)]">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Commission %</th>
                  <th className="px-4 py-3 font-medium">Discount %</th>
                  <th className="px-4 py-3 font-medium">Months</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {affiliates.users.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--line)] align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-[var(--muted)]">{user.referral_code}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {user.referred_by
                          ? `Referred by ${affiliates.users.find((item) => item.id === user.referred_by)?.name ?? "unknown"}`
                          : "No referrer yet"}
                        {user.referred_commission_until
                          ? ` · until ${new Date(user.referred_commission_until).toLocaleDateString()}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatUsd(user.referral_balance_usd)}</td>
                    <td className="px-4 py-3" colSpan={4}>
                      <form
                        key={`${user.id}-${user.referral_commission_rate}-${user.referral_discount_rate}-${user.referral_commission_duration_months}`}
                        onSubmit={(event) => saveRates(event, user.id)}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2"
                      >
                        <TextInput
                          name="commission"
                          inputMode="decimal"
                          placeholder={String(effectiveCommission(user, affiliates.settings))}
                          defaultValue={user.referral_commission_rate ?? ""}
                          aria-label={`Commission for ${user.name}`}
                        />
                        <TextInput
                          name="discount"
                          inputMode="decimal"
                          placeholder={String(effectiveDiscount(user, affiliates.settings))}
                          defaultValue={user.referral_discount_rate ?? ""}
                          aria-label={`Discount for ${user.name}`}
                        />
                        <TextInput
                          name="duration"
                          inputMode="numeric"
                          placeholder={String(effectiveDuration(user, affiliates.settings))}
                          defaultValue={user.referral_commission_duration_months ?? ""}
                          aria-label={`Duration for ${user.name}`}
                        />
                        <Button type="submit" tone="ghost">
                          Save
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2>Payments</h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {affiliates.payments.map((payment) => {
                  const buyer = affiliates.users.find((user) => user.id === payment.buyer_id);
                  const credited = paymentCredited(affiliates, payment.invoice_number);
                  return (
                    <tr key={payment.invoice_number} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{payment.invoice_number}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {payment.item}
                          {payment.gateway ? ` · ${payment.gateway}` : ""}
                          {payment.session.code ? ` · ${payment.session.code}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">{buyer?.name ?? "Removed account"}</td>
                      <td className="px-4 py-3">{formatMoney(payment.paid_amount, payment.currency)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={payment.status === "completed" ? "ok" : payment.status === "refunded" ? "warn" : "danger"}>
                          {payment.status}
                        </Badge>
                        {payment.status === "completed" && (
                          <div className="mt-1 text-xs text-[var(--muted)]">{credited ? "Commission posted" : "Commission missing"}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {payment.status === "completed" && !credited && (
                            <Button type="button" tone="ghost" onClick={() => setError(creditInvoice(payment.invoice_number))}>
                              Credit
                            </Button>
                          )}
                          {payment.status === "completed" && (
                            <Button type="button" tone="danger" onClick={() => setError(refundInvoice(payment.invoice_number))}>
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {affiliates.payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2>Withdrawals</h2>
          <div className="flex flex-wrap gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((status) => (
              <Button key={status} type="button" tone={payoutFilter === status ? "primary" : "ghost"} onClick={() => setPayoutFilter(status)}>
                {status}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Payout</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {payouts.map((request) => {
                  const user = affiliates.users.find((item) => item.id === request.user_id);
                  const method = PAYOUT_METHODS.find((item) => item.id === request.payment_method)?.label ?? request.payment_method;
                  return (
                    <tr key={request.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user?.name ?? "Removed account"}</div>
                        <div className="text-xs text-[var(--muted)]">{new Date(request.created_at).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3">{formatUsd(request.amount_usd)}</td>
                      <td className="px-4 py-3">
                        <div>{method}</div>
                        <div className="text-xs text-[var(--muted)]">{request.account_number}</div>
                        {request.note && <div className="text-xs text-[var(--muted)]">{request.note}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={request.status === "approved" ? "ok" : request.status === "rejected" ? "danger" : "warn"}>
                          {request.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {request.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button type="button" tone="ghost" onClick={() => setError(decideWithdrawal(request.id, "approved"))}>
                              Approve
                            </Button>
                            <Button type="button" tone="danger" onClick={() => setError(decideWithdrawal(request.id, "rejected"))}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                      No {payoutFilter === "all" ? "withdrawals" : `${payoutFilter} withdrawals`}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ModuleFrame>
  );
}
