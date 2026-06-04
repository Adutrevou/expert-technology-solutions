import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { EmptyCard, PageIntro, SectionCard, StatCard, formatPortalDate } from "@/components/client-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import {
  actionableApprovalFilter,
  buildApprovalHubItems,
  friendlyApprovalStatus,
  type ApprovalHubItem,
} from "@/lib/approval-hub";
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

  const needsAttentionItems = items.filter(actionableApprovalFilter);
  const changesRequestedItems = items.filter((item) => item.status === "changes_requested");
  const approvedItems = items.filter((item) => item.status === "approved");
  const archivedItems = items.filter((item) => item.status === "archived");

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

  const busy =
    approvalDecisionMutation.isPending
    || campaignDecisionMutation.isPending
    || templateVariantDecisionMutation.isPending
    || followupSequenceDecisionMutation.isPending
    || enrichmentDecisionMutation.isPending
    || replyDraftDecisionMutation.isPending;

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
        title="Approvals"
        description="Review what needs your decision before the agent can act."
        actions={(
          <Button variant="outline" onClick={() => void refreshAll()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Needs my attention" value={needsAttentionItems.length} detail="Actionable decisions waiting right now." />
        <StatCard label="Changes requested" value={changesRequestedItems.length} detail="Items sent back for another pass." />
        <StatCard label="Approved" value={approvedItems.length} detail="Recent decisions already cleared." />
        <StatCard label="History" value={approvedItems.length + archivedItems.length} detail="Approved and archived context." />
      </div>

      <SectionCard title="Decision hub" description="Use the default view for real actions. Older history stays out of the way.">
        <Tabs defaultValue="needs-attention" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[20px] bg-muted/30 p-1 md:grid-cols-4">
            <TabsTrigger value="needs-attention">Needs my attention</TabsTrigger>
            <TabsTrigger value="changes-requested">Changes requested</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="history">Archived / History</TabsTrigger>
          </TabsList>

          <TabsContent value="needs-attention" className="space-y-4">
            <ApprovalCardList
              items={needsAttentionItems}
              emptyTitle="All clear"
              emptyDescription="No approvals need your attention right now."
              canApprove={canApprove}
              busy={busy}
              onApprove={(item) => void handleDecision(item, "approved")}
              onRequestChanges={(item) => {
                setRequestChangesItem(item);
                setRequestChangesNote(item.latestNote || "");
              }}
            />
          </TabsContent>

          <TabsContent value="changes-requested" className="space-y-4">
            <ApprovalCardList
              items={changesRequestedItems}
              emptyTitle="No change requests"
              emptyDescription="Nothing is currently marked for changes."
              canApprove={false}
              busy={busy}
              onApprove={() => undefined}
              onRequestChanges={() => undefined}
            />
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            <ApprovalCardList
              items={approvedItems}
              emptyTitle="No approved items yet"
              emptyDescription="Approved decisions will appear here."
              canApprove={false}
              busy={busy}
              onApprove={() => undefined}
              onRequestChanges={() => undefined}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ApprovalCardList
              items={[...archivedItems, ...approvedItems].sort((left, right) => (right.createdAt || "").localeCompare(left.createdAt || ""))}
              emptyTitle="No approval history yet"
              emptyDescription="Archived items and older approval history will appear here."
              canApprove={false}
              busy={busy}
              onApprove={() => undefined}
              onRequestChanges={() => undefined}
            />
          </TabsContent>
        </Tabs>
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
            <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
              <p className="font-medium">{requestChangesItem?.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{requestChangesItem?.shortContext}</p>
            </div>
            <div>
              <p className="text-sm font-medium">What should change?</p>
              <Textarea
                className="mt-2 min-h-[140px]"
                value={requestChangesNote}
                onChange={(event) => setRequestChangesNote(event.target.value)}
                placeholder="Explain the change clearly so the next review is straightforward."
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

function ApprovalCardList({
  items,
  emptyTitle,
  emptyDescription,
  canApprove,
  busy,
  onApprove,
  onRequestChanges,
}: {
  items: ApprovalHubItem[];
  emptyTitle: string;
  emptyDescription: string;
  canApprove: boolean;
  busy: boolean;
  onApprove: (item: ApprovalHubItem) => void;
  onRequestChanges: (item: ApprovalHubItem) => void;
}) {
  if (!items.length) {
    return <EmptyCard title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <ApprovalDecisionCard
          key={item.key}
          item={item}
          canApprove={canApprove && item.actionable && item.status === "pending"}
          busy={busy}
          onApprove={() => onApprove(item)}
          onRequestChanges={() => onRequestChanges(item)}
        />
      ))}
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
            <span className="rounded-full border border-border/70 bg-muted/15 px-3 py-1 text-xs text-muted-foreground">{item.typeLabel}</span>
          </div>
          <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
          <p className="mt-2 text-sm text-foreground">{item.shortContext}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={item.previewHref}>{item.previewLabel}</Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ApprovalMeta label="Current status" value={friendlyApprovalStatus(item.status)} />
        <ApprovalMeta label="Context" value={item.previewSummary} />
        <ApprovalMeta label="Requested by" value={item.requestedBy} />
        <ApprovalMeta label="Created" value={formatPortalDate(item.createdAt)} />
      </div>

      {item.latestNote ? (
        <div className="mt-4 rounded-[20px] border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
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
        ) : null}
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
    </div>
  );
}

function defaultDecisionNote(item: ApprovalHubItem, decision: "approved" | "changes_requested") {
  return decision === "approved"
    ? `Approved from the ${item.typeLabel.toLowerCase()} hub.`
    : `Changes requested from the ${item.typeLabel.toLowerCase()} hub.`;
}
