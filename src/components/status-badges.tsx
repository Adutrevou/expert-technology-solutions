import { Badge } from "@/components/ui/badge";
import type { LeadStatus, CampaignStatus, MeetingStatus } from "@/lib/demo-data";

const LEAD: Record<LeadStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-muted text-muted-foreground" },
  contacted: { label: "Contacted", cls: "bg-info/15 text-info border-info/30" },
  replied: { label: "Replied", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  interested: { label: "Interested", cls: "bg-primary/15 text-primary border-primary/30" },
  meeting_booked: { label: "Meeting", cls: "bg-success/15 text-success border-success/30" },
};
const CAMP: Record<CampaignStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-success/15 text-success border-success/30" },
  paused: { label: "Paused", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
};
const MEET: Record<MeetingStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-primary/15 text-primary border-primary/30" },
  completed: { label: "Completed", cls: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Cancelled", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  no_show: { label: "No-show", cls: "bg-warning/15 text-warning-foreground border-warning/40" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const s = LEAD[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const s = CAMP[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const s = MEET[status];
  return <Badge variant="outline" className={`${s.cls} font-medium text-[10px] uppercase tracking-wide`}>{s.label}</Badge>;
}
