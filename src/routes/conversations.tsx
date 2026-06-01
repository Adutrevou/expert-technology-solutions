import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mailbox, MessagesSquare, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversationDetailQuery, useConversationsQuery } from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/conversations")({
  head: () => ({ meta: [{ title: "Conversations — Expert Technology Solutions" }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const conversationsQuery = useConversationsQuery();
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const conversations = conversationsQuery.data || [];
  const hasReplies = conversations.some((conversation) => ["replied", "positive_reply", "meeting_requested", "quote_requested"].includes(conversation.status));
  const detailQuery = useConversationDetailQuery(selectedConversationId || undefined);

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
      <header className="rounded-[28px] border border-border/70 bg-gradient-subtle px-6 py-6 shadow-card md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">Conversations</Badge>
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Prepared to replied</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Outreach history and thread view</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Prepared outreach previews are visible now. Sent threads and replies will accumulate here once live outreach starts.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => conversationsQuery.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      {!hasReplies ? (
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground">
            No replies yet. Conversations will appear here once outreach is sent and replies are received.
          </p>
        </Card>
      ) : null}

      {!conversations.length ? (
        <Card className="p-10 shadow-card">
          <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-12 text-center">
            <p className="font-medium">No replies yet. Conversations will appear here once outreach is sent and replies are received.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Conversation list</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prepared, sent, and replied threads stay client-scoped here.
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
                      {formatLabel(conversation.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {conversation.contactName || "No contact"}{conversation.campaignName ? ` · ${conversation.campaignName}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-foreground">{conversation.latestSubject || "Prepared email preview"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{conversation.latestSnippet || "No message body captured yet."}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Last activity {formatDateTime(conversation.lastMessageAt || conversation.updatedAt)}</span>
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
                    {formatLabel(selectedConversation.status)}
                  </Badge>
                  {selectedConversation.replyStatus ? (
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                      Reply status: {formatLabel(selectedConversation.replyStatus)}
                    </Badge>
                  ) : null}
                  {selectedConversation.previewOnly ? (
                    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                      Prepared preview
                    </Badge>
                  ) : null}
                </div>

                <MetaCard label="Company" value={selectedConversation.companyName || "Unknown company"} />
                <MetaCard label="Contact" value={selectedConversation.contactName || selectedConversation.contactEmail || "Unknown contact"} />
                <MetaCard label="Campaign" value={selectedConversation.campaignName || "No linked campaign"} />
                {selectedConversation.latestQualityReview ? (
                  <MetaCard
                    label="Quality review"
                    value={`Score ${selectedConversation.latestQualityReview.score}/100 · ${formatLabel(selectedConversation.latestQualityReview.status)}`}
                  />
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
                        <p className="mt-3 text-sm font-medium">{message.subject || "No subject"}</p>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">{message.bodyText || "No body captured."}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
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

function statusClassName(status: string) {
  if (["replied", "positive_reply", "meeting_requested", "quote_requested"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }
  if (["bounced", "unsubscribed", "not_interested", "closed"].includes(status)) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-warning/30 bg-warning/10 text-warning-foreground";
}
