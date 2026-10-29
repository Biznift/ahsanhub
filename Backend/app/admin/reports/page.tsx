"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { Button, cn } from "@/components/ui";
import { Empty, StatusPill, api, formatDate, useApi } from "@/components/admin-kit";
import { REPORT_REASON_LABEL, type ReportReason, type ReportStatus } from "@/lib/reports";

type Report = {
  id: string;
  reason: ReportReason;
  body: string;
  email: string;
  status: ReportStatus;
  createdAt: string;
  openCount: number;
  listing: { id: string; name: string; slug: string };
};

const TABS: { id: ReportStatus | ""; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "reviewed", label: "Reviewed" },
  { id: "actioned", label: "Actioned" },
  { id: "dismissed", label: "Dismissed" },
  { id: "", label: "All" },
];

export default function ReportsPage() {
  const module = moduleBySlug("reports");
  const { notify } = useStore();
  const [status, setStatus] = useState<ReportStatus | "">("open");
  const { data, setData } = useApi<{ items: Report[] }>(`/api/admin/reports${status ? `?status=${status}` : ""}`);

  async function setReport(report: Report, next: ReportStatus) {
    await api(`/api/admin/reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    setData((current) => current && { items: current.items.map((item) => (item.id === report.id ? { ...item, status: next } : item)).filter((item) => !status || item.status === status) });
    notify(`Report ${next}`);
  }

  async function remove(report: Report) {
    if (!window.confirm("Delete this report?")) return;
    await api(`/api/admin/reports/${report.id}`, { method: "DELETE" });
    setData((current) => current && { items: current.items.filter((item) => item.id !== report.id) });
  }

  return (
    <ModuleFrame module={module}>
      <div className="flex w-fit max-w-full flex-wrap rounded-lg border border-[#e6e8ef] bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id || "all"}
            type="button"
            onClick={() => setStatus(tab.id)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium", status === tab.id ? "bg-[#0b6e4f] text-white" : "text-[#475467] hover:bg-[#f5f6fa]")}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {data?.items.length === 0 && <Empty>No reports here.</Empty>}
        {data?.items.map((report) => (
          <article key={report.id} className="rounded-xl border border-[#e6e8ef] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#1d2939]">{REPORT_REASON_LABEL[report.reason]}</span>
              <span className="text-sm text-[#667085]">
                on{" "}
                <Link href={`/admin/listings/${report.listing.id}`} className="font-medium text-[#0b6e4f]">
                  {report.listing.name}
                </Link>{" "}
                · {formatDate(report.createdAt)}
              </span>
              {report.openCount > 1 && <span className="text-xs font-semibold text-[#9a5b00]">{report.openCount} open on this listing</span>}
              <span className="ml-auto">
                <StatusPill status={report.status} />
              </span>
            </div>
            {report.email && (
              <a href={`mailto:${report.email}`} className="mt-1 inline-block text-sm text-[#475467]">
                {report.email}
              </a>
            )}
            <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-[#344054]">{report.body}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {report.status !== "reviewed" && (
                <Button type="button" tone="ghost" className="px-3 py-1.5 text-sm" onClick={() => setReport(report, "reviewed")}>
                  Reviewed
                </Button>
              )}
              {report.status !== "actioned" && (
                <Button type="button" className="px-3 py-1.5 text-sm" onClick={() => setReport(report, "actioned")}>
                  Actioned
                </Button>
              )}
              {report.status !== "dismissed" && (
                <Button type="button" tone="ghost" className="px-3 py-1.5 text-sm" onClick={() => setReport(report, "dismissed")}>
                  Dismiss
                </Button>
              )}
              <button type="button" aria-label="Delete report" onClick={() => remove(report)} className="ml-auto rounded-md p-2 text-[#b42318] hover:bg-[#fdecea]">
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </ModuleFrame>
  );
}
