import { Link, createFileRoute } from "@tanstack/react-router";
import { RefreshCcw } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApprovalStatusBadge, CampaignStatusBadge } from "@/components/status-badges";
import { EmptyCard, PageIntro, SectionCard, StatCard } from "@/components/client-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import { friendlyApprovalStatus, normalizeApproval } from "@/lib/approval-hub";
import {
  useArchiveCampaignMutation,
  useCampaignApprovalDecisionMutation,
  useCampaignsQuery,
  useCreateCampaignMutation,
  useLeadAgentSummaryQuery,
  useUpdateCampaignMutation,
} from "@/lib/leads-api-hooks";
import type { ApprovalRecord, CampaignRecord } from "@/lib/leads-api";

export const Route = createFileRoute("/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Expert Technology Solutions" }] }),
  component: CampaignsPage,
});

type RequestChangesState = {
  campaignId: string;
  campaignName: string;
  currentNote: string;
} | null;

type CampaignEditorState = {
  mode: "create" | "edit";
  campaignId?: string;
  originalApprovalStatus?: string;
  originalForm?: CampaignFormState;
} | null;

type CampaignFormState = {
  name: string;
  objective: string;
  targetNiche: string;
  targetLocation: string;
  targetDecisionMakers: string;
  servicesOffers: string;
  qualificationQuestions: string;
  keySellingPoints: string;
  cta: string;
  notes: string;
};

const EMPTY_FORM: CampaignFormState = {
  name: "",
  objective: "",
  targetNiche: "",
  targetLocation: "",
  targetDecisionMakers: "",
  servicesOffers: "",
  qualificationQuestions: "",
  keySellingPoints: "",
  cta: "",
  notes: "",
};

function CampaignsPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const campaignsQuery = useCampaignsQuery();
  const createCampaignMutation = useCreateCampaignMutation();
  const updateCampaignMutation = useUpdateCampaignMutation();
  const archiveCampaignMutation = useArchiveCampaignMutation();
  const campaignDecisionMutation = useCampaignApprovalDecisionMutation();
  const canManage = ["client_owner", "manager", "intergrai_admin"].includes(user?.role || "");
  const canApprove = canManage;
  const [requestChangesCampaign, setRequestChangesCampaign] = useState<RequestChangesState>(null);
  const [requestChangesNote, setRequestChangesNote] = useState("");
  const [editorState, setEditorState] = useState<CampaignEditorState>(null);
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>(EMPTY_FORM);
  const [showArchived, setShowArchived] = useState(false);

  const summary = summaryQuery.data;
  const campaigns = useMemo(() => {
    const rows = summary?.campaigns || campaignsQuery.data?.campaigns || [];
    return rows
      .filter((campaign) => !campaign.hiddenFromClient)
      .filter((campaign) => !/(demo|mock|placeholder|untitled)/i.test(campaign.name))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [campaignsQuery.data?.campaigns, summary?.campaigns]);

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status !== "archived"),
    [campaigns],
  );
  const archivedCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "archived"),
    [campaigns],
  );

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
    await Promise.all([summaryQuery.refetch(), campaignsQuery.refetch()]);
  }

  function openCreateCampaign() {
    setCampaignForm(EMPTY_FORM);
    setEditorState({ mode: "create" });
  }

  function openEditCampaign(campaign: CampaignRecord) {
    const originalForm = buildCampaignFormState(campaign);
    setCampaignForm(originalForm);
    setEditorState({
      mode: "edit",
      campaignId: campaign.id,
      originalApprovalStatus: normalizeApproval(campaign.approvalStatus),
      originalForm,
    });
  }

  function closeEditor() {
    setEditorState(null);
    setCampaignForm(EMPTY_FORM);
  }

  async function handleCampaignDecision(
    campaignId: string,
    decision: "approved" | "changes_requested" | "waiting_for_approval",
    decisionNote?: string,
  ) {
    try {
      await campaignDecisionMutation.mutateAsync({
        campaignId,
        decision,
        decision_note: decisionNote?.trim() || undefined,
      });
      toast.success(
        decision === "approved"
          ? "Campaign approved."
          : decision === "waiting_for_approval"
            ? "Campaign approval paused."
            : "Changes requested.",
      );
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

  async function saveCampaign() {
    if (!campaignForm.name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    if (!campaignForm.objective.trim()) {
      toast.error("Campaign objective is required.");
      return;
    }

    const input = {
      name: campaignForm.name.trim(),
      objective: campaignForm.objective.trim(),
      target_niche: campaignForm.targetNiche.trim() || null,
      target_location: campaignForm.targetLocation.trim() || null,
      target_decision_makers: splitTextareaList(campaignForm.targetDecisionMakers),
      services_offers: splitTextareaList(campaignForm.servicesOffers),
      qualification_questions: splitTextareaList(campaignForm.qualificationQuestions),
      key_selling_points: splitTextareaList(campaignForm.keySellingPoints),
      cta: campaignForm.cta.trim() || null,
      notes: campaignForm.notes.trim() || null,
    };

    try {
      const keyLaunchDetailsChanged = editorState?.mode === "edit"
        && editorState.originalForm
        && hasCampaignKeyLaunchFieldChanges(editorState.originalForm, campaignForm);

      if (editorState?.mode === "edit" && editorState.campaignId) {
        await updateCampaignMutation.mutateAsync({
          campaignId: editorState.campaignId,
          input,
        });
        if (editorState.originalApprovalStatus === "approved" && keyLaunchDetailsChanged) {
          toast.success("Campaign updated. Because key launch details changed, this campaign needs approval again before outreach can continue.");
        } else if (editorState.originalApprovalStatus === "approved") {
          toast.success("Campaign updated. Approval remains active because only non-critical details changed.");
        } else {
          toast.success("Campaign updated. It still needs approval before outreach can continue.");
        }
      } else {
        await createCampaignMutation.mutateAsync(input);
        toast.success("Campaign saved as draft. It now needs approval before the agent can use it.");
      }
      closeEditor();
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that campaign.");
    }
  }

  async function archiveCampaign(campaign: CampaignRecord) {
    const confirmed = window.confirm("This will hide the campaign from active use. Existing history will remain.");
    if (!confirmed) return;

    try {
      await archiveCampaignMutation.mutateAsync({ campaignId: campaign.id });
      toast.success("Campaign archived.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive that campaign.");
    }
  }

  if ((summaryQuery.isLoading || campaignsQuery.isLoading) && !summary && !campaignsQuery.data) {
    return <CampaignsLoadingState />;
  }

  if ((summaryQuery.isError && !summary) || (campaignsQuery.isError && !campaignsQuery.data)) {
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

  const approvalsWaiting = activeCampaigns.filter((campaign) => normalizeApproval(campaign.approvalStatus) !== "approved").length;
  const readyToLaunchCount = activeCampaigns.filter((campaign) => campaign.launchState === "approved_ready").length;
  const pausedCount = activeCampaigns.filter((campaign) => campaign.launchState === "paused_needs_approval").length;

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageIntro
        badge="Campaigns"
        title="Which campaigns are active and approved?"
        description="Add new campaigns safely, edit existing ones, and approve or request changes without changing launch controls."
        actions={(
          <>
            <Button asChild variant="outline">
              <Link to="/approvals">Open approval hub</Link>
            </Button>
            {canManage ? (
              <Button onClick={openCreateCampaign}>
                Add campaign
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void refreshAll()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </>
        )}
      />

      <div className="rounded-[24px] border border-primary/10 bg-primary/5 px-5 py-4 text-sm text-foreground">
        New campaigns are saved as drafts and must be approved before the agent uses them in outreach.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active campaigns" value={activeCampaigns.length} detail="Campaigns currently visible for active planning." />
        <StatCard label="Ready to launch" value={readyToLaunchCount} detail="These campaigns have the required approvals and are ready once sending is enabled." />
        <StatCard label="Needs approval" value={approvalsWaiting} detail="These campaigns still need an approval decision." />
        <StatCard label="Paused" value={pausedCount} detail="Approved work changed and needs approval again before outreach can continue." />
      </div>

      <SectionCard title="Active campaigns" description="Start here. Review campaign details, update them safely, and keep approval status clear.">
        {activeCampaigns.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {activeCampaigns.map((campaign) => {
              const approval = approvalsByCampaignId.get(campaign.id);
              const approvalStatus = normalizeApproval(campaign.approvalStatus);
              const latestNote = approval?.decisionNote || "";
              const needsDecision = approvalStatus !== "approved" && approvalStatus !== "archived";
              const canPauseApproval = approvalStatus === "approved";

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
                    <InfoRow label="Target audience" value={campaign.targetNiche || "Not specified yet"} />
                    <InfoRow label="Target locations" value={campaign.targetLocation || "Not specified yet"} />
                    <InfoRow label="First email" value={campaign.firstContactTemplateStatus || "Needs approval"} />
                    <InfoRow label="Follow-ups" value={campaign.followupStatus || "Needs approval"} />
                    <InfoRow label="Launch state" value={formatLaunchState(campaign.launchState)} />
                    <InfoRow label="Next action" value={campaign.nextAction || campaign.launchNextAction || "Review approvals before launch."} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoRow label="Sourced" value={String(campaign.sourcedLeads)} />
                    <InfoRow label="Qualified" value={String(campaign.qualifiedLeads)} />
                    <InfoRow label="Outreach sent" value={String(campaign.outreachSent)} />
                    <InfoRow label="Replies" value={String(campaign.replies)} />
                  </div>

                  {latestNote || campaign.launchBlockers.length ? (
                    <div className="mt-4 rounded-[20px] border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                      {latestNote ? `Latest note: ${latestNote}` : campaign.launchBlockers[0]}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {canManage ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEditCampaign(campaign)}>
                          Edit campaign
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void archiveCampaign(campaign)}>
                          Archive campaign
                        </Button>
                      </>
                    ) : null}
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
                    {canPauseApproval ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleCampaignDecision(campaign.id, "waiting_for_approval", "Campaign paused until approval is confirmed again.")}
                        disabled={!canApprove || campaignDecisionMutation.isPending}
                        title={!canApprove ? "You do not have permission to pause approvals." : undefined}
                      >
                        Unapprove / Pause
                      </Button>
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
            title="No active campaigns available"
            description="Add a campaign when you want the agent to prepare a new outreach track."
          />
        )}
      </SectionCard>

      <SectionCard title="Archived campaigns" description="Archived campaigns stay out of active use, but their history remains available.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Show archived only when you need historical context.</p>
          <Button variant="outline" onClick={() => setShowArchived((current) => !current)}>
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
        </div>

        {showArchived ? (
          archivedCampaigns.length ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {archivedCampaigns.map((campaign) => (
                <Card key={campaign.id} className="rounded-[26px] border-border/70 p-5 shadow-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{campaign.objective}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <CampaignStatusBadge status={campaign.status} />
                      <ApprovalStatusBadge status={normalizeApproval(campaign.approvalStatus)} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyCard title="No archived campaigns yet" description="Archived campaigns will appear here after they are removed from active use." />
          )
        ) : null}
      </SectionCard>

      <Dialog open={Boolean(editorState)} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editorState?.mode === "edit" ? "Edit campaign" : "Add campaign"}</DialogTitle>
            <DialogDescription>
              New campaigns are saved as drafts and must be approved before the agent can use them.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Campaign name">
              <Input value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} placeholder="Example: Hospitality Network Refresh" />
            </FormField>
            <FormField label="Campaign objective">
              <Input value={campaignForm.objective} onChange={(event) => setCampaignForm((current) => ({ ...current, objective: event.target.value }))} placeholder="What should this campaign achieve?" />
            </FormField>
            <FormField label="Target audience">
              <Input value={campaignForm.targetNiche} onChange={(event) => setCampaignForm((current) => ({ ...current, targetNiche: event.target.value }))} placeholder="Example: hotels, professional services, retail groups" />
            </FormField>
            <FormField label="Target locations">
              <Input value={campaignForm.targetLocation} onChange={(event) => setCampaignForm((current) => ({ ...current, targetLocation: event.target.value }))} placeholder="Example: Cape Town, Gauteng, nationwide" />
            </FormField>
            <FormField label="Target decision-makers">
              <Textarea value={campaignForm.targetDecisionMakers} onChange={(event) => setCampaignForm((current) => ({ ...current, targetDecisionMakers: event.target.value }))} placeholder="One per line" className="min-h-[120px]" />
            </FormField>
            <FormField label="Services or offers">
              <Textarea value={campaignForm.servicesOffers} onChange={(event) => setCampaignForm((current) => ({ ...current, servicesOffers: event.target.value }))} placeholder="One per line" className="min-h-[120px]" />
            </FormField>
            <FormField label="Qualification questions">
              <Textarea value={campaignForm.qualificationQuestions} onChange={(event) => setCampaignForm((current) => ({ ...current, qualificationQuestions: event.target.value }))} placeholder="One per line" className="min-h-[120px]" />
            </FormField>
            <FormField label="Key selling points">
              <Textarea value={campaignForm.keySellingPoints} onChange={(event) => setCampaignForm((current) => ({ ...current, keySellingPoints: event.target.value }))} placeholder="One per line" className="min-h-[120px]" />
            </FormField>
            <FormField label="Call to action">
              <Input value={campaignForm.cta} onChange={(event) => setCampaignForm((current) => ({ ...current, cta: event.target.value }))} placeholder="Example: ask for a quick call" />
            </FormField>
            <FormField label="Notes">
              <Textarea value={campaignForm.notes} onChange={(event) => setCampaignForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Anything else the agent should keep in mind." className="min-h-[120px]" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveCampaign()}
              disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
            >
              Save campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function formatLaunchState(value: string) {
  switch (value) {
    case "approved_ready":
      return "Ready to launch";
    case "live":
      return "Live";
    case "paused_needs_approval":
      return "Paused - approval needed";
    case "archived":
      return "Archived";
    default:
      return "Needs approval";
  }
}

function buildCampaignFormState(campaign: CampaignRecord): CampaignFormState {
  return {
    name: campaign.name || "",
    objective: campaign.objective || "",
    targetNiche: campaign.targetNiche || "",
    targetLocation: campaign.targetLocation || "",
    targetDecisionMakers: campaign.targetDecisionMakers.join("\n"),
    servicesOffers: campaign.servicesOffers.join("\n"),
    qualificationQuestions: campaign.qualificationQuestions.join("\n"),
    keySellingPoints: campaign.keySellingPoints.join("\n"),
    cta: campaign.callToAction || "",
    notes: campaign.notes || "",
  };
}

function normalizeMultilineText(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeSingleLineText(value: string) {
  return value.trim();
}

function hasCampaignKeyLaunchFieldChanges(previous: CampaignFormState, next: CampaignFormState) {
  return normalizeSingleLineText(previous.name) !== normalizeSingleLineText(next.name)
    || normalizeSingleLineText(previous.objective) !== normalizeSingleLineText(next.objective)
    || normalizeSingleLineText(previous.targetNiche) !== normalizeSingleLineText(next.targetNiche)
    || normalizeSingleLineText(previous.targetLocation) !== normalizeSingleLineText(next.targetLocation)
    || normalizeMultilineText(previous.targetDecisionMakers) !== normalizeMultilineText(next.targetDecisionMakers)
    || normalizeMultilineText(previous.servicesOffers) !== normalizeMultilineText(next.servicesOffers)
    || normalizeSingleLineText(previous.cta) !== normalizeSingleLineText(next.cta);
}

function splitTextareaList(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
