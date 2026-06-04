import { Badge } from "@/components/ui/badge";
import type { LeadStatus, CampaignStatus, MeetingStatus } from "@/lib/demo-data";
import type { CampaignApprovalStatus, CampaignLifecycleStatus, LeadQualification, LeadWorkflowStatus } from "@/lib/leads-api";

const LEAD: Record<LeadStatus | LeadQualification | LeadWorkflowStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-muted text-muted-foreground" },
  reviewed: { label: "Reviewed", cls: "bg-muted text-muted-foreground" },
  review: { label: "Review", cls: "bg-muted text-muted-foreground" },
  contacted: { label: "Contacted", cls: "bg-info/15 text-info border-info/30" },
  follow_up: { label: "Follow up", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  replied: { label: "Replied", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
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
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}
