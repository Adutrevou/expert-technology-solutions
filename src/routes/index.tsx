import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/kpi-card";
import { useDashboardQuery } from "@/lib/leads-api-hooks";
import { normalizeLead, normalizePendingApproval } from "@/lib/leads-api";
import { Users, Megaphone, Clock3, Building2, ArrowRight, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { LeadStatusBadge, ApprovalStatusBadge } from "@/components/status-badges";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Expert Technology Solutions" }] }),
  component: Dashboard,
});

function Dashboard() {
  const dashboardQuery = useDashboardQuery();

  if (dashboardQuery.isLoading) {
    return <DashboardLoadingState />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    const errMsg = (dashboardQuery.error as Error | undefined)?.message;
    return (
      <CenteredState
        title="Dashboard unavailable"
        description={errMsg || "We couldn’t load the live Intergrai dashboard right now."}
        action={<Button onClick={() => dashboardQuery.refetch()} variant="outline"><RefreshCcw className="h-4 w-4 mr-2" />Try again</Button>}
      />
    );
  }

  const { client, campaign_counts: campaignCounts, lead_counts: leadCounts } = dashboardQuery.data;
  const recentLeads = dashboardQuery.data.recent_leads.map(normalizeLead);
  const pendingApprovals = dashboardQuery.data.pending_approvals.map(normalizePendingApproval);
  const qualificationBreakdown = [
    { label: "Hot", value: leadCounts.hot, tone: "bg-success" },
    { label: "Warm", value: leadCounts.warm, tone: "bg-warning" },
    { label: "Review", value: leadCounts.review, tone: "bg-muted-foreground" },
    { label: "Not qualified", value: leadCounts.not_qualified, tone: "bg-destructive" },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Intergrai Leads API</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Live overview for {client.domain || client.slug}.
          </p>
        </div>
        <Link to="/campaigns" className="text-sm font-semibold text-primary inline-flex items-center gap-1">
          Review campaigns <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Client" value={1} delta={client.status || "active"} icon={Building2} accent="info" />
        <KpiCard label="Campaigns" value={campaignCounts.total} delta={`${campaignCounts.draft} draft`} icon={Megaphone} accent="primary" />
        <KpiCard label="Leads" value={leadCounts.total} delta={`${leadCounts.hot} hot`} icon={Users} accent="success" />
        <KpiCard label="Pending Approvals" value={pendingApprovals.length} delta={pendingApprovals.length ? "needs review" : "all clear"} icon={Clock3} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold">Recent leads</h2>
              <p className="text-xs text-muted-foreground">Latest live records from the shared leads API</p>
            </div>
          </div>

          {recentLeads.length === 0 ? (
            <EmptyPanel
              title="No recent leads yet"
              description="The API is connected, but this client does not have any synced leads yet."
            />
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{lead.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.company} · {lead.title}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.qualification} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{lead.location}</span>
                    <span>{lead.campaignName}</span>
                    {lead.createdAt && <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="font-semibold">Qualification breakdown</h2>
          <p className="text-xs text-muted-foreground mb-5">Current live counts by qualification stage</p>
          <div className="space-y-4">
            {qualificationBreakdown.map((item) => {
              const width = leadCounts.total > 0 ? `${(item.value / leadCounts.total) * 100}%` : "0%";
              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium tabular-nums">{item.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className={`h-2 rounded-full ${item.tone}`} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold">Pending approvals</h2>
            <p className="text-xs text-muted-foreground">Requests returned by the live dashboard endpoint</p>
          </div>
        </div>

        {pendingApprovals.length === 0 ? (
          <EmptyPanel
            title="No approvals pending"
            description="There are no campaign or lead actions waiting for review."
          />
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                  {item.createdAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Raised {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <ApprovalStatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CenteredState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="max-w-[1400px] mx-auto">
      <Card className="p-10 text-center shadow-card">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </Card>
    </div>
  );
}
