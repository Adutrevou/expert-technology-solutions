import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCcw } from "lucide-react";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { buildApprovalHubItems, getActionableApprovalItems } from "@/lib/approval-hub";
import { EmptyCard, formatPortalDate, PageIntro, SectionCard, StatCard } from "@/components/client-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationsQuery, useDashboardQuery, useLeadAgentSummaryQuery, useRequestsQuery } from "@/lib/leads-api-hooks";
import { normalizeLead } from "@/lib/leads-api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Expert Technology Solutions" }] }),
  component: Dashboard,
});

function Dashboard() {
  const dashboardQuery = useDashboardQuery();
  const summaryQuery = useLeadAgentSummaryQuery();
  const conversationsQuery = useConversationsQuery();
  const requestsQuery = useRequestsQuery();

  if (
    dashboardQuery.isLoading
    || summaryQuery.isLoading
    || conversationsQuery.isLoading
    || requestsQuery.isLoading
  ) {
    return <DashboardLoadingState />;
  }

  if (
    dashboardQuery.isError
    || summaryQuery.isError
    || conversationsQuery.isError
    || requestsQuery.isError
    || !dashboardQuery.data
    || !summaryQuery.data
  ) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <Card className="rounded-[28px] p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {(dashboardQuery.error as Error | undefined)?.message
              || (summaryQuery.error as Error | undefined)?.message
              || "We couldn’t load the dashboard right now."}
          </p>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => dashboardQuery.refetch()} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const data = dashboardQuery.data;
  const recentLeads = data.recent_leads.map(normalizeLead).slice(0, 4);
  const approvalItems = buildApprovalHubItems(
    summaryQuery.data,
    conversationsQuery.data || [],
    requestsQuery.data?.requests || [],
  );
  const pendingApprovals = getActionableApprovalItems(approvalItems);
  const attentionItems = pendingApprovals.slice(0, 4);

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Campaigns"
          value={data.campaign_counts.total}
          detail={data.campaign_counts.total === 1 ? "1 campaign in view" : `${data.campaign_counts.total} campaigns in view`}
        />
        <StatCard
          label="Leads found"
          value={data.lead_counts.total}
          detail={data.lead_counts.total === 0 ? "No leads synced yet" : `${data.lead_counts.warm} warm and ${data.lead_counts.hot} hot`}
        />
        <StatCard
          label="Needs approval"
          value={pendingApprovals.length}
          detail={pendingApprovals.length ? "Real client decisions waiting now" : "All clear right now"}
        />
        <StatCard
          label="Workspace"
          value={data.client.status === "active" ? "Ready" : data.client.status || "Unknown"}
          detail="Sending remains paused until launch approval."
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
                    {lead.displayContactName || lead.name}{lead.title !== "Unknown title" ? ` · ${lead.title}` : ""}
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
