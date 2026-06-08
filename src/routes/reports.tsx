import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, RefreshCcw } from "lucide-react";
import { PageIntro } from "@/components/client-portal";
import { useLeadAgentSummaryQuery } from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Expert Technology Solutions" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const summaryQuery = useLeadAgentSummaryQuery();

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <ReportsLoadingState />;
  }

  if (!summaryQuery.data) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <Card className="p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Reports unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">We couldn’t load reporting data right now.</p>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => summaryQuery.refetch()} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { clientFacingCounts, leadPipelineCounts, campaigns, approvalsWaiting, mailboxConnected, sendingEnabled, mailboxLastError } = summaryQuery.data;
  const repliesReceived = campaigns.reduce((total, campaign) => total + Number(campaign.replies || 0), 0);
  const totalActivity = clientFacingCounts.outreachPrepared + clientFacingCounts.emailsSent + clientFacingCounts.positiveReplies + repliesReceived;
  const campaignRows = campaigns.map((campaign) => ({
    name: campaign.name,
    status: campaign.approvalStatus === "approved" ? "Approved" : "Waiting for approval",
    active: campaign.status === "active",
    sourcedLeads: campaign.sourcedLeads,
    qualifiedLeads: campaign.qualifiedLeads,
    outreachSent: campaign.outreachSent,
    replies: campaign.replies,
    nextAction: campaign.nextAction,
  }));

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto">
      <PageIntro
        badge="Reports"
        title="What happened this week and this month?"
        description="Review simple lead, outreach, reply, approval, and safety trends as campaigns progress."
        actions={(
          <>
            <Button asChild variant="outline">
              <Link to="/approvals">View approvals</Link>
            </Button>
            <Button onClick={() => summaryQuery.refetch()} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Leads found" value={clientFacingCounts.totalLeadsFound} />
        <MetricCard label="Qualified leads" value={clientFacingCounts.qualifiedLeads} />
        <MetricCard label="Outreach prepared" value={clientFacingCounts.outreachPrepared} />
        <MetricCard label="Replies received" value={repliesReceived} />
        <MetricCard label="Positive replies" value={clientFacingCounts.positiveReplies} />
        <MetricCard label="Reply drafts needing approval" value={summaryQuery.data.repliesWaitingApproval} />
      </div>

      {totalActivity === 0 ? (
        <Card className="p-8 shadow-card">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Reports will populate as outreach and replies increase.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The reporting workspace is ready. Real graphs will become richer once approvals are complete and controlled outreach volume increases.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-xl font-semibold">Lead and email funnel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current progression from sourced leads to meetings or quote requests.
          </p>

          <div className="mt-5 space-y-4">
            {leadPipelineCounts.map((item) => (
              <div key={item.stage}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span>{item.stage}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-gradient-primary"
                    style={{ width: `${Math.max((item.count / Math.max(clientFacingCounts.totalLeadsFound, 1)) * 100, item.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-xl font-semibold">Approval and sending summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Safety state before launch begins.
          </p>

          <div className="mt-5 space-y-3">
            <SummaryRow label="Approvals waiting" value={`${approvalsWaiting}`} />
            <SummaryRow label="Emails sent" value={`${clientFacingCounts.emailsSent}`} />
            <SummaryRow label="Replies received" value={`${repliesReceived}`} />
            <SummaryRow label="Replies" value={`${clientFacingCounts.positiveReplies}`} />
            <SummaryRow label="Reply drafts needing approval" value={`${summaryQuery.data.repliesWaitingApproval}`} />
            <SummaryRow label="Meetings / quote requests" value={`${clientFacingCounts.meetingsQuoteRequests}`} />
            <SummaryRow label="Mailbox connected" value={mailboxConnected ? "Yes" : "No"} />
            <SummaryRow label="Sending enabled" value={sendingEnabled ? "Yes" : "No"} />
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-muted/15 p-4">
            <p className="text-sm font-medium">Mailbox safety</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {mailboxConnected
                ? sendingEnabled
                  ? "Mailbox is connected and sending is enabled."
                  : "Mailbox is connected, but sending is still paused pending launch."
                : "Mailbox is not connected yet."}
            </p>
            {mailboxLastError ? <p className="mt-2 text-sm text-destructive">{mailboxLastError}</p> : null}
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-card">
        <h2 className="text-xl font-semibold">Campaign performance and approval state</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only the four live Expert campaigns are shown here.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {campaignRows.map((campaign) => (
            <div key={campaign.name} className="rounded-2xl border border-border/70 bg-background px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{campaign.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {campaign.active ? "Active campaign structure ready" : "Campaign structure paused"}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${campaign.status === "Approved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning-foreground"}`}>
                  {campaign.status}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <SummaryRow label="Sourced" value={`${campaign.sourcedLeads}`} />
                <SummaryRow label="Qualified" value={`${campaign.qualifiedLeads}`} />
                <SummaryRow label="Emails sent" value={`${campaign.outreachSent}`} />
                <SummaryRow label="Replies" value={`${campaign.replies}`} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{campaign.nextAction || "Continue campaign lead sourcing."}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5 shadow-card">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ReportsLoadingState() {
  return (
    <div className="space-y-6 max-w-[1240px] mx-auto">
      <Skeleton className="h-40 rounded-[28px]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-[380px]" />
        <Skeleton className="h-[380px]" />
      </div>
    </div>
  );
}
