"use client";

import { useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { type OrderStatus, useStore } from "@/components/store";
import { formatMoney } from "@/lib/referrals";
import { Badge, Button } from "@/components/ui";

const FILTERS: Array<OrderStatus | "all"> = ["all", "pending", "paid", "cancelled"];

export default function OrdersPage() {
  const module = moduleBySlug("orders");
  const { orders, setOrderStatus } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const shown = orders.filter((order) => filter === "all" || order.status === filter);

  return (
    <ModuleFrame module={module}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                filter === item ? "bg-[var(--ink)] text-[var(--lime)]" : "border border-[var(--line)] bg-[var(--card)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {shown.map((order) => (
                <tr key={order.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">#{order.number}</div>
                    <div className="text-xs text-[var(--muted)]">{order.item} · {order.createdAt}</div>
                  </td>
                  <td className="px-4 py-3">{order.customer}</td>
                  <td className="px-4 py-3">{formatMoney(order.amount, order.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={order.status === "paid" ? "ok" : order.status === "pending" ? "warn" : "danger"}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button type="button" tone="ghost" disabled={order.status !== "pending"} onClick={() => setOrderStatus(order.id, "paid")}>
                        Mark paid
                      </Button>
                      <Button type="button" tone="danger" disabled={order.status === "cancelled"} onClick={() => setOrderStatus(order.id, "cancelled")}>
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                    Nothing in this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleFrame>
  );
}
