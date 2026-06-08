import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mailbox, MessagesSquare, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { PageIntro } from "@/components/client-portal";
import { ReplyDraftEditorDialog } from "@/components/reply-draft-editor-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/app-state";
import {
  useConversationDetailQuery,
  useConversationsQuery,
  useCreateReplyDraftMutation,
  useUpdateReplyDraftMutation,
} from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/conversations")({
  head: () => ({ meta: [{ title: "Conversations — Expert Technology Solutions" }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const { user } = useApp();
  const conversationsQuery = useConversationsQuery();
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const conversations = conversationsQuery.data || [];
  const hasReplies = conversations.some((conversation) => isReplyStatus(conversation.status));
  const hasSentConversations = conversations.some((conversation) => isSentOrLaterStatus(conversation.status));
  const detailQuery = useConversationDetailQuery(selectedConversationId || undefined);
  const isAdmin = user?.role === "intergrai_admin";
  const canDraftReplies = ["client_owner", "manager", "sales_user", "intergrai_admin"].includes(user?.role || "");
  const canApproveReplies = ["client_owner", "manager", "intergrai_admin"].includes(user?.role || "");
  const createReplyDraftMutation = useCreateReplyDraftMutation();
  const updateReplyDraftMutation = useUpdateReplyDraftMutation();
  const [reviewNote, setReviewNote] = useState("");
  const [editingReplyDraft, setEditingReplyDraft] = useState(false);

  async function handleCreateDraft() {
    if (!selectedConversation) return;
    try {
      await createReplyDraftMutation.mutateAsync({ conversationId: selectedConversation.id });
      toast.success("Reply draft created.");
      await Promise.all([conversationsQuery.refetch(), detailQuery.refetch()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create a reply draft.");
    }
  }

  async function handleReplyDecision(status: "approved" | "changes_requested") {
    if (!latestReplyDraft) return;
    try {
      await updateReplyDraftMutation.mutateAsync({
        draftId: latestReplyDraft.id,
        status,
        approval_note: reviewNote.trim() || (status === "approved" ? "Approved from the Conversations page." : "Changes requested from the Conversations page."),
      });
      toast.success(status === "approved" ? "Reply approved and sent." : "Reply declined.");
      await Promise.all([conversationsQuery.refetch(), detailQuery.refetch()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that reply decision.");
    }
  }

  async function handleReplyDraftEdit(input: { draftSubject: string; draftBody: string }) {
    if (!latestReplyDraft) return;
    try {
      await updateReplyDraftMutation.mutateAsync({
        draftId: latestReplyDraft.id,
        status: "waiting_for_approval",
        draft_subject: input.draftSubject,
        draft_body: input.draftBody,
        approval_note: "Edited from the Conversations page.",
      });
      toast.success("Reply draft saved.");
      await Promise.all([conversationsQuery.refetch(), detailQuery.refetch()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that reply draft.");
    }
  }

  useEffect(() => {
    if (!conversations.length) {
      if (selectedConversationId) setSelectedConversationId("");
      return;
    }

    if (!selectedConversationId || !conversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const selectedConversation =
    detailQuery.data ||
    conversations.find((conversation) => conversation.id === selectedConversationId) ||
    conversations[0] ||
    null;
  const inboundMessages = selectedConversation?.messages.filter((message) => message.direction === "inbound") || [];
  const outboundMessages = selectedConversation?.messages.filter((message) => message.direction === "outbound") || [];
  const latestOutboundMessage = outboundMessages[outboundMessages.length - 1] || null;
  const latestReplyDraft = selectedConversation?.latestReplyDraft || null;

  if (conversationsQuery.isLoading && !conversationsQuery.data) {
    return (
      <div className="mx-auto max-w-[1320px] space-y-6">
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-[720px]" />
          <Skeleton className="h-[720px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageIntro
        badge="Conversations"
        title="Who are we speaking to and what happened?"
        description="Review prepared emails, sent threads, replies, and approval-gated draft replies in one clear conversation timeline."
        actions={(
          <Button variant="outline" className="gap-2" onClick={() => conversationsQuery.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      {!hasReplies && hasSentConversations ? (
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground">
            Outreach has been sent. Waiting for replies.
          </p>
        </Card>
      ) : null}

      {!conversations.length ? (
        <Card className="p-10 shadow-card">
          <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-12 text-center">
            <p className="font-medium">No conversations yet. Sent outreach and replies will appear here.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Conversation list</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prepared, sent, replied, and approval-gated threads stay client-scoped here.
                </p>
              </div>
              <MessagesSquare className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedConversationId === conversation.id ? "border-primary bg-primary/5 shadow-sm" : "border-border/70 bg-background hover:bg-muted/15"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{conversation.companyName || "Prepared outreach"}</p>
                    <Badge variant="outline" className={statusClassName(conversation.status)}>
                      {conversationStatusLabel(conversation.status)}
                    </Badge>
                    {conversation.replyStatus ? (
                      <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                        {replyStatusLabel(conversation.replyStatus)}
                      </Badge>
                    ) : null}
                    {conversation.status === "sent" ? (
                      <span className="text-xs text-muted-foreground">Waiting for reply</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {conversation.contactName || "No contact"}{conversation.contactEmail ? ` · ${conversation.contactEmail}` : ""}{conversation.campaignName ? ` · ${conversation.campaignName}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-foreground">{conversation.latestSubject || "Prepared email preview"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{conversation.latestSnippet || "No message body captured yet."}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{conversationTimestampLabel(conversation.status)} {formatDateTime(conversation.lastMessageAt || conversation.updatedAt)}</span>
                    {conversation.latestQualityReview ? (
                      <span>Quality {conversation.latestQualityReview.score}/100</span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Conversation detail</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Timeline, prepared email preview, and reply state for the selected conversation.
                </p>
              </div>
              <Mailbox className="h-5 w-5 text-primary" />
            </div>

            {!selectedConversation ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-10 text-center text-sm text-muted-foreground">
                Select a conversation to inspect its timeline.
              </div>
            ) : detailQuery.isLoading && !detailQuery.data ? (
              <div className="mt-6 space-y-3">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusClassName(selectedConversation.status)}>
                    {conversationStatusLabel(selectedConversation.status)}
                  </Badge>
                  {selectedConversation.replyStatus ? (
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                      Reply status: {replyStatusLabel(selectedConversation.replyStatus)}
                    </Badge>
                  ) : null}
                  {selectedConversation.previewOnly ? (
                    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                      Prepared preview
                    </Badge>
                  ) : null}
                </div>

                <MetaCard label="Company" value={selectedConversation.companyName || "Unknown company"} />
                <MetaCard label="Contact" value={selectedConversation.contactName || selectedConversation.contactEmail || "Decision-maker not verified yet"} />
                <MetaCard label="Email" value={selectedConversation.contactEmail || "No email captured"} />
                <MetaCard label="Campaign" value={selectedConversation.campaignName || "No linked campaign"} />
                <MetaCard label="Subject" value={selectedConversation.latestSubject || latestOutboundMessage?.subject || "No subject captured"} />
                <MetaCard
                  label="Status"
                  value={selectedConversation.status === "sent" ? "Sent / Waiting for reply" : conversationStatusDescription(selectedConversation.status)}
                />
                {selectedConversation.replyStatus ? (
                  <MetaCard label="Reply workflow" value={replyStatusLabel(selectedConversation.replyStatus)} />
                ) : null}
                <MetaCard
                  label={selectedConversation.status === "prepared" ? "Prepared at" : "Sent at"}
                  value={formatDateTime(latestOutboundMessage?.sentAt || selectedConversation.lastMessageAt || selectedConversation.updatedAt)}
                />
                {selectedConversation.latestQualityReview ? (
                  <MetaCard
                    label="Quality review"
                    value={`Score ${selectedConversation.latestQualityReview.score}/100 · ${formatLabel(selectedConversation.latestQualityReview.status)}`}
                  />
                ) : null}
                {isAdmin && latestOutboundMessage?.providerMessageId ? (
                  <MetaCard label="Provider message ID" value={latestOutboundMessage.providerMessageId} />
                ) : null}

                {!selectedConversation.previewOnly ? (
                  <div className="rounded-[24px] border border-border/70 bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Reply draft</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Replies stay approval-gated. Nothing sends automatically.
                        </p>
                      </div>
                      {inboundMessages.length > 0 && !latestReplyDraft && canDraftReplies ? (
                        <Button
                          size="sm"
                          onClick={() => void handleCreateDraft()}
                          disabled={createReplyDraftMutation.isPending}
                        >
                          Create draft
                        </Button>
                      ) : null}
                    </div>

                    {inboundMessages.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-success/20 bg-success/5 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                            Inbound reply
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(inboundMessages[inboundMessages.length - 1]?.receivedAt || inboundMessages[inboundMessages.length - 1]?.createdAt)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium">
                          {inboundMessages[inboundMessages.length - 1]?.subject || "No subject"}
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
                          {inboundMessages[inboundMessages.length - 1]?.bodyText || "No inbound body captured."}
                        </pre>
                      </div>
                    ) : null}

                    {latestReplyDraft ? (
                      <div className="mt-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={replyDraftStatusClassName(latestReplyDraft.status)}>
                            {replyDraftStatusLabel(latestReplyDraft.status)}
                          </Badge>
                          {latestReplyDraft.modelRouteUsed ? (
                            <span className="text-xs text-muted-foreground">Route {latestReplyDraft.modelRouteUsed}</span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            Training notes used {latestReplyDraft.trainingContextUsed.length}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium">{latestReplyDraft.draftSubject || "Reply draft"}</p>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
                          {latestReplyDraft.draftBody || "No reply body captured."}
                        </pre>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {latestReplyDraft.status === "approved"
                            ? "Approved and sent through the approved reply path."
                            : latestReplyDraft.status === "changes_requested"
                              ? "Changes requested. Edit the draft and save it again."
                              : "Needs approval before any send path can continue."}
                        </p>
                        {latestReplyDraft.approvalNote ? (
                          <p className="mt-3 text-xs text-muted-foreground">{latestReplyDraft.approvalNote}</p>
                        ) : null}
                        {canApproveReplies ? (
                          <div className="mt-4 space-y-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Reviewer note</p>
                              <textarea
                                className="mt-2 min-h-[88px] w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                                value={reviewNote}
                                onChange={(event) => setReviewNote(event.target.value)}
                                placeholder="Optional note for approval or requested changes"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingReplyDraft(true)}
                                disabled={updateReplyDraftMutation.isPending}
                              >
                                Edit draft
                              </Button>
                              {latestReplyDraft.status !== "approved" ? (
                                <Button
                                  size="sm"
                                  onClick={() => void handleReplyDecision("approved")}
                                  disabled={updateReplyDraftMutation.isPending}
                                >
                                  Approve &amp; Send
                                </Button>
                              ) : null}
                              {latestReplyDraft.status !== "changes_requested" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleReplyDecision("changes_requested")}
                                  disabled={updateReplyDraftMutation.isPending}
                                >
                                  Decline
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : inboundMessages.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/15 p-4 text-sm text-muted-foreground">
                        Reply imported and waiting for review. Create a draft before any approval or send step.
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/15 p-4 text-sm text-muted-foreground">
                        No inbound reply has been synced yet, so there is no reply draft to review.
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-border/70 bg-background p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Timeline</p>
                  <div className="mt-4 space-y-4">
                    {selectedConversation.messages.map((message) => (
                      <div key={message.id} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={message.direction === "outbound" ? "border-primary/20 bg-primary/10 text-primary" : "border-success/30 bg-success/10 text-success"}>
                            {formatLabel(message.direction)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(message.sentAt || message.receivedAt || message.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {message.direction === "outbound"
                            ? `From ${message.fromEmail || "-"} to ${message.toEmail || "-"}`
                            : `From ${message.fromEmail || "-"} to ${message.toEmail || "-"}`
                          }
                        </p>
                        <p className="mt-3 text-sm font-medium">{message.subject || "No subject"}</p>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">{message.bodyText || "No body captured."}</pre>
                      </div>
                    ))}
                    {selectedConversation.messages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/15 p-4 text-sm text-muted-foreground">
                        No messages are attached to this conversation yet.
                      </div>
                    ) : null}
                    {inboundMessages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/15 p-4 text-sm text-muted-foreground">
                        No reply yet. The outbound email is visible above and this thread will update when a response arrives.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <ReplyDraftEditorDialog
        open={editingReplyDraft}
        onOpenChange={setEditingReplyDraft}
        conversation={selectedConversation}
        draft={latestReplyDraft}
        busy={updateReplyDraftMutation.isPending}
        title={`Edit reply draft — ${selectedConversation?.companyName || selectedConversation?.contactName || "Conversation"}`}
        description="Make the reply clearer, then save it back to approval-gated review."
        saveLabel="Save draft"
        onSave={handleReplyDraftEdit}
      />
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
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

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isReplyStatus(status: string) {
  return ["replied", "positive_reply", "meeting_requested", "quote_requested"].includes(status);
}

function isSentOrLaterStatus(status: string) {
  return ["sent", "replied", "positive_reply", "meeting_requested", "quote_requested", "not_interested", "bounced", "unsubscribed", "closed"].includes(status);
}

function conversationStatusLabel(status: string) {
  if (status === "sent") {
    return "Sent";
  }
  if (status === "prepared") {
    return "Draft reply ready";
  }
  if (status === "replied") {
    return "Reply received";
  }
  if (status === "closed") {
    return "Closed";
  }

  return formatLabel(status);
}

function conversationStatusDescription(status: string) {
  if (status === "prepared") {
    return "Draft reply ready";
  }
  if (status === "sent") {
    return "Sent / Waiting for reply";
  }
  if (status === "replied") {
    return "Reply received";
  }
  if (status === "closed") {
    return "Closed";
  }

  return formatLabel(status);
}

function replyStatusLabel(status: string) {
  switch (status) {
    case "needs_review":
      return "Awaiting approval";
    case "draft_ready":
      return "Draft reply ready";
    case "approved":
      return "Approved";
    case "sent":
      return "Sent reply";
    default:
      return formatLabel(status);
  }
}

function replyDraftStatusLabel(status: string) {
  switch (status) {
    case "waiting_for_approval":
      return "Awaiting approval";
    case "draft_ready":
      return "Draft reply ready";
    case "changes_requested":
      return "Declined / changes requested";
    case "approved":
      return "Approved";
    case "sent":
      return "Sent reply";
    default:
      return formatLabel(status);
  }
}

function replyDraftStatusClassName(status: string) {
  if (status === "approved" || status === "sent") {
    return "border-success/30 bg-success/10 text-success";
  }
  if (status === "changes_requested" || status === "archived") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-warning/30 bg-warning/10 text-warning-foreground";
}

function conversationTimestampLabel(status: string) {
  if (status === "prepared") {
    return "Draft reply ready";
  }
  if (status === "sent") {
    return "Sent";
  }
  if (status === "replied") {
    return "Reply received";
  }
  if (status === "closed") {
    return "Closed";
  }

  return "Last activity";
}

function statusClassName(status: string) {
  if (status === "prepared") {
    return "border-warning/30 bg-warning/10 text-warning-foreground";
  }
  if (status === "sent") {
    return "border-info/30 bg-info/10 text-info";
  }
  if (status === "replied" || status === "positive_reply" || status === "meeting_requested" || status === "quote_requested") {
    return "border-success/30 bg-success/10 text-success";
  }
  if (status === "closed") {
    return "border-border/70 bg-muted/20 text-muted-foreground";
  }
  if (isReplyStatus(status)) {
    return "border-success/30 bg-success/10 text-success";
  }
  if (["bounced", "unsubscribed", "not_interested", "closed"].includes(status)) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-warning/30 bg-warning/10 text-warning-foreground";
}
