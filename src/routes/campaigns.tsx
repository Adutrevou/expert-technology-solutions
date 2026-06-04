import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { ApprovalStatusBadge, CampaignStatusBadge } from "@/components/status-badges";
import { EmptyCard, PageIntro, SectionCard, StatCard } from "@/components/client-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import { normalizeApproval, friendlyApprovalStatus } from "@/lib/approval-hub";
import { useCampaignApprovalDecisionMutation, useLeadAgentSummaryQuery } from "@/lib/leads-api-hooks";
import type { ApprovalRecord, CampaignRecord, FollowupSequenceRecord, OutreachTemplateRecord } from "@/lib/leads-api";

export const Route = createFileRoute("/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Expert Technology Solutions" }] }),
  component: CampaignsPage,
});

const REAL_EXPERT_CAMPAIGN_NAMES = new Set([
  "Managed IT & Proactive Support",
  "CCTV & Access Control",
  "Multi-Site Technology Consolidation",
  "Cybersecurity & Disaster Recovery",
]);

type RequestChangesState = {
  campaignId: string;
  campaignName: string;
  currentNote: string;
} | null;

function CampaignsPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const campaignDecisionMutation = useCampaignApprovalDecisionMutation();
  const canApprove = ["client_owner", "manager", "intergrai_admin"].includes(user?.role || "");
  const [requestChangesCampaign, setRequestChangesCampaign] = useState<RequestChangesState>(null);
  const [requestChangesNote, setRequestChangesNote] = useState("");

  const summary = summaryQuery.data;
  const campaigns = useMemo(() => {
    return (summary?.campaigns || [])
      .filter((campaign) => REAL_EXPERT_CAMPAIGN_NAMES.has(campaign.name) && !/(demo|mock|test|placeholder|untitled)/i.test(campaign.name))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [summary?.campaigns]);

  const approvalsByCampaignId = useMemo(() => {
    const map = new Map<string, ApprovalRecord>();
    for (const approval of summary?.approvals || []) {
      if (approval.entityType !== "campaign" || !approval.entityId) continue;
      if (!map.has(approval.entityId)) {
        map.set(approval.entityId, approval);
      }
    }
    return map;
  }, [summary?.approvals]);

  async function refreshAll() {
    await summaryQuery.refetch();
  }

  async function handleCampaignDecision(campaignId: string, decision: "approved" | "changes_requested", decisionNote?: string) {
    try {
      await campaignDecisionMutation.mutateAsync({
        campaignId,
        decision,
        decision_note: decisionNote?.trim() || undefined,
      });
      toast.success(decision === "approved" ? "Campaign approved." : "Changes requested.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that campaign decision.");
    }
  }

  async function submitRequestChanges() {
    if (!requestChangesCampaign) return;
    if (!requestChangesNote.trim()) {
      toast.error("Add a short note so the requested changes are clear.");
      return;
    }

    await handleCampaignDecision(requestChangesCampaign.campaignId, "changes_requested", requestChangesNote);
    setRequestChangesCampaign(null);
    setRequestChangesNote("");
  }

  if (summaryQuery.isLoading && !summary) {
    return <CampaignsLoadingState />;
  }

  if (summaryQuery.isError || !summary) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <Card className="rounded-[28px] p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Campaigns unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">We couldn’t load the campaign workspace.</p>
          <div className="mt-6">
            <Button variant="outline" onClick={() => void refreshAll()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const approvalsWaiting = campaigns.filter((campaign) => normalizeApproval(campaign.approvalStatus) !== "approved").length;

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageIntro
        badge="Campaigns"
        title="Which campaigns are approved and ready?"
        description="Review each real Expert campaign, confirm readiness, and approve or request changes directly from this page."
        actions={(
          <>
            <Button asChild variant="outline">
              <Link to="/approvals">Open approval hub</Link>
            </Button>
            <Button variant="outline" onClick={() => void refreshAll()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campaigns" value={campaigns.length} detail="Only real Expert campaigns appear here." />
        <StatCard label="Approved" value={campaigns.filter((campaign) => normalizeApproval(campaign.approvalStatus) === "approved").length} detail="Approved campaigns are clear on campaign sign-off." />
        <StatCard label="Needs attention" value={approvalsWaiting} detail="These campaigns still need an approval decision." />
        <StatCard label="Status" value="Paused safely" detail="Sending remains disabled while launch approvals are incomplete." />
      </div>

      <SectionCard title="Campaign approvals" description="Approve campaigns here, then review linked templates and follow-ups as needed.">
        {campaigns.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {campaigns.map((campaign) => {
              const approval = approvalsByCampaignId.get(campaign.id);
              const templates = (summary.outreachTemplates || []).filter((template) => template.campaignId === campaign.id);
              const sequences = (summary.followupSequences || []).filter((sequence) => sequence.campaignId === campaign.id);
              const templateReadiness = describeTemplateReadiness(templates, sequences);
              const outreachReadiness = describeOutreachReadiness(campaign, templates, sequences);
              const approvalStatus = normalizeApproval(campaign.approvalStatus);
              const latestNote = approval?.decisionNote || "";
              const needsDecision = approvalStatus !== "approved" && approvalStatus !== "archived";

              return (
                <Card key={campaign.id} className="rounded-[26px] border-border/70 p-5 shadow-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{campaign.objective}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <CampaignStatusBadge status={campaign.status} />
                      <ApprovalStatusBadge status={approvalStatus} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <InfoRow label="Short purpose" value={campaign.objective || "Campaign objective not set yet"} />
                    <InfoRow label="Current approval status" value={friendlyApprovalStatus(approvalStatus)} />
                    <InfoRow label="Template readiness status" value={templateReadiness} />
                    <InfoRow label="Outreach readiness status" value={outreachReadiness} />
                  </div>

                  {latestNote ? (
                    <div className="mt-4 rounded-[20px] border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                      Latest note: {latestNote}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {needsDecision ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void handleCampaignDecision(campaign.id, "approved")}
                          disabled={!canApprove || campaignDecisionMutation.isPending}
                          title={!canApprove ? "You do not have permission to approve campaigns." : undefined}
                        >
                          Approve campaign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRequestChangesCampaign({
                              campaignId: campaign.id,
                              campaignName: campaign.name,
                              currentNote: latestNote,
                            });
                            setRequestChangesNote(latestNote);
                          }}
                          disabled={!canApprove || campaignDecisionMutation.isPending}
                          title={!canApprove ? "You do not have permission to request changes." : undefined}
                        >
                          Request changes
                        </Button>
                      </>
                    ) : null}
                    <Button asChild variant="outline" size="sm">
                      <Link to="/approvals">View approval details</Link>
                    </Button>
                    <Button asChild size="sm" variant={needsDecision ? "outline" : "default"}>
                      <Link to="/templates">View templates</Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyCard
            title="No real campaigns available"
            description="Demo, mock, placeholder, and untitled campaigns stay hidden from the client workspace."
          />
        )}
      </SectionCard>

      <Dialog open={Boolean(requestChangesCampaign)} onOpenChange={(open) => {
        if (!open) {
          setRequestChangesCampaign(null);
          setRequestChangesNote("");
        }
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Request campaign changes</DialogTitle>
            <DialogDescription>
              Explain what should change so the next campaign review is clear and actionable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
              <p className="font-medium">{requestChangesCampaign?.campaignName}</p>
            </div>
            <div>
              <p className="text-sm font-medium">What should change?</p>
              <Textarea
                className="mt-2 min-h-[140px]"
                value={requestChangesNote}
                onChange={(event) => setRequestChangesNote(event.target.value)}
                placeholder="Example: tighten the target market, simplify the objective, and adjust what this campaign should prioritize first."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRequestChangesCampaign(null);
              setRequestChangesNote("");
            }}>
              Cancel
            </Button>
            <Button onClick={() => void submitRequestChanges()}>
              Save request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function describeTemplateReadiness(templates: OutreachTemplateRecord[], sequences: FollowupSequenceRecord[]) {
  const variants = templates.flatMap((template) => template.variants);
  const approvedVariants = variants.filter((variant) => normalizeApproval(variant.approvalStatus || variant.approvalDecisionStatus) === "approved").length;
  const approvedSequences = sequences.filter((sequence) => normalizeApproval(sequence.approvalStatus || sequence.approvalDecisionStatus) === "approved").length;

  if (!variants.length && !sequences.length) {
    return "No templates or follow-ups linked yet";
  }

  if (variants.length === approvedVariants && sequences.length === approvedSequences) {
    return "Templates and follow-ups are approved";
  }

  return `${approvedVariants}/${variants.length} email templates approved · ${approvedSequences}/${sequences.length} follow-up sequences approved`;
}

function describeOutreachReadiness(
  campaign: CampaignRecord,
  templates: OutreachTemplateRecord[],
  sequences: FollowupSequenceRecord[],
) {
  const campaignApproved = normalizeApproval(campaign.approvalStatus) === "approved";
  const templateReady = templates.every((template) =>
    template.variants.every((variant) => normalizeApproval(variant.approvalStatus || variant.approvalDecisionStatus) === "approved"),
  );
  const sequenceReady = sequences.every((sequence) => normalizeApproval(sequence.approvalStatus || sequence.approvalDecisionStatus) === "approved");

  if (!campaignApproved) {
    return "Blocked until this campaign is approved";
  }

  if (!templateReady || !sequenceReady) {
    return "Waiting on linked template or follow-up approvals";
  }

  return "Campaign structure is ready. Launch still depends on global sending controls and final approvals.";
}

function CampaignsLoadingState() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <Skeleton className="h-44 rounded-[32px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-[28px]" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}
