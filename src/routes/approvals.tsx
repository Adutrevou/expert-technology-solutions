import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { EmptyCard, formatPortalDate, PageIntro, SectionCard, StatCard } from "@/components/client-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import { buildApprovalHubItems, getActionableApprovalItems, type ApprovalHubItem } from "@/lib/approval-hub";
import {
  useApprovalDecisionMutation,
  useCampaignApprovalDecisionMutation,
  useConversationsQuery,
  useEnrichmentCreditApprovalMutation,
  useFollowupSequenceApprovalDecisionMutation,
  useLeadAgentSummaryQuery,
  useRequestsQuery,
  useTemplateVariantApprovalDecisionMutation,
  useUpdateReplyDraftMutation,
} from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/approvals")({
  head: () => ({ meta: [{ title: "Approvals — Expert Technology Solutions" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const conversationsQuery = useConversationsQuery();
  const requestsQuery = useRequestsQuery();
  const approvalDecisionMutation = useApprovalDecisionMutation();
  const campaignDecisionMutation = useCampaignApprovalDecisionMutation();
  const templateVariantDecisionMutation = useTemplateVariantApprovalDecisionMutation();
  const followupSequenceDecisionMutation = useFollowupSequenceApprovalDecisionMutation();
  const enrichmentDecisionMutation = useEnrichmentCreditApprovalMutation();
  const replyDraftDecisionMutation = useUpdateReplyDraftMutation();
  const canApprove = ["client_owner", "manager", "intergrai_admin"].includes(user?.role || "");
  const [requestChangesItem, setRequestChangesItem] = useState<ApprovalHubItem | null>(null);
  const [requestChangesNote, setRequestChangesNote] = useState("");

  const items = useMemo(() => {
    if (!summaryQuery.data) return [];
    return buildApprovalHubItems(summaryQuery.data, conversationsQuery.data || [], requestsQuery.data?.requests || []);
  }, [summaryQuery.data, conversationsQuery.data, requestsQuery.data]);

  const pendingItems = getActionableApprovalItems(items);
  const completedItems = items.filter((item) => item.status !== "pending");

  async function refreshAll() {
    await Promise.all([summaryQuery.refetch(), conversationsQuery.refetch(), requestsQuery.refetch()]);
  }

  async function handleDecision(item: ApprovalHubItem, decision: "approved" | "changes_requested", note?: string) {
    const decisionNote = note?.trim() || defaultDecisionNote(item, decision);
    try {
      switch (item.kind) {
        case "campaign":
          await campaignDecisionMutation.mutateAsync({ campaignId: item.id, decision, decision_note: decisionNote });
          break;
        case "template_variant":
          await templateVariantDecisionMutation.mutateAsync({ variantId: item.id, decision, decision_note: decisionNote });
          break;
        case "followup_sequence":
          await followupSequenceDecisionMutation.mutateAsync({ sequenceId: item.id, decision, decision_note: decisionNote });
          break;
        case "credit_approval":
          await enrichmentDecisionMutation.mutateAsync({ queueItemId: item.id, decision: decision === "approved" ? "approved" : "rejected", decision_note: decisionNote });
          break;
        case "reply_draft":
          await replyDraftDecisionMutation.mutateAsync({
            draftId: item.id,
            status: decision === "approved" ? "approved" : "changes_requested",
            approval_note: decisionNote,
          });
          break;
        case "response_rule":
        case "asset_approval":
        case "approval_record":
          if (!item.approvalId) return;
          await approvalDecisionMutation.mutateAsync({ approvalId: item.approvalId, decision, decision_note: decisionNote });
          break;
        default:
          return;
      }

      toast.success(decision === "approved" ? "Approval saved." : "Changes requested.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that decision.");
    }
  }

  async function submitRequestChanges() {
    if (!requestChangesItem) return;
    if (!requestChangesNote.trim()) {
      toast.error("Add a short note so the requested changes are clear.");
      return;
    }

    await handleDecision(requestChangesItem, "changes_requested", requestChangesNote);
    setRequestChangesItem(null);
    setRequestChangesNote("");
  }

  if ((summaryQuery.isLoading && !summaryQuery.data) || conversationsQuery.isLoading) {
    return <ApprovalsLoadingState />;
  }

  if (!summaryQuery.data) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <Card className="rounded-[28px] p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Approvals unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">The approval hub could not be loaded.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageIntro
        badge="Approvals"
        title="What needs my decision right now?"
        description="This is the central approval hub for campaigns, email templates, follow-ups, reply drafts, response rules, images, and approval-related requests."
        actions={(
          <Button variant="outline" onClick={() => void refreshAll()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Needs approval" value={pendingItems.length} detail="Only real client decisions appear here." />
        <StatCard label="Email reviews" value={items.filter((item) => item.typeLabel === "Email Template" || item.typeLabel === "Follow-up").length} detail="Templates and follow-up decisions." />
        <StatCard label="Reply reviews" value={items.filter((item) => item.typeLabel === "Reply Draft").length} detail="Draft replies stay approval-gated." />
        <StatCard label="Completed" value={completedItems.length} detail="Approved and change-requested history." />
      </div>

      <SectionCard title="Needs approval now" description="Each card explains what is being approved and why it matters.">
        {pendingItems.length ? (
          <div className="grid gap-4">
            {pendingItems.map((item) => (
              <ApprovalDecisionCard
                key={item.key}
                item={item}
                canApprove={canApprove && item.actionable}
                busy={
                  approvalDecisionMutation.isPending
                  || campaignDecisionMutation.isPending
                  || templateVariantDecisionMutation.isPending
                  || followupSequenceDecisionMutation.isPending
                  || enrichmentDecisionMutation.isPending
                  || replyDraftDecisionMutation.isPending
                }
                onApprove={() => void handleDecision(item, "approved")}
                onRequestChanges={() => {
                  setRequestChangesItem(item);
                  setRequestChangesNote(item.latestNote && item.status !== "approved" ? item.latestNote : "");
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyCard
            title="All clear"
            description="No approvals need your attention right now."
          />
        )}
      </SectionCard>

      <SectionCard title="Recent approval history" description="Approved items and change requests stay visible for context.">
        {completedItems.length ? (
          <div className="grid gap-3">
            {completedItems.map((item) => (
              <div key={item.key} className="rounded-[24px] border border-border/70 bg-background px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ApprovalStatusBadge status={item.status} />
                      <span className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">{item.typeLabel}</span>
                    </div>
                    <p className="mt-3 font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.shortContext}</p>
                    {item.latestNote ? <p className="mt-3 text-sm text-muted-foreground">{item.latestNote}</p> : null}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={item.previewHref}>{item.previewLabel}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard title="No completed approvals yet" description="Approved items and change history will appear here over time." />
        )}
      </SectionCard>

      <Dialog open={Boolean(requestChangesItem)} onOpenChange={(open) => {
        if (!open) {
          setRequestChangesItem(null);
          setRequestChangesNote("");
        }
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              Explain what should change so the next version is clear and actionable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-[20px] border border-border/70 bg-muted/15 px-4 py-4">
              <p className="font-medium">{requestChangesItem?.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{requestChangesItem?.shortContext}</p>
            </div>
            <div>
              <p className="text-sm font-medium">What should change?</p>
              <Textarea
                className="mt-2 min-h-[140px]"
                value={requestChangesNote}
                onChange={(event) => setRequestChangesNote(event.target.value)}
                placeholder="Example: tighten the subject line, remove the broad claim in paragraph two, and make the CTA more specific."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRequestChangesItem(null);
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

function ApprovalDecisionCard({
  item,
  canApprove,
  busy,
  onApprove,
  onRequestChanges,
}: {
  item: ApprovalHubItem;
  canApprove: boolean;
  busy: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-border/70 bg-background px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ApprovalStatusBadge status={item.status} />
            <span className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">{item.typeLabel}</span>
          </div>
          <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{item.shortContext}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={item.previewHref}>{item.previewLabel}</Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ApprovalMeta label="What is being approved" value={item.previewSummary} />
        <ApprovalMeta label="Why approval is needed" value={item.reason} />
        <ApprovalMeta label="Requested by" value={item.requestedBy} />
        <ApprovalMeta label="Created" value={formatPortalDate(item.createdAt)} />
      </div>

      {item.latestNote ? (
        <div className="mt-4 rounded-[20px] border border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
          Latest note: {item.latestNote}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {canApprove ? (
          <>
            <Button onClick={onApprove} disabled={busy}>
              Approve
            </Button>
            <Button variant="outline" onClick={onRequestChanges} disabled={busy}>
              Request changes
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled>
            You do not have permission to decide this item
          </Button>
        )}
      </div>
    </div>
  );
}

function ApprovalMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}

function ApprovalsLoadingState() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <Skeleton className="h-44 rounded-[32px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-[520px] rounded-[28px]" />
      <Skeleton className="h-[320px] rounded-[28px]" />
    </div>
  );
}

function defaultDecisionNote(item: ApprovalHubItem, decision: "approved" | "changes_requested") {
  return decision === "approved"
    ? `Approved from the ${item.typeLabel.toLowerCase()} hub.`
    : `Changes requested from the ${item.typeLabel.toLowerCase()} hub.`;
}
