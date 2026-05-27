import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, RefreshCcw } from "lucide-react";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/app-state";
import {
  useApprovalDecisionMutation,
  useEnrichmentCreditApprovalMutation,
  useLeadAgentSummaryQuery,
} from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/approvals")({
  head: () => ({ meta: [{ title: "Approvals — Expert Technology Solutions" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const approvalDecisionMutation = useApprovalDecisionMutation();
  const enrichmentDecisionMutation = useEnrichmentCreditApprovalMutation();
  const isAdmin = user?.role === "intergrai_admin";
  const canApprove = user?.role === "client_owner" || user?.role === "manager" || isAdmin;

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <ApprovalsLoadingState />;
  }

  const data = summaryQuery.data;
  if (!data) {
    return (
      <Card className="mx-auto max-w-[1200px] p-10 text-center shadow-card">
        <h1 className="text-2xl font-semibold">Approvals unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">The approval workspace could not be loaded.</p>
      </Card>
    );
  }

  const generalApprovals = data.approvals.filter((approval) => approval.approvalType !== "credit_approval");
  const pendingApprovals = generalApprovals.filter((approval) => approval.decisionStatus === "pending");
  const pendingCreditApprovals = data.pendingEnrichmentCreditApprovals;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <header className="rounded-[28px] border border-border/70 bg-gradient-subtle px-6 py-6 shadow-card md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">Approvals</Badge>
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Client-safe actions</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Review actions waiting for approval</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Approvals are handled here so the Lead Agent page can stay focused on live progress. Outreach remains paused until the required approvals and launch steps are complete.
            </p>
          </div>
          <Button variant="outline" onClick={() => summaryQuery.refetch()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Pending approvals" value={pendingApprovals.length} />
        <SummaryCard label="Pending enrichment approvals" value={pendingCreditApprovals.length} />
        <SummaryCard label="Total approval history" value={generalApprovals.length} />
      </div>

      <Card className="p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Actions needed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Client-facing actions use simple approve and request changes controls.
            </p>
          </div>
          <CheckSquare className="h-5 w-5 text-primary" />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {pendingApprovals.map((approval) => (
            <Card key={approval.id} className="border-border/70 p-5 shadow-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{approval.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{formatLabel(approval.approvalType)}</p>
                  {isAdmin ? <p className="mt-2 text-xs text-muted-foreground">{approval.entityType} · {approval.entityId}</p> : null}
                </div>
                <ApprovalStatusBadge status="pending" />
              </div>

              {canApprove ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => approvalDecisionMutation.mutate({ approvalId: approval.id, decision: "approved" })}
                    disabled={approvalDecisionMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approvalDecisionMutation.mutate({
                      approvalId: approval.id,
                      decision: "rejected",
                      decision_note: "Client requested changes from the approvals workspace.",
                    })}
                    disabled={approvalDecisionMutation.isPending}
                  >
                    Request Changes
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">This approval is visible here, but your current role cannot action it.</p>
              )}
            </Card>
          ))}

          {pendingCreditApprovals.map((approval) => (
            <Card key={approval.queueItemId} className="border-border/70 p-5 shadow-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{approval.companyName}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Waiting for contact verification approval</p>
                  <p className="mt-2 text-xs text-muted-foreground">{approval.campaignName || "No linked campaign"}</p>
                </div>
                <ApprovalStatusBadge status="pending" />
              </div>

              {canApprove ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => enrichmentDecisionMutation.mutate({ queueItemId: approval.queueItemId, decision: "approved" })}
                    disabled={enrichmentDecisionMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => enrichmentDecisionMutation.mutate({ queueItemId: approval.queueItemId, decision: "rejected" })}
                    disabled={enrichmentDecisionMutation.isPending}
                  >
                    Request Changes
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>

        {pendingApprovals.length === 0 && pendingCreditApprovals.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-10 text-center">
            <p className="font-medium">No approvals waiting</p>
            <p className="mt-2 text-sm text-muted-foreground">
              New approval items will appear here when they need client or admin review.
            </p>
          </div>
        ) : null}
      </Card>

      <Card className="p-6 shadow-card">
        <h2 className="text-xl font-semibold">Approval history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A simple record of previous approval decisions.
        </p>

        <div className="mt-5 grid gap-3">
          {generalApprovals.map((approval) => (
            <div key={approval.id} className="rounded-2xl border border-border/70 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{approval.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatLabel(approval.approvalType)}</p>
                  {approval.decisionNote ? <p className="mt-2 text-xs text-muted-foreground">{approval.decisionNote}</p> : null}
                </div>
                <ApprovalStatusBadge status={toBadgeStatus(approval.decisionStatus)} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5 shadow-card">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function ApprovalsLoadingState() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <Skeleton className="h-40 rounded-[28px]" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <Skeleton className="h-[420px]" />
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function toBadgeStatus(value: string) {
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "pending";
}
