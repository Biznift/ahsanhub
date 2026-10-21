"use client";

import { FormEvent, useEffect, useState } from "react";
import { Desk } from "@/components/desk";
import { useStore } from "@/components/store";
import {
  BUYER_STORAGE_KEY,
  PAYOUT_METHODS,
  earningsFor,
  effectiveCommission,
  effectiveDiscount,
  formatUsd,
  netEarnings,
  referredBuyerCount,
  sharePath,
  spendableBalance,
  type PayoutMethod,
} from "@/lib/referrals";
import { Badge, Button, Field, SelectInput, TextInput } from "@/components/ui";

export default function MemberReferralsPage() {
  const { affiliates, saveReferralCode, askWithdrawal } = useStore();
  const [buyerId, setBuyerId] = useState("u1");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayoutMethod>("bkash");
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = sessionStorage.getItem(BUYER_STORAGE_KEY);
    if (saved && affiliates.users.some((user) => user.id === saved)) setBuyerId(saved);
  }, [affiliates.users]);

  const user = affiliates.users.find((item) => item.id === buyerId) ?? affiliates.users[0];

  useEffect(() => {
    if (user) setCode(user.referral_code);
  }, [user]);

  if (!user) {
    return (
      <Desk title="Referrals" lede="Create an account to get a code.">
        <p className="text-sm text-[var(--muted)]">No accounts yet.</p>
      </Desk>
    );
  }

  const shareUrl = `${origin}${sharePath(user.referral_code)}`;
  const earnings = earningsFor(affiliates, user.id);
  const requests = affiliates.withdrawals.filter((item) => item.user_id === user.id);
  const available = spendableBalance(affiliates, user.id);
  const reserved = Math.max(0, user.referral_balance_usd - available);

  function saveCode(event: FormEvent) {
    event.preventDefault();
    setFlash(null);
    setError(saveReferralCode(user.id, code));
  }

  function withdraw(event: FormEvent) {
    event.preventDefault();
    const message = askWithdrawal({
      userId: user.id,
      amountUsd: Number(amount),
      paymentMethod: method,
      accountNumber: account,
      note,
    });
    setFlash(null);
    setError(message);
    if (!message) {
      setAmount("");
      setAccount("");
      setNote("");
      setFlash("Withdrawal request submitted");
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setError(null);
      setFlash("Copied");
    } catch {
      setFlash(null);
      setError("Could not copy that.");
    }
  }

  return (
    <Desk
      title="Referrals"
      lede="Balance, share link, and withdrawals for the selected account. A request stays pending until an admin approves it."
    >
      <div className="space-y-4">
        <Field label="Acting as">
          <SelectInput
            value={user.id}
            onChange={(event) => {
              setBuyerId(event.target.value);
              sessionStorage.setItem(BUYER_STORAGE_KEY, event.target.value);
              setError(null);
            }}
          >
            {affiliates.users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {flash && <p className="text-sm text-[#1f6b3a]">{flash}</p>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Available balance", formatUsd(available)],
            ["All-time net", formatUsd(netEarnings(affiliates, user.id))],
            ["Commission", `${effectiveCommission(user, affiliates.settings)}%`],
            ["Referred buyers", String(referredBuyerCount(affiliates, user.id))],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</div>
              <div className="mt-1 text-2xl font-semibold text-[#1d2939]">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={saveCode} className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2>Code</h2>
            <p className="text-sm text-[var(--muted)]">
              Buyers get {effectiveDiscount(user, affiliates.settings)}% off the first purchase. You earn{" "}
              {effectiveCommission(user, affiliates.settings)}%.
            </p>
            <Field label="Referral code">
              <TextInput value={code} onChange={(event) => setCode(event.target.value)} className="mono" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit">Save code</Button>
              <Button type="button" tone="ghost" onClick={() => copy(user.referral_code)}>
                Copy code
              </Button>
            </div>
            <Field label="Share link">
              <TextInput readOnly value={shareUrl} className="mono" />
            </Field>
            <Button type="button" tone="ghost" onClick={() => copy(shareUrl)}>
              Copy link
            </Button>
          </form>

          <form onSubmit={withdraw} className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2>Withdraw</h2>
            <p className="text-sm text-[var(--muted)]">
              Minimum {formatUsd(affiliates.settings.min_withdraw_usd)} · available {formatUsd(available)}
              {reserved > 0.001 ? ` · ${formatUsd(reserved)} already requested` : ""}
            </p>
            <Field label="Amount (USD)">
              <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Method">
                <SelectInput value={method} onChange={(event) => setMethod(event.target.value as PayoutMethod)}>
                  {PAYOUT_METHODS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Account number">
                <TextInput value={account} onChange={(event) => setAccount(event.target.value)} placeholder="Wallet or account" />
              </Field>
            </div>
            <Field label="Note">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-20 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-base outline-none ring-[var(--ink)] focus:ring-2"
                placeholder="Optional"
              />
            </Field>
            <Button type="submit">Submit request</Button>
          </form>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2>Earnings</h2>
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {earnings.map((row) => (
                <li key={row.buyerId} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-[var(--muted)]">{row.email}</div>
                  </div>
                  {row.refunded ? (
                    <Badge tone="warn">Refunded</Badge>
                  ) : (
                    <span className="font-semibold text-[#1f6b3a]">+{formatUsd(row.netUsd)}</span>
                  )}
                </li>
              ))}
              {earnings.length === 0 && <li className="py-6 text-sm text-[var(--muted)]">No earnings yet.</li>}
            </ul>
          </section>
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2>Withdrawal history</h2>
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {requests.map((request) => (
                <li key={request.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="font-medium">{formatUsd(request.amount_usd)}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {PAYOUT_METHODS.find((item) => item.id === request.payment_method)?.label} ·{" "}
                      {new Date(request.created_at).toLocaleDateString()}
                      {request.note ? ` · ${request.note}` : ""}
                    </div>
                  </div>
                  <Badge tone={request.status === "approved" ? "ok" : request.status === "rejected" ? "danger" : "warn"}>
                    {request.status}
                  </Badge>
                </li>
              ))}
              {requests.length === 0 && <li className="py-6 text-sm text-[var(--muted)]">No withdrawals yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </Desk>
  );
}
