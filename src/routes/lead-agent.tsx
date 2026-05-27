import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ApprovalStatusBadge, LeadStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/app-state";
import {
  useApprovalDecisionMutation,
  useCreateMissionMutation,
  useEnrichmentCreditApprovalMutation,
  useLeadAgentSummaryQuery,
  useOutreachRenderPreviewQuery,
} from "@/lib/leads-api-hooks";
import type { ApprovalRecord, LeadAgentSummary } from "@/lib/leads-api";

export const Route = createFileRoute("/lead-agent")({
  head: () => ({ meta: [{ title: "Expert Lead Agent — Expert Technology Solutions" }] }),
  component: LeadAgentPage,
});

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
  mailboxStatus: "pending",
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

const PROMPT_SUGGESTIONS = [
  "Find more leads like this",
  "Prioritise restaurants this week",
  "Show prepared outreach",
  "Create a suggested campaign",
] as const;

const PIPELINE_STAGES = [
  "Found",
  "Qualified",
  "Prepared for Outreach",
  "Contacted",
  "Interested",
  "Meetings / Quote Requests",
] as const;

function LeadAgentPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const createMissionMutation = useCreateMissionMutation();
  const approvalDecisionMutation = useApprovalDecisionMutation();
  const enrichmentDecisionMutation = useEnrichmentCreditApprovalMutation();

  const [prompt, setPrompt] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [selectedQueueItemId, setSelectedQueueItemId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = summaryQuery.data ?? EMPTY_LEAD_AGENT_SUMMARY;
  const renderPreviewQuery = useOutreachRenderPreviewQuery(selectedQueueItemId || undefined);
  const isAdmin = user?.role === "intergrai_admin";
  const canApprove = user?.role === "client_owner" || user?.role === "manager" || isAdmin;
  const generalApprovals = useMemo(
    () => data.approvals.filter((approval) => approval.approvalType !== "credit_approval"),
    [data.approvals],
  );
  const pendingApprovals = useMemo(
    () => generalApprovals.filter((approval) => approval.decisionStatus === "pending"),
    [generalApprovals],
  );

  useEffect(() => {
    if (!data.outreachQueue.length) {
      if (selectedQueueItemId) setSelectedQueueItemId("");
      return;
    }

    if (!selectedQueueItemId || !data.outreachQueue.some((item) => item.id === selectedQueueItemId)) {
      const preferredItem = data.outreachQueue.find((item) => item.renderPreviewAvailable) || data.outreachQueue[0];
      setSelectedQueueItemId(preferredItem.id);
    }
  }, [data.outreachQueue, selectedQueueItemId]);

  const metrics = useMemo(() => {
    const qualified = Math.max(
      data.verifiedContactsCount,
      sumPipelineKeywords(data, ["qualified", "verified", "approved", "contact_verified"]),
    );
    const prepared = Math.max(data.outreachPlannedCount, data.outreachQueueCount);
    const contacted = Math.max(data.mailboxSentThisMonth, sumPipelineKeywords(data, ["contacted", "sent", "delivered"]));
    const interested = sumPipelineKeywords(data, ["interested", "positive", "replied"]);
    const meetings = sumPipelineKeywords(data, ["meeting", "quote", "handoff", "converted"]);
    const approvalsWaiting = pendingApprovals.length + data.pendingEnrichmentCreditApprovals.length;

    return {
      totalLeadsFound: data.rawLeadsCount,
      qualifiedLeads: qualified,
      outreachPrepared: prepared,
      emailsSent: data.mailboxSentThisMonth,
      positiveReplies: interested,
      meetings,
      approvalsWaiting,
      pipeline: [
        { label: PIPELINE_STAGES[0], count: data.rawLeadsCount, note: "New opportunities identified." },
        { label: PIPELINE_STAGES[1], count: qualified, note: "Leads that match your target profile." },
        { label: PIPELINE_STAGES[2], count: prepared, note: "Prepared outreach waiting safely in queue." },
        { label: PIPELINE_STAGES[3], count: contacted, note: "Will remain at 0 until launch approval." },
        { label: PIPELINE_STAGES[4], count: interested, note: "Positive engagement from outreach." },
        { label: PIPELINE_STAGES[5], count: meetings, note: "Meetings or quote requests created." },
      ],
    };
  }, [data, pendingApprovals.length]);

  const recentInteractions = useMemo(() => {
    return [
      ...data.activeMissions.map((mission) => ({
        id: `mission-${mission.id}`,
        title: mission.title,
        detail: mission.instruction || "Mission created",
        status: mission.status,
        createdAt: mission.createdAt || mission.updatedAt,
        kind: "mission",
      })),
      ...data.openRequests.map((request) => ({
        id: `request-${request.id}`,
        title: request.title,
        detail: request.latestReply || request.message || "Request recorded",
        status: request.clientVisibleStatus,
        createdAt: request.createdAt || request.latestReplyAt,
        kind: "request",
      })),
    ]
      .sort((left, right) => compareDatesDesc(left.createdAt, right.createdAt))
      .slice(0, 5);
  }, [data.activeMissions, data.openRequests]);

  const quietWorkspace = data.activeMissions.length === 0 || recentInteractions.length <= 1;
  const showActionableApprovals = canApprove && (pendingApprovals.length > 0 || data.pendingEnrichmentCreditApprovals.length > 0);
  const mailboxMessage = getMailboxClientMessage(data);
  const mailboxDetail = getMailboxSetupMessage(data);
  const selectedQueueItem = data.outreachQueue.find((item) => item.id === selectedQueueItemId) || data.outreachQueue[0] || null;

  const createMissionFromPrompt = async (value: string) => {
    const nextPrompt = value.trim();
    if (!nextPrompt) {
      setError("Enter an instruction for Expert Lead Agent.");
      return;
    }

    setError(null);
    setNotice(null);

    try {
      const mission = await createMissionMutation.mutateAsync({
        title: buildMissionTitle(nextPrompt),
        instruction: nextPrompt,
        assigned_worker_type: inferWorkerType(nextPrompt),
      });
      setPrompt("");
      setPendingPrompt(null);
      setNotice(`Tracked instruction created: ${mission.title}`);
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to create that instruction.");
    }
  };

  const handlePromptSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPrompt = prompt.trim();

    if (!nextPrompt) {
      setError("Enter an instruction for Expert Lead Agent.");
      return;
    }

    if (isSimpleQuestion(nextPrompt)) {
      setPendingPrompt(null);
      setError(null);
      setNotice("Question noted. For launch, simple questions are acknowledged here and action requests create tracked missions.");
      return;
    }

    if (requiresConfirmation(nextPrompt)) {
      setPendingPrompt(nextPrompt);
      setError(null);
      setNotice("This request affects campaign scope, spend, or launch readiness. Confirm before a mission is created.");
      return;
    }

    await createMissionFromPrompt(nextPrompt);
  };

  const handleApprovalDecision = async (approvalId: string, decision: "approved" | "rejected", note?: string) => {
    setError(null);
    setNotice(null);

    try {
      await approvalDecisionMutation.mutateAsync({
        approvalId,
        decision,
        decision_note: note,
      });
      setNotice(decision === "approved" ? "Approval recorded." : "Change request recorded.");
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to update approval.");
    }
  };

  const handleCreditDecision = async (queueItemId: string, decision: "approved" | "rejected") => {
    setError(null);
    setNotice(null);

    try {
      await enrichmentDecisionMutation.mutateAsync({ queueItemId, decision });
      setNotice(decision === "approved" ? "Approval recorded." : "Change request recorded.");
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to update approval.");
    }
  };

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <LeadAgentLoadingState />;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {summaryQuery.isError ? (
        <WarningCard
          title="Lead Agent data is partially unavailable"
          message={(summaryQuery.error as Error | undefined)?.message || "Some workspace data could not be loaded. Shown values may be incomplete until the next refresh."}
          action={(
            <Button variant="outline" onClick={() => summaryQuery.refetch()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          )}
        />
      ) : null}

      <header className="rounded-[28px] border border-border/70 bg-gradient-subtle px-6 py-6 shadow-card md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">Expert Lead Agent</Badge>
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Outreach safely paused</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Pipeline building is active</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
              Expert Lead Agent is building your pipeline. Lead sourcing and qualification are active, outreach is prepared, and sending is safely paused until mailbox setup and launch approval are complete.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm shadow-sm">
              <div className="flex items-center gap-2 font-medium">
                <Bot className="h-4 w-4 text-primary" />
                {data.agent?.name || "Expert Lead Agent"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatFriendlyLabel(data.agent?.status || "active")}
                {safeDistanceLabel(data.agent?.lastHeartbeatAt) ? ` · updated ${safeDistanceLabel(data.agent?.lastHeartbeatAt)}` : ""}
              </p>
            </div>
            <Button variant="outline" onClick={() => summaryQuery.refetch()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <KpiCard label="Total Leads Found" value={metrics.totalLeadsFound} note="Leads identified for review." />
        <KpiCard label="Qualified Leads" value={metrics.qualifiedLeads} note="Leads that match your target profile." />
        <KpiCard label="Outreach Prepared" value={metrics.outreachPrepared} note="Approved outreach prepared, waiting for mailbox setup." />
        <KpiCard label="Emails Sent" value={metrics.emailsSent} note="Will remain 0 until launch approval." />
        <KpiCard label="Positive Replies" value={metrics.positiveReplies} note="Positive engagement from outreach." />
        <KpiCard label="Meetings / Quote Requests" value={metrics.meetings} note="Qualified handoffs ready for follow-up." />
        <KpiCard label="Approvals Waiting" value={metrics.approvalsWaiting} note="Items waiting for a decision." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Pipeline overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A simple view of where opportunities are moving next.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/leads">View Leads</Link>
            </Button>
          </div>

          <div className="mt-6 hidden gap-3 lg:grid lg:grid-cols-6">
            {metrics.pipeline.map((stage, index) => (
              <div key={stage.label} className="relative">
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{stage.label}</p>
                  <p className="mt-3 text-3xl font-semibold tabular-nums">{stage.count}</p>
                </div>
                {index < metrics.pipeline.length - 1 ? (
                  <div className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 hidden h-px w-3 -translate-y-1/2 bg-border xl:block" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.pipeline.map((stage) => (
              <div key={stage.label} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{stage.label}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{stage.count}</p>
                <p className="mt-2 text-sm text-muted-foreground">{stage.note}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Active work</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your lead generation workflow is active. The agent is preparing qualified opportunities and keeping outreach paused until launch approval.
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <SummaryStat label="Active missions" value={data.activeMissions.length} />
            <SummaryStat label="Open requests" value={data.openRequests.length} />
            <SummaryStat label="Prepared previews" value={data.renderPreviewAvailableCount} />
          </div>

          <div className="mt-5 space-y-3">
            {data.activeMissions.slice(0, 3).map((mission) => (
              <div key={mission.id} className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{mission.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{mission.instruction}</p>
                  </div>
                  <LeadStatusBadge status={mission.status.toLowerCase().replace(/\s+/g, "_")} />
                </div>
              </div>
            ))}
            {data.activeMissions.length === 0 ? (
              <EmptyState title="No active missions right now" description="Use the instruction area below to guide what the agent should focus on next." />
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Ask Expert Lead Agent what you’d like to focus on next…</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Simple questions get a quick acknowledgement. Action requests create scoped missions. Campaign, cost, and launch-impacting changes require confirmation first.
              </p>
            </div>
            <Send className="h-5 w-5 text-primary" />
          </div>

          <form onSubmit={handlePromptSubmit} className="mt-5 rounded-[28px] border border-border/70 bg-background p-4 shadow-sm">
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Find more leads like Liquid Technology in Johannesburg"
              className="h-12 rounded-2xl border-0 bg-muted/20 px-4 text-sm shadow-none focus-visible:ring-0"
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="submit" className="gap-2" disabled={createMissionMutation.isPending}>
                <Send className="h-4 w-4" />
                {createMissionMutation.isPending ? "Creating mission..." : "Send instruction"}
              </Button>
              {pendingPrompt ? (
                <>
                  <Button type="button" variant="outline" onClick={() => createMissionFromPrompt(pendingPrompt)} disabled={createMissionMutation.isPending}>
                    Confirm scoped mission
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPendingPrompt(null)}>
                    Cancel
                  </Button>
                </>
              ) : null}
            </div>

            {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
            {notice ? <InlineMessage tone="success">{notice}</InlineMessage> : null}
          </form>

          {quietWorkspace ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition hover:bg-accent"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Recent instructions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Only the latest few interactions are shown here for launch.
              </p>
            </div>
            <Clock3 className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 space-y-3">
            {recentInteractions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.detail}</p>
                  </div>
                  <Badge variant="outline" className="border-border/70 bg-muted/20 text-[10px] uppercase tracking-wide">
                    {item.kind}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatFriendlyLabel(item.status)}{safeDistanceLabel(item.createdAt) ? ` · ${safeDistanceLabel(item.createdAt)}` : ""}
                </p>
              </div>
            ))}
            {recentInteractions.length === 0 ? (
              <EmptyState title="No recent instructions yet" description="Once an instruction or request is created, the latest activity will appear here." />
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Approvals / Actions Needed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Client-facing approvals are kept simple here. Full approval history lives on the Approvals page.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/approvals" className="gap-2">
              Open Approvals
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {showActionableApprovals ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {pendingApprovals.slice(0, 2).map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                canApprove={canApprove}
                busy={approvalDecisionMutation.isPending}
                onApprove={() => handleApprovalDecision(approval.id, "approved")}
                onRequestChanges={() => handleApprovalDecision(approval.id, "rejected", "Client requested changes from the Lead Agent workspace.")}
              />
            ))}
            {data.pendingEnrichmentCreditApprovals.slice(0, 2).map((approval) => (
              <div key={approval.queueItemId} className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{approval.companyName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Waiting for enrichment approval before any contact verification work can continue.</p>
                    <p className="mt-2 text-xs text-muted-foreground">{approval.campaignName || "Unassigned campaign"}</p>
                  </div>
                  <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Pending</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleCreditDecision(approval.queueItemId, "approved")} disabled={enrichmentDecisionMutation.isPending}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleCreditDecision(approval.queueItemId, "rejected")} disabled={enrichmentDecisionMutation.isPending}>
                    Request Changes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-6">
            <p className="font-medium">No approvals waiting</p>
            <p className="mt-2 text-sm text-muted-foreground">
              New approvals will appear here only when a decision is relevant to your role.
            </p>
          </div>
        )}
      </Card>

      <Card className="p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Outreach preparation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepared only — not sent yet. Sending is paused until mailbox setup and launch approval are complete.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/templates">Open Templates</Link>
          </Button>
        </div>

        {data.outreachQueue.length > 0 ? (
          <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {data.outreachQueue.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedQueueItemId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedQueueItemId === item.id ? "border-primary bg-primary/5 shadow-sm" : "border-border/70 bg-background hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.rawCompanyName || item.leadCompanyName || "Prepared outreach"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.campaignName || "No campaign linked"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.variantLabel ? `Variant ${item.variantLabel}` : "Template variant pending"} · {mapClientStatusLabel(item.mailboxStatus)}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-border/70 bg-muted/20 text-[10px] uppercase tracking-wide">
                      Prepared
                    </Badge>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-[28px] border border-border/70 bg-background p-5">
              {renderPreviewQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-56 w-full" />
                </div>
              ) : renderPreviewQuery.data?.preview ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Prepared</Badge>
                    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Waiting for mailbox setup</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <PreviewMeta label="Recipient" value={`${renderPreviewQuery.data.preview.recipientName || "Recipient"}${renderPreviewQuery.data.preview.companyName ? ` · ${renderPreviewQuery.data.preview.companyName}` : ""}`} />
                    <PreviewMeta label="Campaign" value={selectedQueueItem?.campaignName || "No campaign linked"} />
                    <PreviewMeta label="Template variant" value={renderPreviewQuery.data.preview.template.variantLabel || "Variant pending"} />
                    <PreviewMeta label="Status" value="Prepared / waiting for mailbox" />
                  </div>
                  <PreviewMeta label="Subject" value={renderPreviewQuery.data.preview.subject || "No subject rendered"} />
                  <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Body preview</p>
                    <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">{renderPreviewQuery.data.preview.body || "No body rendered"}</pre>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prepared only — not sent yet. Sending is paused until mailbox setup and launch approval are complete.
                  </p>
                </div>
              ) : selectedQueueItem ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Prepared</Badge>
                    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Waiting for mailbox setup</Badge>
                  </div>
                  <PreviewMeta label="Recipient / company" value={[selectedQueueItem.recipientName, selectedQueueItem.rawCompanyName || selectedQueueItem.leadCompanyName].filter(Boolean).join(" · ") || "Prepared recipient"} />
                  <PreviewMeta label="Campaign" value={selectedQueueItem.campaignName || "No campaign linked"} />
                  <PreviewMeta label="Template variant" value={selectedQueueItem.variantLabel || "Variant pending"} />
                  <PreviewMeta label="Status" value="Prepared / waiting for mailbox" />
                  <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-8 text-center">
                    <p className="font-medium">Preview not available yet</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      The prepared outreach record exists, but the rendered preview is not ready to display yet.
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyState title="No outreach prepared yet" description="Prepared outreach will appear here once a contact is ready for review." />
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState title="No outreach prepared yet" description="Prepared outreach will appear here once qualifying leads move into the pre-launch queue." />
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-xl font-semibold">Mailbox readiness</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mailboxMessage}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryStat label="Prepared outreach" value={metrics.outreachPrepared} />
            <SummaryStat label="Emails sent" value={data.mailboxSentThisMonth} />
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-muted/15 p-4">
            <p className="font-medium">Mailbox setup pending</p>
            <p className="mt-2 text-sm text-muted-foreground">{mailboxDetail}</p>
          </div>

          {isAdmin ? (
            <details className="mt-5 rounded-2xl border border-dashed border-border p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold">
                Admin details
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PreviewMeta label="Provider" value={data.mailboxProviderType ? formatFriendlyLabel(data.mailboxProviderType) : "Resend"} />
                <PreviewMeta label="Connection" value={mapClientStatusLabel(data.mailboxStatus)} />
                <PreviewMeta label="Sending" value={data.sendingEnabled ? "Enabled" : "Paused"} />
                <PreviewMeta label="Send-ready count" value={String(data.sendReadyCount)} />
                <PreviewMeta label="Blockers" value={getAdminMailboxBlockers(data)} />
                <PreviewMeta label="Launch-day setup" value="Resend pending until launch day" />
              </div>
            </details>
          ) : null}
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-xl font-semibold">How Expert Lead Agent works</h2>
          <div className="mt-5 space-y-3">
            <HowItWorksStep
              number="1"
              title="Find and qualify leads"
              description="The agent sources prospects and filters them to your target profile before they appear in the client workspace."
            />
            <HowItWorksStep
              number="2"
              title="Prepare outreach safely"
              description="Outreach drafts and approvals are prepared ahead of launch while sending remains paused."
            />
            <HowItWorksStep
              number="3"
              title="Launch with approval"
              description="Mailbox activation and sending only move forward after setup is complete and launch approval is given."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/campaigns">Campaigns</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/reports">Reports</Link>
            </Button>
          </div>
        </Card>
      </div>

      {isAdmin ? (
        <details className="rounded-[28px] border border-dashed border-border bg-background p-6 shadow-card">
          <summary className="cursor-pointer list-none text-lg font-semibold">Admin details</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Internal mission history and operational detail remain hidden from client users.
          </p>

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold">Mission detail</h3>
              {data.activeMissions.map((mission) => (
                <div key={mission.id} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{mission.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{mission.instruction}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {mission.assignedWorkerType} · {mission.missionType}{safeDistanceLabel(mission.createdAt) ? ` · ${safeDistanceLabel(mission.createdAt)}` : ""}
                      </p>
                    </div>
                    <LeadStatusBadge status={mission.status.toLowerCase().replace(/\s+/g, "_")} />
                  </div>
                </div>
              ))}
              {data.activeMissions.length === 0 ? <EmptyState title="No active missions" description="Admin mission detail will appear here when work is queued." /> : null}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Approval history</h3>
              {generalApprovals.map((approval) => (
                <div key={approval.id} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{approval.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{approval.entityType} · {approval.approvalType}</p>
                      {approval.decisionNote ? <p className="mt-2 text-xs text-muted-foreground">{approval.decisionNote}</p> : null}
                    </div>
                    <ApprovalStatusBadge status={toApprovalBadgeStatus(approval.decisionStatus)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function KpiCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <Card className="p-5 shadow-card">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </Card>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function ApprovalCard({
  approval,
  canApprove,
  busy,
  onApprove,
  onRequestChanges,
}: {
  approval: ApprovalRecord;
  canApprove: boolean;
  busy: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{approval.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{formatFriendlyLabel(approval.approvalType)}</p>
          {approval.decisionNote ? <p className="mt-2 text-xs text-muted-foreground">{approval.decisionNote}</p> : null}
        </div>
        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Pending</Badge>
      </div>

      {canApprove ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={onApprove} disabled={busy}>Approve</Button>
          <Button size="sm" variant="outline" onClick={onRequestChanges} disabled={busy}>Request Changes</Button>
        </div>
      ) : null}
    </div>
  );
}

function HowItWorksStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {number}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function InlineMessage({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
      tone === "success"
        ? "border-success/30 bg-success/10 text-success"
        : "border-destructive/30 bg-destructive/10 text-destructive"
    }`}
    >
      {children}
    </div>
  );
}

function WarningCard({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-warning/40 bg-warning/5 p-5 shadow-card">
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
      <Skeleton className="h-40 rounded-[28px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[360px]" />
        <Skeleton className="h-[360px]" />
      </div>
      <Skeleton className="h-[520px]" />
    </div>
  );
}

function buildMissionTitle(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "Lead Agent instruction";
  return trimmed.length > 72 ? `${trimmed.slice(0, 69)}...` : trimmed;
}

function inferWorkerType(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("campaign")) return "Reporting Agent";
  if (normalized.includes("outreach") || normalized.includes("email")) return "Outreach Agent";
  if (normalized.includes("lead") || normalized.includes("find") || normalized.includes("source")) return "Sourcing Agent";
  if (normalized.includes("qualify") || normalized.includes("verify")) return "Qualification Agent";
  return "Sourcing Agent";
}

function isSimpleQuestion(value: string) {
  return value.endsWith("?") && value.length <= 140;
}

function requiresConfirmation(value: string) {
  const normalized = value.toLowerCase();
  return ["campaign", "budget", "cost", "credit", "mailbox", "resend", "launch", "send"].some((keyword) => normalized.includes(keyword));
}

function compareDatesDesc(left?: string, right?: string) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
}

function safeDistanceLabel(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDistanceToNow(parsed, { addSuffix: true });
}

function sumPipelineKeywords(data: LeadAgentSummary, keywords: string[]) {
  return data.leadPipelineCounts.reduce((total, item) => {
    const stage = String(item.stage || "").toLowerCase();
    return keywords.some((keyword) => stage.includes(keyword)) ? total + item.count : total;
  }, 0);
}

function formatFriendlyLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function mapClientStatusLabel(value: string) {
  switch (value) {
    case "waiting_for_mailbox":
      return "Waiting for mailbox setup";
    case "qualified_for_enrichment":
      return "Qualified for verification";
    case "approved_for_enrichment":
      return "Approved for contact verification";
    case "waiting_for_credit_approval":
      return "Waiting for enrichment approval";
    case "no_contact_found":
      return "No usable contact found";
    case "verified_real":
      return "Contact verified";
    case "pending":
      return "Pending setup";
    default:
      return formatFriendlyLabel(value);
  }
}

function getMailboxClientMessage(data: LeadAgentSummary) {
  if (!data.sendingEnabled) {
    return "Mailbox setup pending. Outreach is prepared but sending is paused until launch approval.";
  }
  return "Mailbox readiness is being checked. Sending remains paused until launch approval.";
}

function getMailboxSetupMessage(data: LeadAgentSummary) {
  const providerType = String(data.mailboxConnectionCheck?.providerType || data.mailboxProviderType || "").toLowerCase();
  if (providerType === "resend") {
    return "Resend remains pending for launch day. Prepared outreach stays queued and no sending is enabled before go-live.";
  }
  return "Prepared outreach is waiting for final mailbox setup and approval before launch.";
}

function getAdminMailboxBlockers(data: LeadAgentSummary) {
  if (!data.mailboxReadinessBlockers.length) return "None";
  return data.mailboxReadinessBlockers.map((blocker) => blocker.message || formatFriendlyLabel(blocker.code)).join(" | ");
}

function toApprovalBadgeStatus(value: string) {
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "pending";
}
