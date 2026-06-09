import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, RefreshCcw } from "lucide-react";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { buildApprovalHubItems, getActionableApprovalItems } from "@/lib/approval-hub";
import { EmptyCard, formatPortalDate, PageIntro, SectionCard, StatCard } from "@/components/client-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationsQuery, useDashboardQuery, useLeadAgentSummaryQuery, useLeadsQuery, useRequestsQuery } from "@/lib/leads-api-hooks";
import { normalizeLead, type CanonicalLeadCounts, type DashboardResponse, type LeadAgentSummary } from "@/lib/leads-api";
import { deriveNormalizedLeadStatusCounts, type NormalizedLeadStatusCounts } from "@/lib/lead-status";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Expert Technology Solutions" }] }),
  component: Dashboard,
});

function Dashboard() {
  const dashboardQuery = useDashboardQuery();
  const summaryQuery = useLeadAgentSummaryQuery();
  const leadsQuery = useLeadsQuery();
  const conversationsQuery = useConversationsQuery();
  const requestsQuery = useRequestsQuery();

  if (dashboardQuery.isLoading || summaryQuery.isLoading || leadsQuery.isLoading || conversationsQuery.isLoading || requestsQuery.isLoading) {
    return <DashboardLoadingState />;
  }

  const data = dashboardQuery.data ?? EMPTY_DASHBOARD;
  const summaryData = summaryQuery.data ?? EMPTY_LEAD_AGENT_SUMMARY;
  const normalizedLeads = (leadsQuery.data?.leads ?? []).map(normalizeLead);
  const derivedLeadCounts = deriveNormalizedLeadStatusCounts(normalizedLeads);
  const leadCounts = resolveDashboardLeadCounts({
    dashboardLeadCounts: data.lead_counts,
    leadsApiCounts: leadsQuery.data?.counts,
    leadTotalCount: leadsQuery.data?.totalCount,
    derivedLeadCounts,
  });
  const canonicalLeadSignal = hasCanonicalLeadSignal(leadCounts, normalizedLeads.length);
  const approvalItems = buildApprovalHubItems(
    summaryData,
    conversationsQuery.data || [],
    requestsQuery.data?.requests || [],
  );
  const pendingApprovals = getActionableApprovalItems(approvalItems).filter((item) => item.kind !== "credit_approval");
  const attentionItems = pendingApprovals.slice(0, 4);
  const clientFacingMetricFailure = !canonicalLeadSignal && dashboardQuery.isError && leadsQuery.isError;
  const recentLeads = normalizedLeads.length
    ? normalizedLeads.slice(0, 4)
    : (canonicalLeadSignal && data.recent_leads?.length ? data.recent_leads.map(normalizeLead).slice(0, 4) : []);
  const shouldWarnInConsole = (import.meta.env.DEV || Boolean(data.is_intergrai_admin))
    && (dashboardQuery.isError || leadsQuery.isError || summaryQuery.isError || conversationsQuery.isError || requestsQuery.isError);

  useEffect(() => {
    if (!shouldWarnInConsole) {
      return;
    }

    console.warn("[Expert Dashboard] non-client-facing data warning", {
      dashboardError: dashboardQuery.error instanceof Error ? dashboardQuery.error.message : null,
      leadsError: leadsQuery.error instanceof Error ? leadsQuery.error.message : null,
      summaryError: summaryQuery.error instanceof Error ? summaryQuery.error.message : null,
      conversationsError: conversationsQuery.error instanceof Error ? conversationsQuery.error.message : null,
      requestsError: requestsQuery.error instanceof Error ? requestsQuery.error.message : null,
    });
  }, [
    shouldWarnInConsole,
    dashboardQuery.error,
    leadsQuery.error,
    summaryQuery.error,
    conversationsQuery.error,
    requestsQuery.error,
  ]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageIntro
        badge="Dashboard"
        title="How is my lead agent performing?"
        description="See overall pipeline progress, what is ready now, and what needs your attention next."
        actions={(
          <>
            <Button asChild variant="outline">
              <Link to="/lead-agent">Open Expert Lead Agent</Link>
            </Button>
            <Button asChild>
              <Link to="/approvals">Review approvals</Link>
            </Button>
          </>
        )}
      />

      {clientFacingMetricFailure ? (
        <Card className="rounded-[24px] border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning-foreground shadow-card">
          Live dashboard metrics are temporarily unavailable. Refresh to retry the canonical lead summary.
          <Button variant="outline" size="sm" className="ml-4" onClick={() => void Promise.allSettled([
            dashboardQuery.refetch(),
            summaryQuery.refetch(),
            leadsQuery.refetch(),
            conversationsQuery.refetch(),
            requestsQuery.refetch(),
          ])}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="All Leads"
          value={leadCounts.totalLeadsFound}
          detail={leadCounts.totalLeadsFound === 0 ? "No visible leads yet" : "Companies and contact opportunities found by the agent."}
        />
        <StatCard
          label="Enrichment Queue"
          value={leadCounts.enrichmentQueue}
          detail="Company or contact opportunities still missing a usable email."
        />
        <StatCard
          label="Outreach Ready"
          value={leadCounts.outreachReady}
          detail="Leads with a usable email and enough data to send safely."
        />
        <StatCard
          label="Emails Sent Today"
          value={leadCounts.emailsSentToday}
          detail="First outreach and approved replies sent today."
        />
        <StatCard
          label="Replies Received"
          value={leadCounts.repliesReceived}
          detail="Inbound replies captured across live conversations."
        />
        <StatCard
          label="Blocked/Avoided"
          value={leadCounts.blockedAvoided}
          detail="Unsafe, duplicate, competitor, or bad-fit rows suppressed."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="What needs your attention"
          description="The most important next decisions are surfaced here first."
          action={(
            <Button asChild variant="ghost" size="sm">
              <Link to="/approvals">
                Open approval hub
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        >
          {attentionItems.length ? (
            <div className="space-y-3">
              {attentionItems.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.shortContext}</p>
                      <p className="mt-3 text-xs text-muted-foreground">{formatPortalDate(item.createdAt)}</p>
                    </div>
                    <ApprovalStatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard
              title="All clear"
              description="No approvals need your attention right now."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Recent leads"
          description="A small live snapshot of newly synced opportunities."
          action={<Button asChild variant="outline" size="sm"><Link to="/campaigns">View campaigns</Link></Button>}
        >
          {recentLeads.length ? (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
                  <p className="font-medium">{lead.company}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lead.displayContactName || lead.name}{lead.title ? ` · ${lead.title}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-foreground">{lead.campaignName || "No campaign linked"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{lead.location}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard
              title="No recent leads yet"
              description="The dashboard is connected. Leads will appear here once qualification activity continues."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function hasCanonicalLeadSignal(leadCounts: ReturnType<typeof resolveDashboardLeadCounts>, loadedLeadCount: number) {
  return Boolean(
    loadedLeadCount
    || leadCounts.totalLeadsFound
    || leadCounts.enrichmentQueue
    || leadCounts.outreachReady
    || leadCounts.emailsSentToday
    || leadCounts.repliesReceived
    || leadCounts.blockedAvoided,
  );
}

function DashboardLoadingState() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <Skeleton className="h-44 rounded-[32px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[24px]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-[360px] rounded-[28px]" />
        <Skeleton className="h-[360px] rounded-[28px]" />
      </div>
    </div>
  );
}

function resolveDashboardLeadCounts({
  dashboardLeadCounts,
  leadsApiCounts,
  leadTotalCount,
  derivedLeadCounts,
}: {
  dashboardLeadCounts: DashboardResponse["lead_counts"];
  leadsApiCounts?: CanonicalLeadCounts | null;
  leadTotalCount?: number;
  derivedLeadCounts: NormalizedLeadStatusCounts;
}) {
  const canonicalTotal = Number(
    leadsApiCounts?.allLeads
    || leadsApiCounts?.totalLeadsFound
    || leadTotalCount
    || dashboardLeadCounts.total
    || 0,
  );
  const leadsApiHasSignal = Boolean(
    canonicalTotal
    || Number(leadsApiCounts?.enrichmentQueue || 0)
    || Number(leadsApiCounts?.outreachReady || 0)
    || Number(leadsApiCounts?.contacted || 0)
    || Number(leadsApiCounts?.repliesReceived || 0)
    || Number(leadsApiCounts?.blockedAvoided || 0),
  );

  if (leadsApiHasSignal) {
    return {
      totalLeadsFound: canonicalTotal || derivedLeadCounts.total,
      enrichmentQueue: Number(leadsApiCounts?.enrichmentQueue || 0),
      outreachReady: Number(leadsApiCounts?.outreachReady || 0),
      emailsSentToday: Number(leadsApiCounts?.emailsSentToday || dashboardLeadCounts.emails_sent_today || 0),
      repliesReceived: Number(leadsApiCounts?.repliesReceived || 0),
      blockedAvoided: Number(leadsApiCounts?.blockedAvoided || 0),
    };
  }

  return {
    totalLeadsFound: Number(dashboardLeadCounts.total || derivedLeadCounts.total || 0),
    enrichmentQueue: Number(dashboardLeadCounts.enrichment_queue || derivedLeadCounts.enrichmentQueue || 0),
    outreachReady: Number(dashboardLeadCounts.outreach_ready || derivedLeadCounts.outreachReady || 0),
    emailsSentToday: Number(dashboardLeadCounts.emails_sent_today || 0),
    repliesReceived: Number(dashboardLeadCounts.replies_received || derivedLeadCounts.replies || 0),
    blockedAvoided: Number(dashboardLeadCounts.blocked_avoided || derivedLeadCounts.blockedAvoided || 0),
  };
}

const EMPTY_DASHBOARD: DashboardResponse = {
  ok: true,
  client: {
    id: "expert-technology-solutions",
    slug: "expert-technology-solutions",
    name: "Expert Technology Solutions",
    status: "unknown",
  },
  campaign_counts: {
    total: 0,
    active: 0,
    draft: 0,
  },
  lead_counts: {
    total: 0,
    hot: 0,
    warm: 0,
    review: 0,
    not_qualified: 0,
  },
  recent_leads: [],
  pending_approvals: [],
  recent_reports: [],
};

const EMPTY_LEAD_AGENT_SUMMARY: LeadAgentSummary = {
  ok: true,
  client: EMPTY_DASHBOARD.client,
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
  mailboxStatus: "unknown",
  mailboxConnected: false,
  sendingEnabled: false,
  sendReady: false,
  mailboxFromName: "",
  mailboxFromEmail: "",
  mailboxProviderType: "",
  mailboxDailySendLimit: 0,
  mailboxMonthlySendLimit: 0,
  mailboxSentToday: 0,
  mailboxSentThisMonth: 0,
  mailboxLastError: "",
  mailboxLastHealthCheckAt: undefined,
  mailboxReadinessBlockers: [],
  mailboxConnectionCheck: null,
  launchMode: "waiting_for_approval",
  launchReady: false,
  anyCampaignReady: false,
  campaignLaunchStates: [],
  campaignsApprovedCount: 0,
  campaignsWaitingApprovalCount: 0,
  campaignsReadyToLaunchCount: 0,
  campaignsLiveCount: 0,
  templatesWaitingApprovalCount: 0,
  followupsWaitingApprovalCount: 0,
  unapprovedRequiredAssetsCount: 0,
  renderPreviewAvailableCount: 0,
  outreachAssets: [],
  responseRules: [],
  responseRuleCategories: [],
  responseRulesCount: 0,
  approvedResponseRulesCount: 0,
  autoReplyRulesConfiguredCount: 0,
  autoReplyRulesEnabledCount: 0,
  mailboxes: [],
  approvalsWaiting: 0,
  approvals: [],
  pendingEnrichmentCreditApprovals: [],
  clientFacingCounts: {
    totalLeadsFound: 0,
    qualifiedLeads: 0,
    enrichmentQueue: 0,
    outreachReady: 0,
    outreachPrepared: 0,
    emailsSent: 0,
    emailsSentToday: 0,
    repliesReceived: 0,
    blockedAvoided: 0,
    companyFound: 0,
    positiveReplies: 0,
    meetingsQuoteRequests: 0,
  },
  currentCampaignFocus: "",
  expertLeadAgentState: "ready",
  expertLeadAgentStateLabel: "Ready",
  newLeadsSourcedToday: 0,
  repliesWaitingApproval: 0,
  adminSummary: {
    rawLeadsCount: 0,
    enrichmentQueueCount: 0,
    totalApprovalsCount: 0,
    archivedMissionsCount: 0,
    internalRequestsCount: 0,
    testConversationsCount: 0,
    enrichmentProviderStatusSummary: [],
  },
  latestQualificationActions: [],
  latestEnrichmentActions: [],
  latestWeeklyReport: null,
  internalNotes: [],
};
