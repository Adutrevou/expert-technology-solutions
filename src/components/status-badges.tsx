import { Badge } from "@/components/ui/badge";
import type { LeadStatus, CampaignStatus, MeetingStatus } from "@/lib/demo-data";
import type {
  CampaignApprovalStatus,
  CampaignLifecycleStatus,
  ClientVisibleRequestStatus,
  LeadQualification,
} from "@/lib/leads-api";

const LEAD: Record<LeadStatus | LeadQualification, { label: string; cls: string }> = {
  new: { label: "Review", cls: "bg-muted text-muted-foreground" },
  review: { label: "Review", cls: "bg-muted text-muted-foreground" },
  contacted: { label: "Warm", cls: "bg-info/15 text-info border-info/30" },
  replied: { label: "Warm", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  warm: { label: "Warm", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  interested: { label: "Hot", cls: "bg-primary/15 text-primary border-primary/30" },
  meeting_booked: { label: "Hot", cls: "bg-success/15 text-success border-success/30" },
  hot: { label: "Hot", cls: "bg-success/15 text-success border-success/30" },
  not_qualified: { label: "Not qualified", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};
const CAMP: Record<CampaignStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-success/15 text-success border-success/30" },
  paused: { label: "Paused", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
};
const APPROVAL: Record<CampaignApprovalStatus, { label: string; cls: string }> = {
  pending: { label: "Pending approval", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  approved: { label: "Approved", cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  none: { label: "No approval", cls: "bg-muted text-muted-foreground" },
};
const MEET: Record<MeetingStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-primary/15 text-primary border-primary/30" },
  completed: { label: "Completed", cls: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Cancelled", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  no_show: { label: "No-show", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
};
const REQUEST: Record<ClientVisibleRequestStatus, { label: string; cls: string }> = {
  submitted: { label: "Submitted", cls: "bg-info/15 text-info border-info/30" },
  under_review: { label: "Under review", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  in_progress: { label: "In progress", cls: "bg-primary/15 text-primary border-primary/30" },
  waiting_on_you: { label: "Waiting on you", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  completed: { label: "Completed", cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus | LeadQualification }) {
  const s = LEAD[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function CampaignStatusBadge({ status }: { status: CampaignStatus | CampaignLifecycleStatus }) {
  const s = CAMP[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function ApprovalStatusBadge({ status }: { status: CampaignApprovalStatus }) {
  const s = APPROVAL[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const s = MEET[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function RequestStatusBadge({ status }: { status: ClientVisibleRequestStatus }) {
  const s = REQUEST[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
