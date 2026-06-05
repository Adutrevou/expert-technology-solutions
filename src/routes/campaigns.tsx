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
import type { ApprovalRecord, CampaignRecord, FollowupSequenceRecord, OutreachTemplateRecord } from "@/lib/leads-api";

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
    const rows = campaignsQuery.data?.campaigns || summary?.campaigns || [];
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
    setCampaignForm({
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
    });
    setEditorState({
      mode: "edit",
      campaignId: campaign.id,
      originalApprovalStatus: normalizeApproval(campaign.approvalStatus),
    });
  }

  function closeEditor() {
    setEditorState(null);
    setCampaignForm(EMPTY_FORM);
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
      if (editorState?.mode === "edit" && editorState.campaignId) {
        await updateCampaignMutation.mutateAsync({
          campaignId: editorState.campaignId,
          input,
        });
        toast.success(
          editorState.originalApprovalStatus === "approved"
            ? "Changes saved. This campaign needs approval before the agent can use it again."
            : "Campaign changes saved.",
        );
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
        New campaigns are saved as drafts and must be approved before the agent can use them. Sending stays disabled until launch approval is complete.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active campaigns" value={activeCampaigns.length} detail="Campaigns currently visible for active planning." />
        <StatCard label="Approved" value={activeCampaigns.filter((campaign) => normalizeApproval(campaign.approvalStatus) === "approved").length} detail="Approved campaigns are clear on scope and ready for linked template review." />
        <StatCard label="Needs approval" value={approvalsWaiting} detail="These campaigns still need an approval decision." />
        <StatCard label="Archived" value={archivedCampaigns.length} detail="Archived campaigns keep their history but stay out of active use." />
      </div>

      <SectionCard title="Active campaigns" description="Start here. Review campaign details, update them safely, and keep approval status clear.">
        {activeCampaigns.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {activeCampaigns.map((campaign) => {
              const approval = approvalsByCampaignId.get(campaign.id);
              const templates = (summary?.outreachTemplates || []).filter((template) => template.campaignId === campaign.id);
              const sequences = (summary?.followupSequences || []).filter((sequence) => sequence.campaignId === campaign.id);
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
                    <InfoRow label="Target audience" value={campaign.targetNiche || "Not specified yet"} />
                    <InfoRow label="Target locations" value={campaign.targetLocation || "Not specified yet"} />
                    <InfoRow label="Template readiness" value={templateReadiness} />
                    <InfoRow label="Outreach readiness" value={outreachReadiness} />
                  </div>

                  {latestNote ? (
                    <div className="mt-4 rounded-[20px] border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                      Latest note: {latestNote}
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
