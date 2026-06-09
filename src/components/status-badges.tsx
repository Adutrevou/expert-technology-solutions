import { Badge } from "@/components/ui/badge";
import type { LeadStatus, CampaignStatus, MeetingStatus } from "@/lib/demo-data";
import type { CampaignApprovalStatus, CampaignLifecycleStatus, LeadQualification, LeadWorkflowStatus } from "@/lib/leads-api";

const LEAD: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-muted text-muted-foreground" },
  reviewed: { label: "Reviewed", cls: "bg-muted text-muted-foreground" },
  review: { label: "Review", cls: "bg-muted text-muted-foreground" },
  Researching: { label: "Raw company", cls: "bg-muted text-muted-foreground" },
  researching: { label: "Raw company", cls: "bg-muted text-muted-foreground" },
  "Raw company": { label: "Raw company", cls: "bg-muted text-muted-foreground" },
  raw_company: { label: "Raw company", cls: "bg-muted text-muted-foreground" },
  "Qualified company": { label: "Qualified company", cls: "bg-info/15 text-info border-info/30" },
  qualified_company: { label: "Qualified company", cls: "bg-info/15 text-info border-info/30" },
  "Manual review": { label: "Needs review", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  "manual review": { label: "Needs review", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  manual_review: { label: "Needs review", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  manual_review_required: { label: "Needs review", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  "Needs review": { label: "Needs review", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  needs_review: { label: "Needs review", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  skipped_quality_gate: { label: "Needs review", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  "Decision maker found": { label: "Decision maker found", cls: "bg-info/15 text-info border-info/30" },
  decision_maker_found: { label: "Decision maker found", cls: "bg-info/15 text-info border-info/30" },
  "Verified contact": { label: "Verified contact", cls: "bg-primary/15 text-primary border-primary/30" },
  verified_contact: { label: "Verified contact", cls: "bg-primary/15 text-primary border-primary/30" },
  Qualified: { label: "Qualified", cls: "bg-info/15 text-info border-info/30" },
  qualified: { label: "Qualified", cls: "bg-info/15 text-info border-info/30" },
  "Outreach ready": { label: "Outreach ready", cls: "bg-primary/15 text-primary border-primary/30" },
  outreach_ready: { label: "Outreach ready", cls: "bg-primary/15 text-primary border-primary/30" },
  "Outreach prepared": { label: "Outreach prepared", cls: "bg-primary/15 text-primary border-primary/30" },
  outreach_prepared: { label: "Outreach prepared", cls: "bg-primary/15 text-primary border-primary/30" },
  "Needs enrichment": { label: "Needs enrichment", cls: "bg-muted text-muted-foreground" },
  needs_enrichment: { label: "Needs enrichment", cls: "bg-muted text-muted-foreground" },
  Excluded: { label: "Excluded", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  excluded: { label: "Excluded", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  duplicate_suppressed: { label: "Duplicate suppressed", cls: "bg-muted text-muted-foreground" },
  "Duplicate suppressed": { label: "Duplicate suppressed", cls: "bg-muted text-muted-foreground" },
  failed_no_email: { label: "Failed no email", cls: "bg-muted text-muted-foreground" },
  "Failed no email": { label: "Failed no email", cls: "bg-muted text-muted-foreground" },
  contacted: { label: "Contacted", cls: "bg-info/15 text-info border-info/30" },
  Contacted: { label: "Contacted", cls: "bg-info/15 text-info border-info/30" },
  follow_up: { label: "Follow up", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  Replied: { label: "Replied", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  replied: { label: "Replied", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  "Needs reply approval": { label: "Needs reply approval", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  needs_reply_approval: { label: "Needs reply approval", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  warm: { label: "Warm", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  interested: { label: "Interested", cls: "bg-primary/15 text-primary border-primary/30" },
  converted: { label: "Converted", cls: "bg-success/15 text-success border-success/30" },
  not_interested: { label: "Not interested", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  meeting_booked: { label: "Meeting booked", cls: "bg-success/15 text-success border-success/30" },
  hot: { label: "Hot", cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  not_qualified: { label: "Not qualified", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};
const CAMP: Record<CampaignStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-success/15 text-success border-success/30" },
  paused: { label: "Paused", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
};
const APPROVAL: Record<CampaignApprovalStatus, { label: string; cls: string }> = {
  pending: { label: "Waiting for approval", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  pending_client_approval: { label: "Waiting for approval", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  pending_review: { label: "Waiting for approval", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  pending_approval: { label: "Waiting for approval", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  waiting_for_approval: { label: "Waiting for approval", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  approved: { label: "Approved", cls: "bg-success/15 text-success border-success/30" },
  changes_requested: { label: "Changes requested", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  rejected: { label: "Changes requested", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  archived: { label: "Archived", cls: "bg-muted text-muted-foreground" },
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  none: { label: "No approval", cls: "bg-muted text-muted-foreground" },
};
const MEET: Record<MeetingStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-primary/15 text-primary border-primary/30" },
  completed: { label: "Completed", cls: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Cancelled", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  no_show: { label: "No-show", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus | LeadQualification | LeadWorkflowStatus | string }) {
  const s = LEAD[status as keyof typeof LEAD] || {
    label: formatStatusLabel(status),
    cls: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function CampaignStatusBadge({ status }: { status: CampaignStatus | CampaignLifecycleStatus | string }) {
  const normalized = typeof status === "string" ? status.toLowerCase() : status;
  const s = CAMP[normalized as keyof typeof CAMP] || {
    label: formatStatusLabel(String(status || "unknown")),
    cls: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function ApprovalStatusBadge({ status }: { status: CampaignApprovalStatus | string }) {
  const normalized = typeof status === "string" ? status.toLowerCase() : status;
  const s = APPROVAL[normalized as keyof typeof APPROVAL] || {
    label: formatStatusLabel(String(status || "unknown")),
    cls: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const s = MEET[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}

function formatStatusLabel(status: string) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "manual review" || normalized === "manual_review_required" || normalized === "needs_review" || normalized === "review") {
    return "Needs review";
  }
  if (normalized === "researching") {
    return "Raw company";
  }
  if (normalized === "needs enrichment" || normalized === "needs_enrichment") {
    return "Needs enrichment";
  }
  if (normalized === "qualified") {
    return "Qualified company";
  }
  if (normalized === "outreach ready" || normalized === "outreach_ready") {
    return "Outreach ready";
  }
  if (normalized === "outreach prepared" || normalized === "outreach_prepared") {
    return "Outreach prepared";
  }
  if (normalized === "excluded") {
    return "Excluded";
  }
  if (normalized === "needs reply approval" || normalized === "needs_reply_approval") {
    return "Needs reply approval";
  }

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}
