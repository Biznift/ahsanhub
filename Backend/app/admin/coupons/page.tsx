"use client";

import { FormEvent, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { taka, type CouponType, useStore } from "@/components/store";
import { Badge, Button, Field, SelectInput, TextInput } from "@/components/ui";

export default function CouponsPage() {
  const module = moduleBySlug("coupons");
  const { coupons, addCoupon, toggleCoupon, deleteCoupon } = useStore();
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponType>("percent");
  const [value, setValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [error, setError] = useState<string | null>(null);

  function create(event: FormEvent) {
    event.preventDefault();
    const amount = Number(value);
    if (!code.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Add a code and a value above zero.");
      return;
    }
    if (type === "percent" && amount > 100) {
      setError("A percent coupon cannot be over 100.");
      return;
    }
    const uses = maxUses.trim() ? Number(maxUses) : null;
    if (uses != null && (!Number.isInteger(uses) || uses < 1)) {
      setError("Max uses needs to be a whole number above zero.");
      return;
    }
    const message = addCoupon({ code, type, value: amount, maxUses: uses });
    if (message) {
      setError(message);
      return;
    }
    setCode("");
    setValue("10");
    setMaxUses("");
    setError(null);
  }

  return (
    <ModuleFrame module={module}>
      <div className="space-y-4">
        <form onSubmit={create} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:grid-cols-4">
          <Field label="Code">
            <TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder="LAUNCH25" />
          </Field>
          <Field label="Type">
            <SelectInput value={type} onChange={(event) => setType(event.target.value as CouponType)}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed ৳</option>
            </SelectInput>
          </Field>
          <Field label="Value">
            <TextInput value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Max uses">
            <TextInput value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="Unlimited" />
          </Field>
          <div className="md:col-span-4 flex items-center justify-between gap-3">
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : <span />}
            <Button type="submit">Create coupon</Button>
          </div>
        </form>
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Used</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{coupon.code}</td>
                  <td className="px-4 py-3">{coupon.type === "percent" ? `${coupon.value}%` : taka(coupon.value)}</td>
                  <td className="px-4 py-3">
                    {coupon.used}
                    {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={coupon.active ? "ok" : "muted"}>{coupon.active ? "active" : "paused"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button type="button" tone="ghost" onClick={() => toggleCoupon(coupon.id)}>
                        {coupon.active ? "Pause" : "Activate"}
                      </Button>
                      <Button type="button" tone="danger" onClick={() => deleteCoupon(coupon.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleFrame>
  );
}
