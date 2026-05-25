import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bot, CheckCircle2, Clock3, FileBarChart, LoaderCircle, RefreshCcw, Send, ShieldAlert, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/app-state";
import { useApprovalDecisionMutation, useCreateMissionMutation, useLeadAgentSummaryQuery } from "@/lib/leads-api-hooks";
import { ApprovalStatusBadge, CampaignStatusBadge, LeadStatusBadge } from "@/components/status-badges";

export const Route = createFileRoute("/lead-agent")({
  head: () => ({ meta: [{ title: "Lead Agent — Expert Technology Solutions" }] }),
  component: LeadAgentPage,
});

const WORKER_OPTIONS = [
  "Sourcing Agent",
  "Qualification Agent",
  "Enrichment Agent",
  "Outreach Agent",
  "Reply Agent",
  "Reporting Agent",
  "Approval/Compliance Agent",
] as const;

function LeadAgentPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const createMissionMutation = useCreateMissionMutation();
  const approvalDecisionMutation = useApprovalDecisionMutation();

  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [assignedWorkerType, setAssignedWorkerType] = useState<string>(WORKER_OPTIONS[0]);
  const [campaignId, setCampaignId] = useState<string>("none");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = summaryQuery.data;
  const canApprove = user?.role === "client_owner" || user?.role === "manager" || user?.role === "intergrai_admin";
  const latestReportMetrics = useMemo(() => {
    const payload = data?.latestWeeklyReport?.payload || {};
    const metrics = typeof payload.metrics === "object" && payload.metrics ? payload.metrics as Record<string, unknown> : {};
    return [
      ["Leads qualified", normalizeMetric(metrics.leads_qualified)],
      ["Outreach sent", normalizeMetric(metrics.outreach_sent)],
      ["Replies received", normalizeMetric(metrics.replies_received)],
      ["Handoffs", normalizeMetric(metrics.handoffs_to_client)],
    ];
  }, [data?.latestWeeklyReport?.payload]);

  const handleMissionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);

    if (!title.trim() || !instruction.trim()) {
      setError("Enter a mission title and instruction.");
      return;
    }

    try {
      const mission = await createMissionMutation.mutateAsync({
        title: title.trim(),
        instruction: instruction.trim(),
        assigned_worker_type: assignedWorkerType,
        campaign_id: campaignId === "none" ? undefined : campaignId,
      });
      setTitle("");
      setInstruction("");
      setNotice(`Mission created: ${mission.title}`);
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to create mission.");
    }
  };

  const handleApprovalDecision = async (approvalId: string, decision: "approved" | "rejected") => {
    setNotice(null);
    setError(null);
    try {
      await approvalDecisionMutation.mutateAsync({ approvalId, decision });
      setNotice(`Approval ${decision}.`);
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to update approval.");
    }
  };

  if (summaryQuery.isLoading) {
    return <LeadAgentLoadingState />;
  }

  if (summaryQuery.isError || !data) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <Card className="p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Lead Agent unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {(summaryQuery.error as Error | undefined)?.message || "We couldn’t load the Mr Krabs workspace right now."}
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => summaryQuery.refetch()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="rounded-[28px] border border-border/70 bg-gradient-subtle px-6 py-6 shadow-card md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-muted-foreground">Expert Mr Krabs</p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Lead Agent Workspace</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Missions, campaign approvals, lead pipeline visibility, and weekly operational reporting.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Bot className="h-4 w-4 text-primary" />
                {data.agent?.name || "Expert Mr Krabs"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Status: {data.agent?.status || "Unknown"}
                {data.agent?.lastHeartbeatAt
                  ? ` · heartbeat ${formatDistanceToNow(new Date(data.agent.lastHeartbeatAt), { addSuffix: true })}`
                  : ""}
              </p>
            </div>
            <Button variant="outline" onClick={() => summaryQuery.refetch()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Active missions" value={data.activeMissions.length} icon={Clock3} />
        <KpiCard label="Open requests" value={data.openRequests.length} icon={Sparkles} />
        <KpiCard label="Raw leads" value={data.rawLeadsCount} icon={ShieldAlert} />
        <KpiCard label="Enrichment queue" value={data.enrichmentQueueCount} icon={LoaderCircle} />
        <KpiCard label="Approvals waiting" value={data.approvalsWaiting} icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Instruct your sub-agent</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every instruction becomes a mission in the Expert workspace.
              </p>
            </div>
            <Send className="h-5 w-5 text-primary" />
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleMissionSubmit}>
            <div className="space-y-2">
              <Label htmlFor="mission-title">Mission title</Label>
              <Input
                id="mission-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Source Midrand manufacturing businesses for proactive IT"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Worker type</Label>
                <Select value={assignedWorkerType} onValueChange={setAssignedWorkerType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKER_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Related campaign</Label>
                <Select value={campaignId} onValueChange={setCampaignId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked campaign</SelectItem>
                    {data.campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mission-instruction">Instruction</Label>
              <Textarea
                id="mission-instruction"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                className="min-h-[180px] resize-y"
                placeholder="Describe the target market, quality standard, budget awareness, outreach constraints, or reporting goal."
              />
            </div>

            {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
            {notice ? <InlineMessage tone="success">{notice}</InlineMessage> : null}

            <Button type="submit" className="gap-2" disabled={createMissionMutation.isPending}>
              <Send className="h-4 w-4" />
              {createMissionMutation.isPending ? "Creating mission..." : "Create mission"}
            </Button>
          </form>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Latest weekly report</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Client-visible summary with budget and pipeline context.
              </p>
            </div>
            <FileBarChart className="h-5 w-5 text-primary" />
          </div>

          {data.latestWeeklyReport ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">{data.latestWeeklyReport.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.latestWeeklyReport.periodStart} to {data.latestWeeklyReport.periodEnd}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{data.latestWeeklyReport.summary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {latestReportMetrics.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No weekly report yet" description="A report will appear here once the first reporting cycle is generated." />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Lead pipeline lifecycle</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only qualified and client-appropriate records should progress into the visible pipeline.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.leadPipelineCounts.length ? data.leadPipelineCounts.map((item) => (
              <div key={item.stage} className="rounded-xl border border-border px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.stage}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{item.count}</p>
              </div>
            )) : <EmptyState title="No lifecycle counts yet" description="Lead stages will appear once client-visible leads are promoted through the platform." />}
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Active missions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mission queue created by Intergrai or the Expert portal.
          </p>
          <div className="mt-5 space-y-3">
            {data.activeMissions.length ? data.activeMissions.map((mission) => (
              <div key={mission.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{mission.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{mission.instruction}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {mission.assignedWorkerType} · {mission.missionType}
                      {mission.createdAt ? ` · ${formatDistanceToNow(new Date(mission.createdAt), { addSuffix: true })}` : ""}
                    </p>
                  </div>
                  <LeadStatusBadge status={mission.status.toLowerCase().replace(/\s+/g, "_")} />
                </div>
              </div>
            )) : <EmptyState title="No missions yet" description="Create the first mission to start the Expert agent workflow." />}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Raw lead statuses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal qualification progress before any client-visible promotion.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.rawLeadStatusCounts.length ? data.rawLeadStatusCounts.map((item) => (
              <div key={item.status} className="rounded-xl border border-border px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatStatusLabel(item.status)}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{item.count}</p>
              </div>
            )) : <EmptyState title="No raw lead statuses yet" description="Raw lead qualification states will appear here once sourcing or review begins." />}
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Latest qualification actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent Qualification Agent decisions, scoring, and model routing.
          </p>
          <div className="mt-5 space-y-3">
            {data.latestQualificationActions.length ? data.latestQualificationActions.map((action) => (
              <div key={action.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{action.companyName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{action.qualificationNotes || "Qualification decision recorded."}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Score {action.qualificationScore} · Confidence {action.confidenceScore}
                      {action.modelRouteUsed ? ` · ${action.modelRouteUsed}` : ""}
                      {action.updatedAt ? ` · ${formatDistanceToNow(new Date(action.updatedAt), { addSuffix: true })}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <LeadStatusBadge status={action.status} />
                    {action.escalationRequired ? (
                      <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-warning-foreground">
                        Escalation flagged
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )) : <EmptyState title="No qualification actions yet" description="Qualification Agent reviews will appear here after raw leads are scored." />}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Enrichment queue statuses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dry-run planning, approval waiting, and provider-readiness states before any credit spend.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.enrichmentQueueStatusCounts.length ? data.enrichmentQueueStatusCounts.map((item) => (
              <div key={item.status} className="rounded-xl border border-border px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatStatusLabel(item.status)}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{item.count}</p>
              </div>
            )) : <EmptyState title="No enrichment queue statuses yet" description="Enrichment planning states will appear here after Qualification Agent moves leads into the queue." />}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Apollo attempted</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.enrichmentUsageSummary.apolloAttempted}</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Apollo used</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.enrichmentUsageSummary.apolloUsed}</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Hunter attempted</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.enrichmentUsageSummary.hunterAttempted}</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Hunter used</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.enrichmentUsageSummary.hunterUsed}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Latest enrichment actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Most recent enrichment planning decisions, approval requirements, and routing notes.
          </p>
          <div className="mt-5 space-y-3">
            {data.latestEnrichmentActions.length ? data.latestEnrichmentActions.map((action) => (
              <div key={action.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{formatStatusLabel(action.status)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{action.enrichmentNotes || "Enrichment planning decision recorded."}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Eligibility {formatStatusLabel(action.eligibilityStatus || "unknown")}
                      {action.budgetCheckStatus ? ` · Budget ${formatStatusLabel(action.budgetCheckStatus)}` : ""}
                      {action.modelRouteUsed ? ` · ${action.modelRouteUsed}` : ""}
                      {action.lastProcessedAt ? ` · ${formatDistanceToNow(new Date(action.lastProcessedAt), { addSuffix: true })}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    {action.apolloPlanned || action.hunterPlanned ? (
                      <span className="rounded-full border border-info/30 bg-info/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-info">
                        {action.apolloPlanned && action.hunterPlanned ? "Apollo + Hunter planned" : action.apolloPlanned ? "Apollo planned" : "Hunter planned"}
                      </span>
                    ) : null}
                    {action.requiresApproval ? (
                      <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-warning-foreground">
                        Credit approval required
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )) : <EmptyState title="No enrichment actions yet" description="Dry-run enrichment planning will appear here once the Enrichment Agent processes the queue." />}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Approved Expert campaign foundations and their current approval state.
          </p>
          <div className="mt-5 space-y-3">
            {data.campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {campaign.targetNiche} · {campaign.targetLocation}
                    </p>
                    <p className="mt-2 text-sm">{campaign.objective}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <CampaignStatusBadge status={campaign.status} />
                    <ApprovalStatusBadge status={campaign.approvalStatus} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Approvals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Campaign, template, follow-up, and reply approvals waiting in the platform.
          </p>
          <div className="mt-5 space-y-3">
            {data.approvals.length ? data.approvals.map((approval) => {
              const badgeStatus = approval.decisionStatus === "approved" ? "approved" : approval.decisionStatus === "rejected" ? "rejected" : "pending";
              return (
                <div key={approval.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">{approval.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {approval.entityType} · {approval.approvalType}
                      </p>
                      {approval.decisionNote ? (
                        <p className="mt-2 text-sm text-muted-foreground">{approval.decisionNote}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <ApprovalStatusBadge status={badgeStatus} />
                      {canApprove && approval.decisionStatus === "pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleApprovalDecision(approval.id, "approved")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleApprovalDecision(approval.id, "rejected")}>
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }) : <EmptyState title="No approvals waiting" description="Approval items will appear here when campaigns, templates, follow-ups, or replies need a decision." />}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Open requests</h2>
          <div className="mt-5 space-y-3">
            {data.openRequests.length ? data.openRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-border p-4">
                <p className="font-medium">{request.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{request.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {request.clientVisibleStatus}
                  {request.createdAt ? ` · ${formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}` : ""}
                </p>
              </div>
            )) : <EmptyState title="No open requests" description="Requests created in the existing requests workflow will appear here." />}
          </div>
        </Card>

        {user?.role === "intergrai_admin" ? (
          <Card className="p-6 shadow-card">
            <h2 className="text-lg font-semibold">Internal admin notes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Notes below are visible only to Intergrai administrators.
            </p>
            <div className="mt-5 space-y-3">
              {data.internalNotes.length ? data.internalNotes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-border p-4">
                  <p className="text-sm">{note.note}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {note.createdByName || "Intergrai"}
                    {note.createdByRole ? ` · ${note.createdByRole}` : ""}
                    {note.createdAt ? ` · ${formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}` : ""}
                  </p>
                </div>
              )) : <EmptyState title="No internal notes" description="Private Intergrai-only notes will appear here." />}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function InlineMessage({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return (
    <div className={tone === "success"
      ? "rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
      : "rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"}>
      {children}
    </div>
  );
}

function LeadAgentLoadingState() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Skeleton className="h-36 rounded-[28px]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[420px]" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[380px]" />
        <Skeleton className="h-[380px]" />
      </div>
    </div>
  );
}

function normalizeMetric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}
