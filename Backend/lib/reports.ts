export const REPORT_REASONS = [
  { id: "not_halal", label: "Not halal" },
  { id: "halal_claim", label: "Halal claim looks wrong" },
  { id: "wrong_info", label: "Wrong or outdated info" },
  { id: "broken_link", label: "Broken or misleading link" },
  { id: "spam", label: "Spam or scam" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  not_halal: "Not halal",
  halal_claim: "Halal claim looks wrong",
  wrong_info: "Wrong or outdated info",
  broken_link: "Broken or misleading link",
  spam: "Spam or scam",
  other: "Something else",
};

export const REPORT_STATUSES = ["open", "reviewed", "dismissed", "actioned"] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];
