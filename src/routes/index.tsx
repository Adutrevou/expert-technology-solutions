import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCcw } from "lucide-react";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { buildApprovalHubItems, getActionableApprovalItems } from "@/lib/approval-hub";
import { EmptyCard, formatPortalDate, PageIntro, SectionCard, StatCard } from "@/components/client-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationsQuery, useDashboardQuery, useLeadAgentSummaryQuery, useRequestsQuery } from "@/lib/leads-api-hooks";
import { normalizeLead, type DashboardResponse, type LeadAgentSummary } from "@/lib/leads-api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Expert Technology Solutions" }] }),
  component: Dashboard,
});

function Dashboard() {
  const dashboardQuery = useDashboardQuery();
  const summaryQuery = useLeadAgentSummaryQuery();
  const conversationsQuery = useConversationsQuery();
  const requestsQuery = useRequestsQuery();

  if (dashboardQuery.isLoading || summaryQuery.isLoading || conversationsQuery.isLoading || requestsQuery.isLoading) {
    return <DashboardLoadingState />;
  }

  const data = dashboardQuery.data ?? EMPTY_DASHBOARD;
  const summaryData = summaryQuery.data ?? EMPTY_LEAD_AGENT_SUMMARY;
  const recentLeads = (data.recent_leads || []).map(normalizeLead).slice(0, 4);
  const approvalItems = buildApprovalHubItems(
    summaryData,
    conversationsQuery.data || [],
    requestsQuery.data?.requests || [],
  );
  const pendingApprovals = getActionableApprovalItems(approvalItems).filter((item) => item.kind !== "credit_approval");
  const attentionItems = pendingApprovals.slice(0, 4);
  const leadCounts = summaryData.clientFacingCounts;
  const hasWarnings = dashboardQuery.isError || summaryQuery.isError || conversationsQuery.isError || requestsQuery.isError;

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

      {hasWarnings ? (
        <Card className="rounded-[24px] border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning-foreground shadow-card">
          Some live metrics are unavailable right now. The dashboard is still rendering with safe fallbacks.
          <Button variant="outline" size="sm" className="ml-4" onClick={() => void Promise.allSettled([
            dashboardQuery.refetch(),
            summaryQuery.refetch(),
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
          label="Blocked/Avoided Count"
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
