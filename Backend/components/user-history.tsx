"use client";

import { Eye, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildUserHistory, type HistoryItem } from "@/lib/history";
import { formatWhen } from "@/lib/crm";
import { useStore } from "@/components/store";
import { Badge } from "@/components/ui";

export function HistoryButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title={`View ${name}`}
        aria-label={`View history for ${name}`}
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 rounded-md p-1 text-[#98a2b3] hover:bg-[#e7f3ee] hover:text-[#0b6e4f]"
      >
        <Eye size={15} />
      </button>
      {open && <HistoryDrawer userId={userId} onClose={() => setOpen(false)} />}
    </>
  );
}

function HistoryDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { users, affiliates, orders, mails, campaigns, activity } = useStore();
  const history = useMemo(
    () =>
      buildUserHistory({
        user: users.find((user) => user.id === userId),
        profile: affiliates.users.find((user) => user.id === userId),
        orders,
        payments: affiliates.payments,
        mails,
        campaigns,
        ledger: affiliates.ledger,
        withdrawals: affiliates.withdrawals,
        activity,
        people: users.map((user) => ({ id: user.id, name: user.name })),
      }),
    [userId, users, affiliates, orders, mails, campaigns, activity],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-[#101828]/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label={history ? `${history.name} history` : "History"}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e6e8ef] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1d2939]">{history?.name ?? "Person"}</h2>
            <p className="text-sm text-[#667085]">{history?.email ?? "This person is no longer in the list."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close history" className="rounded-md p-1 text-[#667085] hover:bg-[#f5f6fa]">
            <X size={18} />
          </button>
        </div>
        {history && (
          <div className="space-y-5 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={history.accountStatus === "active" ? "ok" : "danger"}>{history.accountStatus}</Badge>
              <Badge tone="info">{history.packageName}</Badge>
              <Badge tone="muted">{history.role}</Badge>
            </div>
            <p className="text-sm text-[#475467]">
              Activity follows the {history.packageName} package. Purchases stay listed either way.
            </p>
            <div className="flex flex-wrap gap-1">
              {history.features.map((feature) => (
                <span key={feature} className="rounded-full bg-[#e7f3ee] px-2 py-0.5 text-[11px] font-medium text-[#0b6e4f]">
                  {feature}
                </span>
              ))}
            </div>
            <HistoryList title="Purchases" empty="No purchases yet." items={history.purchases} />
            <HistoryList title="Activity" empty="No activity for this package yet." items={history.activity} />
            {history.hidden.length > 0 && (
              <p className="text-xs text-[#667085]">Not on this package: {history.hidden.join(", ")}.</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function HistoryList({ title, empty, items }: { title: string; empty: string; items: HistoryItem[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-[#1d2939]">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-[#667085]">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[#eef0f4] rounded-xl border border-[#e6e8ef]">
          {items.map((row) => (
            <li key={row.id} className="px-3 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-[#1d2939]">{row.title}</span>
                {row.at && <span className="shrink-0 text-[11px] text-[#98a2b3]">{when(row.at)}</span>}
              </div>
              <p className="text-xs text-[#667085]">{row.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function when(value: string) {
  return Number.isNaN(Date.parse(value)) ? value : formatWhen(value);
}
