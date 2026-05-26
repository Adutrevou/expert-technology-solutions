import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bot, CheckCircle2, Clock3, FileBarChart, LoaderCircle, MailSearch, RefreshCcw, Send, ShieldAlert, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/app-state";
import { useApprovalDecisionMutation, useCreateMissionMutation, useEnrichmentCreditApprovalMutation, useLeadAgentSummaryQuery, useOutreachRenderPreviewQuery, useStartMailboxOAuthMutation } from "@/lib/leads-api-hooks";
import type { LeadAgentSummary } from "@/lib/leads-api";
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

const EMPTY_LEAD_AGENT_SUMMARY: LeadAgentSummary = {
  ok: false,
  client: { id: "", slug: "", name: "" },
  agent: null,
  activeMissions: [],
  openRequests: [],
  campaigns: [],
  leadPipelineCounts: [],
  rawLeadsCount: 0,
  rawLeadStatusCounts: [],
  enrichmentQueueCount: 0,
  enrichmentQueueStatusCounts: [],
  enrichmentUsageSummary: {
    apolloAttempted: 0,
    hunterAttempted: 0,
    apolloUsed: 0,
    hunterUsed: 0,
  },
  enrichmentBudgetSummary: {
    apolloMonthlyLimit: 0,
    apolloUsed: 0,
    apolloRemaining: 0,
    hunterMonthlyLimit: 0,
    hunterUsed: 0,
    hunterRemaining: 0,
  },
  outreachTemplates: [],
  followupSequences: [],
  outreachQueueCount: 0,
  outreachQueueStatusCounts: [],
  outreachQueue: [],
  verifiedContactsCount: 0,
  outreachPlannedCount: 0,
  sendReadyCount: 0,
  waitingForMailboxCount: 0,
  outreachBlockers: [],
  verifiedContactsWaitingForOutreach: [],
  mailboxStatus: "disconnected",
  mailboxConnected: false,
  sendingEnabled: false,
  sendReady: false,
  mailboxFromName: "",
  mailboxFromEmail: "",
  mailboxProviderType: "",
  mailboxDailySendLimit: null,
  mailboxMonthlySendLimit: null,
  mailboxSentToday: 0,
  mailboxSentThisMonth: 0,
  mailboxLastError: "",
  mailboxLastHealthCheckAt: undefined,
  mailboxReadinessBlockers: [],
  mailboxConnectionCheck: null,
  renderPreviewAvailableCount: 0,
  mailboxes: [],
  approvalsWaiting: 0,
  approvals: [],
  pendingEnrichmentCreditApprovals: [],
  latestQualificationActions: [],
  latestEnrichmentActions: [],
  latestWeeklyReport: null,
  internalNotes: [],
};

function LeadAgentPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const createMissionMutation = useCreateMissionMutation();
  const approvalDecisionMutation = useApprovalDecisionMutation();
  const enrichmentCreditApprovalMutation = useEnrichmentCreditApprovalMutation();
  const startMailboxOAuthMutation = useStartMailboxOAuthMutation();

  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [assignedWorkerType, setAssignedWorkerType] = useState<string>(WORKER_OPTIONS[0]);
  const [campaignId, setCampaignId] = useState<string>("none");
  const [selectedQueueItemId, setSelectedQueueItemId] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = summaryQuery.data ?? EMPTY_LEAD_AGENT_SUMMARY;
  const renderPreviewQuery = useOutreachRenderPreviewQuery(selectedQueueItemId || undefined);
  const canApprove = user?.role === "client_owner" || user?.role === "manager" || user?.role === "intergrai_admin";
  const isIntergraiAdmin = user?.role === "intergrai_admin";
  const approvalsByEntityId = useMemo(() => {
    const entries = new Map<string, string>();
    for (const approval of data.approvals || []) {
      if (approval.entityId) {
        entries.set(approval.entityId, approval.id);
      }
    }
    return entries;
  }, [data.approvals]);
  const googleConnectableMailbox = useMemo(() => {
    return (data.mailboxes || []).find((mailbox) => mailbox.providerType === "google_workspace" || mailbox.providerType === "gmail")
      || null;
  }, [data.mailboxes]);
  const latestReportMetrics = useMemo(() => {
    const payload = data?.latestWeeklyReport?.payload || {};
    const metrics = typeof payload.metrics === "object" && payload.metrics ? payload.metrics as Record<string, unknown> : {};
    return [
      ["Leads qualified", normalizeMetric(metrics.leads_qualified)],
      ["Outreach sent", normalizeMetric(metrics.outreach_sent)],
      ["Replies received", normalizeMetric(metrics.replies_received)],
      ["Handoffs", normalizeMetric(metrics.handoffs_to_client)],
    ];
  }, [data.latestWeeklyReport?.payload]);
  const mailboxPrimaryMessage = "Outreach is prepared. Sending is paused until mailbox setup is completed and approved.";
  const mailboxSetupMessage = getMailboxSetupMessage(data);
  const mailboxReadinessMessage = getMailboxReadinessMessage(data);
  const mailboxReadinessTone = getMailboxReadinessTone(data);

  useEffect(() => {
    if (!data.outreachQueue.length) {
      if (selectedQueueItemId) {
        setSelectedQueueItemId("");
      }
      return;
    }

    if (!selectedQueueItemId || !data.outreachQueue.some((item) => item.id === selectedQueueItemId)) {
      setSelectedQueueItemId(data.outreachQueue[0].id);
    }
  }, [data?.outreachQueue, selectedQueueItemId]);

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

  const handleEnrichmentApprovalDecision = async (queueItemId: string, decision: "approved" | "rejected") => {
    setNotice(null);
    setError(null);
    try {
      await enrichmentCreditApprovalMutation.mutateAsync({ queueItemId, decision });
      setNotice(`Enrichment credit request ${decision}.`);
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to update enrichment credit approval.");
    }
  };

  const handleStartMailboxOAuth = async () => {
    if (!googleConnectableMailbox) {
      setError("No mailbox is configured for OAuth connection.");
      return;
    }

    setNotice(null);
    setError(null);

    try {
      const response = await startMailboxOAuthMutation.mutateAsync({ mailboxId: googleConnectableMailbox.id });
      if (!response.authUrl) {
        throw new Error("Mailbox OAuth is unavailable right now.");
      }

      const popup = window.open(response.authUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.assign(response.authUrl);
        return;
      }

      setNotice(`Google OAuth opened for ${response.mailboxName}. Connection can complete there, but sending remains disabled.`);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to start mailbox OAuth.");
    }
  };

  const isGoogleMailboxProvider = data.mailboxProviderType === "google_workspace" || data.mailboxProviderType === "gmail";

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <LeadAgentLoadingState />;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {summaryQuery.isError ? (
        <WarningCard
          title="Lead Agent data is partially unavailable"
          message={(summaryQuery.error as Error | undefined)?.message || "Some workspace data could not be loaded. Fallback values are shown until the next refresh."}
          action={(
            <Button variant="outline" onClick={() => summaryQuery.refetch()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          )}
        />
      ) : null}

      <header className="rounded-[28px] border border-border/70 bg-gradient-subtle px-6 py-6 shadow-card md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-muted-foreground">Expert Lead Agent</p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Lead Agent Workspace</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Campaign progress, outreach readiness, pipeline visibility, and weekly reporting in one workspace.
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
                {safeDistanceLabel(data.agent?.lastHeartbeatAt)
                  ? ` · heartbeat ${safeDistanceLabel(data.agent?.lastHeartbeatAt)}`
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <KpiCard label="Active missions" value={data.activeMissions.length} icon={Clock3} />
        <KpiCard label="Open requests" value={data.openRequests.length} icon={Sparkles} />
        <KpiCard label="Raw leads" value={data.rawLeadsCount} icon={ShieldAlert} />
        <KpiCard label="Enrichment queue" value={data.enrichmentQueueCount} icon={LoaderCircle} />
        <KpiCard label="Outreach queue" value={data.outreachQueueCount} icon={Send} />
        <KpiCard label="Verified contacts" value={data.verifiedContactsCount} icon={CheckCircle2} />
        <KpiCard label="Outreach planned" value={data.outreachPlannedCount} icon={Send} />
        <KpiCard label="Send ready" value={data.sendReadyCount} icon={CheckCircle2} />
        <KpiCard label="Waiting mailbox" value={data.waitingForMailboxCount} icon={ShieldAlert} />
        <KpiCard label="Approvals waiting" value={data.approvalsWaiting} icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Create a new mission</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each instruction creates a tracked mission for the Expert Lead Agent.
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
                Client-ready summary of progress, pipeline movement, and next steps.
              </p>
            </div>
            <FileBarChart className="h-5 w-5 text-primary" />
          </div>

          {data.latestWeeklyReport ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">{data.latestWeeklyReport.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateRange(data.latestWeeklyReport.periodStart, data.latestWeeklyReport.periodEnd)}
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
            <EmptyState title="No weekly report yet" description="Your first weekly update will appear here once the next reporting cycle is published." />
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
            Current work assigned through the Expert workspace.
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
                      {safeDistanceLabel(mission.createdAt) ? ` · ${safeDistanceLabel(mission.createdAt)}` : ""}
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
            Early-stage sourcing and review progress before leads are promoted into the working pipeline.
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
            Recent qualification decisions, scoring updates, and review outcomes.
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
                      {safeDistanceLabel(action.updatedAt) ? ` · ${safeDistanceLabel(action.updatedAt)}` : ""}
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
            Planning, approvals, and provider-readiness before any contact lookup is approved.
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

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Apollo allowance</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.enrichmentBudgetSummary.apolloRemaining}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.enrichmentBudgetSummary.apolloUsed} used of {data.enrichmentBudgetSummary.apolloMonthlyLimit}
              </p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Hunter allowance</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.enrichmentBudgetSummary.hunterRemaining}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.enrichmentBudgetSummary.hunterUsed} used of {data.enrichmentBudgetSummary.hunterMonthlyLimit}
              </p>
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
                      {action.creditApprovalStatus ? ` · Credit ${formatStatusLabel(action.creditApprovalStatus)}` : ""}
                      {action.providerStatus ? ` · Provider ${formatStatusLabel(action.providerStatus)}` : ""}
                      {action.modelRouteUsed ? ` · ${action.modelRouteUsed}` : ""}
                      {safeDistanceLabel(action.lastProcessedAt) ? ` · ${safeDistanceLabel(action.lastProcessedAt)}` : ""}
                    </p>
                    {action.enrichedEmail || action.enrichedContactName ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {action.enrichedContactName ? `${action.enrichedContactName}` : "Contact pending"}
                        {action.enrichedContactTitle ? ` · ${action.enrichedContactTitle}` : ""}
                        {action.enrichedEmail ? ` · ${action.enrichedEmail}` : ""}
                        {action.enrichedEmailStatus ? ` (${formatStatusLabel(action.enrichedEmailStatus)})` : ""}
                      </p>
                    ) : null}
                    {action.providerError ? (
                      <p className="mt-2 text-xs text-destructive">{action.providerError}</p>
                    ) : null}
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
            )) : <EmptyState title="No enrichment actions yet" description="Enrichment planning updates will appear here once queued records are reviewed." />}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current campaign foundations and their approval status.
          </p>
          <div className="mt-5 space-y-3">
            {data.campaigns.length ? data.campaigns.map((campaign) => (
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
            )) : <EmptyState title="No campaigns yet" description="Campaign records will appear here as soon as campaign planning is published into the workspace." />}
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Enrichment credit approvals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review enrichment spend requests before any Apollo or Hunter credits are used.
          </p>
          <div className="mt-5 space-y-3">
            {data.pendingEnrichmentCreditApprovals.length ? data.pendingEnrichmentCreditApprovals.map((approval) => (
              <div key={approval.queueItemId} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{approval.companyName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Raw lead {formatStatusLabel(approval.rawLeadStatus)} · Queue {formatStatusLabel(approval.queueStatus)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Campaign: {approval.campaignName || "No linked campaign"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Apollo {approval.apolloPlanned ? "planned" : "off"} · Hunter {approval.hunterPlanned ? "planned" : "off"}
                      {safeDistanceLabel(approval.createdAt) ? ` · ${safeDistanceLabel(approval.createdAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <ApprovalStatusBadge
                      status={
                        approval.creditApprovalStatus === "approved"
                          ? "approved"
                          : approval.creditApprovalStatus === "declined"
                            ? "rejected"
                            : "pending"
                      }
                    />
                    {canApprove ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={enrichmentCreditApprovalMutation.isPending}
                          onClick={() => handleEnrichmentApprovalDecision(approval.queueItemId, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={enrichmentCreditApprovalMutation.isPending}
                          onClick={() => handleEnrichmentApprovalDecision(approval.queueItemId, "rejected")}
                        >
                          Decline
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )) : <EmptyState title="No enrichment approvals waiting" description="Dry-run enrichment requests will appear here when credits need an explicit approval decision." />}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Outreach templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            First-contact drafts stay paused until approvals, follow-up rules, and mailbox setup are complete.
          </p>
          <div className="mt-5 space-y-4">
            {data.outreachTemplates.length ? data.outreachTemplates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{template.campaignName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {template.name} · {formatStatusLabel(template.templateType)}
                    </p>
                  </div>
                  <ApprovalStatusBadge status={template.approvalStatus === "rejected" ? "rejected" : template.approvalStatus === "approved" ? "approved" : "pending"} />
                </div>
                <div className="mt-4 space-y-3">
                  {template.variants.map((variant) => (
                    <div key={variant.id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium">Variant {variant.variantLabel}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{variant.subjectTemplate}</p>
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{variant.bodyTemplate}</p>
                        </div>
                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <ApprovalStatusBadge status={variant.approvalStatus === "rejected" ? "rejected" : variant.approvalStatus === "approved" ? "approved" : "pending"} />
                          {canApprove && variant.approvalStatus !== "approved" ? (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleApprovalDecision(approvalsByEntityId.get(variant.id) || "", "approved")} disabled={!approvalsByEntityId.get(variant.id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleApprovalDecision(approvalsByEntityId.get(variant.id) || "", "rejected")} disabled={!approvalsByEntityId.get(variant.id)}>
                                Decline
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )) : <EmptyState title="No outreach templates yet" description="Campaign-specific first-contact drafts will appear here once they are prepared." />}
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Follow-up rules and queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mailbox readiness is checked before outreach can move forward. Sending remains paused for pre-launch setup.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mailbox status</p>
              <p className="mt-2 text-2xl font-semibold">{formatStatusLabel(data.mailboxStatus)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Connected {data.mailboxConnected ? "yes" : "no"} · Sending enabled {data.sendingEnabled ? "yes" : "no"} · Send-ready {data.sendReady ? "yes" : "no"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.mailboxFromEmail ? `${data.mailboxFromName || "Configured sender"} <${data.mailboxFromEmail}>` : "No sender configured yet"}
                {data.mailboxProviderType ? ` · ${formatStatusLabel(data.mailboxProviderType)}` : ""}
              </p>
              {data.mailboxConnectionCheck ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Check {formatStatusLabel(data.mailboxConnectionCheck.connectionStatus)}
                  {` · Configured ${data.mailboxConnectionCheck.configured ? "yes" : "no"}`}
                  {data.mailboxConnectionCheck.senderStatus ? ` · Sender ${formatStatusLabel(data.mailboxConnectionCheck.senderStatus)}` : ""}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-medium text-foreground">
                {mailboxPrimaryMessage}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {mailboxSetupMessage}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sending limits</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Daily {data.mailboxDailySendLimit ?? "Not set"} · Monthly {data.mailboxMonthlySendLimit ?? "Not set"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Sent today {data.mailboxSentToday} · Sent this month {data.mailboxSentThisMonth}
              </p>
              {mailboxReadinessMessage ? (
                <p className={`mt-2 text-xs ${mailboxReadinessTone === "warning" ? "text-destructive" : "text-muted-foreground"}`}>
                  {mailboxReadinessMessage}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Mailbox readiness checks are clear, but sending remains paused until launch approval.</p>
              )}
            </div>
          </div>

          {isIntergraiAdmin ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Mailbox provider configuration</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Admin-only provider overview. Credentials stay server-side and sending remains paused.
                  </p>
                </div>
                {isGoogleMailboxProvider ? (
                  <Button
                    size="sm"
                    onClick={handleStartMailboxOAuth}
                    disabled={!googleConnectableMailbox || startMailboxOAuthMutation.isPending}
                    className="gap-2"
                  >
                    {startMailboxOAuthMutation.isPending ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Opening Google OAuth
                      </>
                    ) : (
                      <>
                        <MailSearch className="h-4 w-4" />
                        Connect Google Workspace
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Provider type</p>
                  <p className="mt-2 font-medium">{formatStatusLabel(data.mailboxProviderType || "other")}</p>
                </div>
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Connection status</p>
                  <p className="mt-2 font-medium">{formatStatusLabel(data.mailboxStatus)}</p>
                </div>
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">From name</p>
                  <p className="mt-2 font-medium">{data.mailboxFromName || "Not configured"}</p>
                </div>
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">From email</p>
                  <p className="mt-2 font-medium break-all">{data.mailboxFromEmail || "Not configured"}</p>
                </div>
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Daily / monthly limits</p>
                  <p className="mt-2 font-medium">{data.mailboxDailySendLimit ?? "Not set"} / {data.mailboxMonthlySendLimit ?? "Not set"}</p>
                </div>
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Sending enabled</p>
                  <p className="mt-2 font-medium">{data.sendingEnabled ? "Yes" : "No"}</p>
                </div>
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Provider check</p>
                  <p className="mt-2 font-medium">{formatStatusLabel(data.mailboxConnectionCheck?.connectionStatus || "not_connected")}</p>
                </div>
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Sender verification</p>
                  <p className="mt-2 font-medium">{formatStatusLabel(data.mailboxConnectionCheck?.senderStatus || "pending")}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {isGoogleMailboxProvider && googleConnectableMailbox
                  ? `OAuth will be started for ${googleConnectableMailbox.mailboxName} <${googleConnectableMailbox.fromEmail}>.`
                  : "Google OAuth is only available when the mailbox provider is Google Workspace or Gmail."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Resend, SMTP, and future providers can be reviewed here without exposing credentials in the workspace.
              </p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Queue waiting for mailbox</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.waitingForMailboxCount}</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Queue send-ready</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.sendReadyCount}</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Render previews available</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.renderPreviewAvailableCount}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {data.followupSequences.length ? data.followupSequences.map((sequence) => (
              <div key={sequence.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{sequence.campaignName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sequence.name} · {sequence.followupCount} follow-ups
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <ApprovalStatusBadge status={sequence.approvalStatus === "rejected" ? "rejected" : sequence.approvalStatus === "approved" ? "approved" : "pending"} />
                    {canApprove && sequence.approvalStatus !== "approved" ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleApprovalDecision(approvalsByEntityId.get(sequence.id) || "", "approved")} disabled={!approvalsByEntityId.get(sequence.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleApprovalDecision(approvalsByEntityId.get(sequence.id) || "", "rejected")} disabled={!approvalsByEntityId.get(sequence.id)}>
                          Decline
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )) : <EmptyState title="No follow-up rules yet" description="Follow-up approval drafts will appear here once outreach sequencing is prepared." />}
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold">Outreach queue</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {data.outreachQueueStatusCounts.length ? data.outreachQueueStatusCounts.map((item) => (
                <div key={item.status} className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatStatusLabel(item.status)}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{item.count}</p>
                </div>
              )) : <EmptyState title="No outreach queue statuses yet" description="Outreach planning states will appear here after a verified contact is prepared for review." />}
            </div>

            <div className="mt-4 space-y-3">
              {data.outreachQueue.length ? data.outreachQueue.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">{item.rawCompanyName || item.leadCompanyName || "Unnamed prospect"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.campaignName} · {formatStatusLabel(item.status)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Approval {formatStatusLabel(item.approvalStatus)} · Mailbox {formatStatusLabel(item.mailboxStatus)}
                        {item.variantLabel ? ` · Variant ${item.variantLabel}` : ""}
                        {item.sequenceName ? ` · ${item.sequenceName}` : ""}
                      </p>
                      {item.recipientEmail ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.recipientName || "Recipient"} · {item.recipientEmail}
                        </p>
                      ) : null}
                      {item.blockers.length ? (
                        <p className="mt-2 text-xs text-destructive">
                          {item.blockers.map((blocker) => blocker.message || formatStatusLabel(blocker.code)).join(" | ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <Button
                        size="sm"
                        variant={selectedQueueItemId === item.id ? "default" : "outline"}
                        onClick={() => setSelectedQueueItemId(item.id)}
                        className="gap-2"
                      >
                        <MailSearch className="h-4 w-4" />
                        Preview
                      </Button>
                      <span className="text-[11px] text-muted-foreground">
                        {item.renderPreviewAvailable ? "Preview available" : "Preview blocked"}
                      </span>
                    </div>
                  </div>
                </div>
              )) : <EmptyState title="No outreach queued yet" description="Planned outreach records will appear here once contacts move into the outreach review queue." />}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold">Rendered email preview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview approved outreach content here. This view cannot send email.
            </p>
            <div className="mt-4 rounded-2xl border border-border p-4">
              {renderPreviewQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : renderPreviewQuery.isError ? (
                <WarningCard
                  title="Email preview unavailable"
                  message={(renderPreviewQuery.error as Error | undefined)?.message || "The selected outreach preview could not be loaded."}
                  compact
                  action={selectedQueueItemId ? (
                    <Button size="sm" variant="outline" onClick={() => renderPreviewQuery.refetch()}>
                      Retry preview
                    </Button>
                  ) : undefined}
                />
              ) : renderPreviewQuery.data?.preview ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
                      <p className="mt-2 text-sm font-medium">
                        {renderPreviewQuery.data.preview.fromName || "Configured sender"} &lt;{renderPreviewQuery.data.preview.fromEmail || "-"}&gt;
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">To</p>
                      <p className="mt-2 text-sm font-medium">
                        {renderPreviewQuery.data.preview.recipientName || "Recipient"} &lt;{renderPreviewQuery.data.preview.recipientEmail || "-"}&gt;
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Subject</p>
                    <p className="mt-2 text-sm font-medium">{renderPreviewQuery.data.preview.subject || "No subject rendered"}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Body</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-foreground">{renderPreviewQuery.data.preview.body || "No body rendered"}</pre>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Variant {renderPreviewQuery.data.preview.template.variantLabel || "-"} · {formatStatusLabel(renderPreviewQuery.data.preview.template.type || "email")} · Follow-up {renderPreviewQuery.data.preview.followupSequence.name || "-"} ({renderPreviewQuery.data.preview.followupSequence.followupCount} steps)
                  </p>
                  {renderPreviewQuery.data.preview.missingPlaceholders.length ? (
                    <p className="text-xs text-destructive">
                      Missing placeholders: {renderPreviewQuery.data.preview.missingPlaceholders.join(", ")}
                    </p>
                  ) : null}
                  <p className="text-xs text-destructive">
                    {renderPreviewQuery.data.readiness.blockers.length
                      ? renderPreviewQuery.data.readiness.blockers.map((blocker) => blocker.message || formatStatusLabel(blocker.code)).join(" | ")
                      : "Sending remains paused until launch approval and mailbox setup are complete."}
                  </p>
                </div>
              ) : (
                <EmptyState title="No preview selected" description="Choose an outreach queue item to render its email preview." />
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold">Verified contacts waiting for outreach planning</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified contacts remain paused here until template approval, follow-up approval, and mailbox setup are complete.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {data.outreachBlockers.length ? data.outreachBlockers.map((blocker) => (
                <div key={blocker.code} className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatStatusLabel(blocker.code)}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{blocker.count || 0}</p>
                </div>
              )) : <EmptyState title="No outreach blockers" description="Verified contacts can move into planning as soon as mailbox setup is completed, with sending still paused." />}
            </div>

            <div className="mt-4 space-y-3">
              {data.verifiedContactsWaitingForOutreach.length ? data.verifiedContactsWaitingForOutreach.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium">{item.companyName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.contactName || "Verified contact"}{item.contactTitle ? ` · ${item.contactTitle}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.email || "No verified email"}{item.emailStatus ? ` · ${formatStatusLabel(item.emailStatus)}` : ""}
                        {item.providerStatus ? ` · Provider ${formatStatusLabel(item.providerStatus)}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.campaignName} · Planning {formatStatusLabel(item.planningStatus)}
                        {item.outreachQueueStatus ? ` · Queue ${formatStatusLabel(item.outreachQueueStatus)}` : ""}
                        {item.mailboxStatus ? ` · Mailbox ${formatStatusLabel(item.mailboxStatus)}` : ""}
                      </p>
                      {item.variantLabel || item.sequenceName ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.variantLabel ? `Variant ${item.variantLabel}` : "Template pending"}
                          {item.sequenceName ? ` · ${item.sequenceName}` : ""}
                        </p>
                      ) : null}
                      {item.blockers.length ? (
                        <p className="mt-2 text-xs text-destructive">
                          {item.blockers.map((blocker) => blocker.message || formatStatusLabel(blocker.code)).join(" | ")}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Ready for queue planning. Sending will remain paused until mailbox setup is completed and approved.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <ApprovalStatusBadge status={item.approvalStatus === "approved" ? "approved" : "pending"} />
                      {item.outreachQueueId ? (
                        <span className="rounded-full border border-info/30 bg-info/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-info">
                          Queue created
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )) : <EmptyState title="No verified contacts yet" description="Verified contacts will appear here after approved enrichment confirms a usable email address." />}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">Approvals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Campaign, template, follow-up, and reply approvals waiting for review.
          </p>
          <div className="mt-5 space-y-3">
            {data.approvals.filter((approval) => approval.approvalType !== "credit_approval").length ? data.approvals.filter((approval) => approval.approvalType !== "credit_approval").map((approval) => {
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
                  {safeDistanceLabel(request.createdAt) ? ` · ${safeDistanceLabel(request.createdAt)}` : ""}
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
                    {safeDistanceLabel(note.createdAt) ? ` · ${safeDistanceLabel(note.createdAt)}` : ""}
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

function WarningCard({
  title,
  message,
  action,
  compact = false,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <Card className={compact ? "border-warning/40 bg-warning/5 p-4 shadow-card" : "border-warning/40 bg-warning/5 p-5 shadow-card"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Card>
  );
}

function LeadAgentLoadingState() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Skeleton className="h-36 rounded-[28px]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
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

function safeDistanceLabel(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

function formatDateRange(start?: string, end?: string) {
  const startLabel = start || "Unknown start";
  const endLabel = end || "Unknown end";
  return `${startLabel} to ${endLabel}`;
}

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function getMailboxSetupMessage(data: LeadAgentSummary) {
  const check = data.mailboxConnectionCheck;
  const providerType = String(check?.providerType || data.mailboxProviderType || "").toLowerCase();

  if (providerType === "resend" && check?.apiKeyConfigured === false) {
    return "Resend launch-day setup is still pending. This is expected before go-live and is not an error.";
  }

  if (providerType === "resend") {
    return "Resend remains in pre-launch pending status. Sending will stay paused until launch-day setup and approval are complete.";
  }

  return "Mailbox setup is still being finalized. Sending will stay paused until configuration, approval, and launch-day activation are complete.";
}

function getMailboxReadinessMessage(data: LeadAgentSummary) {
  const expectedMessage = getExpectedMailboxPendingMessage(data);
  if (expectedMessage) return expectedMessage;
  if (data.mailboxLastError) return data.mailboxLastError;
  if (data.mailboxReadinessBlockers.length) {
    return data.mailboxReadinessBlockers.map((blocker) => blocker.message || formatStatusLabel(blocker.code)).join(" | ");
  }
  return "";
}

function getMailboxReadinessTone(data: LeadAgentSummary): "info" | "warning" {
  return getExpectedMailboxPendingMessage(data) ? "info" : "warning";
}

function getExpectedMailboxPendingMessage(data: LeadAgentSummary) {
  const codes = new Set(data.mailboxReadinessBlockers.map((blocker) => blocker.code));
  const check = data.mailboxConnectionCheck;
  const providerType = String(check?.providerType || data.mailboxProviderType || "").toLowerCase();
  const message = String(data.mailboxLastError || "").toLowerCase();

  if (
    providerType === "resend"
    && (
      check?.apiKeyConfigured === false
      || codes.has("missing_resend_config")
      || message.includes("resend")
      || message.includes("api key")
    )
  ) {
    return "Resend API setup is planned for launch day. Outreach stays prepared and no sending is enabled before then.";
  }

  if (
    codes.has("mailbox_pending")
    || codes.has("sending_disabled")
    || codes.has("sender_not_verified")
    || data.mailboxStatus === "pending"
  ) {
    return "Mailbox approval and verification are still pending, which is expected before launch. Sending remains paused.";
  }

  return "";
}
