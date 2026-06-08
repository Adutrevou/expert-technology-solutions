import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList, MessageSquareText, RefreshCcw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import {
  useCreateRequestMutation,
  useRequestDetailQuery,
  useRequestsQuery,
} from "@/lib/leads-api-hooks";
import {
  normalizeRequestHistory,
  type RequestCategory,
  type RequestDetailRecord,
  type RequestReplyRecord,
} from "@/lib/leads-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/requests")({
  head: () => ({ meta: [{ title: "Requests — Expert Technology Solutions" }] }),
  component: RequestsPage,
});

const REQUEST_CATEGORY_OPTIONS: Array<{ value: RequestCategory; label: string }> = [
  { value: "new_campaign", label: "Add campaign idea" },
  { value: "campaign_change", label: "Pause or change campaign" },
  { value: "lead_question", label: "Find more leads" },
  { value: "outreach_draft", label: "Review reply" },
  { value: "support_issue", label: "General request" },
];

function RequestsPage() {
  const { user } = useApp();
  const requestsQuery = useRequestsQuery();
  const createRequestMutation = useCreateRequestMutation();

  const [category, setCategory] = useState<RequestCategory>("new_campaign");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);

  const requests = useMemo(
    () =>
      (requestsQuery.data?.requests ?? []).map((item, index) =>
        normalizeRequestHistory(item, index),
      ),
    [requestsQuery.data?.requests],
  );

  const selectedRequestSummary =
    requests.find((request) => request.id === selectedRequestId) || null;
  const detailQuery = useRequestDetailQuery(selectedRequestId || undefined);
  const selectedRequestDetail = useMemo<RequestDetailRecord | null>(() => {
    if (detailQuery.data) return detailQuery.data;
    if (!selectedRequestSummary) return null;
    return {
      ...selectedRequestSummary,
      replies: [],
    };
  }, [detailQuery.data, selectedRequestSummary]);

  useEffect(() => {
    if (requests.length === 0) {
      if (selectedRequestId !== null) setSelectedRequestId(null);
      return;
    }

    const exists = requests.some((request) => request.id === selectedRequestId);
    if (!selectedRequestId || !exists) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  const createdByName = user?.name?.trim() || "Expert Portal User";
  const createdByEmail = user?.email?.trim() || "";
  const createdByRole = user?.role || "manager";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextMessage = message.trim();

    if (!nextTitle || !nextMessage) {
      setSubmitNotice(null);
      setSubmitError("Enter a title and request details before submitting.");
      return;
    }

    if (!createdByEmail) {
      setSubmitNotice(null);
      setSubmitError("Your session is missing an email address. Sign in again and retry.");
      return;
    }

    setSubmitError(null);
    setSubmitNotice(null);

    try {
      const createdRequest = await createRequestMutation.mutateAsync({
        category,
        title: nextTitle,
        message: nextMessage,
        created_by_name: createdByName,
        created_by_email: createdByEmail,
        created_by_role: createdByRole,
      });

      setTitle("");
      setMessage("");
      setSubmitNotice("Request received. Intergrai will review and respond.");

      await requestsQuery.refetch();

      if (createdRequest.id) {
        setSelectedRequestId(createdRequest.id);
      }
    } catch (error) {
      setSubmitNotice(null);
      setSubmitError(
        error instanceof Error ? error.message : "Unable to submit your request right now.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="rounded-[28px] border border-border/70 bg-gradient-subtle px-6 py-6 shadow-card md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-muted-foreground">
              Powered by Intergrai
            </p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Requests for Intergrai / Agent</h1>
            <p className="mt-2 text-sm text-muted-foreground">Simple client requests and replies</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/12 px-3 py-1 font-medium text-primary">
              Authenticated portal
            </span>
            <span>Client-visible request queue</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="p-6 shadow-card">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Submit a request</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send a short request for the agent or for Intergrai to review. Nothing here sends outreach automatically.
                </p>
              </div>
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="request-category">Request category</Label>
                <select
                  id="request-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as RequestCategory)}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {REQUEST_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-title">Title</Label>
                <Input
                  id="request-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Need changes to campaign messaging"
                  maxLength={160}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-message">Message / details</Label>
                <Textarea
                  id="request-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Describe what you need, any context, deadlines, and the expected outcome."
                  className="min-h-[180px] resize-y"
                />
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-3 text-xs text-muted-foreground">
                Sending as {createdByName}
                {createdByEmail ? ` · ${createdByEmail}` : ""}
                {createdByRole ? ` · ${formatLabel(createdByRole)}` : ""}
              </div>

              {submitError ? <InlineMessage tone="error">{submitError}</InlineMessage> : null}
              {submitNotice ? <InlineMessage tone="success">{submitNotice}</InlineMessage> : null}

              <Button type="submit" className="w-full gap-2" disabled={createRequestMutation.isPending}>
                <Send className="h-4 w-4" />
                {createRequestMutation.isPending ? "Submitting..." : "Submit request"}
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
              <h2 className="font-semibold">Request history</h2>
              <p className="text-xs text-muted-foreground">Client-visible requests and replies</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => requestsQuery.refetch()}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="max-h-[720px] overflow-y-auto">
              {requestsQuery.isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : requestsQuery.isError ? (
                <div className="p-4">
                  <InlineMessage tone="error">
                    {(requestsQuery.error as Error | undefined)?.message ||
                      "Unable to load request history."}
                  </InlineMessage>
                </div>
              ) : requests.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No requests yet"
                    description="Submitted requests will appear here once they are created."
                  />
                </div>
              ) : (
                <div className="grid gap-3 p-4">
                  {requests.map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => setSelectedRequestId(request.id)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-smooth",
                        request.id === selectedRequestId
                          ? "border-primary bg-primary/6 shadow-card"
                          : "border-border bg-card hover:bg-muted/25",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <CategoryBadge category={request.category} />
                            <RequestStatusBadge status={request.clientVisibleStatus} />
                          </div>
                          <h3 className="mt-3 truncate text-sm font-semibold md:text-base">
                            {request.title}
                          </h3>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatTimestamp(request.createdAt)}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {request.latestReply || request.message || "No reply yet."}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="min-h-[720px] p-6 shadow-card">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Request detail</h2>
              <p className="mt-1 text-sm text-muted-foreground">Original request, latest replies, and status updates.</p>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            Requests are just a clean inbox for Intergrai and the agent. Approved campaigns and approved templates stay unchanged here.
          </div>

          {!selectedRequestId ? (
            <EmptyState
              title="Select a request"
              description="Choose a request from history to review the original message and responses."
            />
          ) : detailQuery.isLoading && !selectedRequestDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : selectedRequestDetail ? (
            <RequestDetailPanel
              request={selectedRequestDetail}
              error={(detailQuery.error as Error | undefined)?.message || null}
              isRefreshing={detailQuery.isFetching}
              onRefresh={() => detailQuery.refetch()}
            />
          ) : (
            <InlineMessage tone="error">Unable to load that request.</InlineMessage>
          )}
        </Card>
      </div>
    </div>
  );
}

function RequestDetailPanel({
  request,
  error,
  isRefreshing,
  onRefresh,
}: {
  request: RequestDetailRecord;
  error: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const replies = request.replies ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-muted/15 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={request.category} />
              <RequestStatusBadge status={request.clientVisibleStatus} />
            </div>
            <h3 className="mt-3 text-2xl font-semibold">{request.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Submitted {formatTimestamp(request.createdAt)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {request.createdByName || request.createdByEmail || request.createdByRole ? (
          <div className="text-xs text-muted-foreground">
            {request.createdByName || "Portal user"}
            {request.createdByEmail ? ` · ${request.createdByEmail}` : ""}
            {request.createdByRole ? ` · ${formatLabel(request.createdByRole)}` : ""}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/70 bg-card px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Original request
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
            {request.message || "No request message was included."}
          </p>
        </div>
      </div>

      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Replies &amp; updates</h4>
          <span className="text-xs text-muted-foreground">
            {replies.length} visible item{replies.length === 1 ? "" : "s"}
          </span>
        </div>

        {replies.length === 0 ? (
          <EmptyState
            title="No replies yet"
            description="Intergrai has not posted a client-visible reply or status update for this request yet."
          />
        ) : (
          replies.map((reply) => <ReplyCard key={reply.id} reply={reply} />)
        )}
      </div>
    </div>
  );
}

function ReplyCard({ reply }: { reply: RequestReplyRecord }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ReplyTypeBadge type={reply.type} />
          {reply.status ? <RequestStatusBadge status={reply.status} /> : null}
        </div>
        <p className="text-xs text-muted-foreground">{formatTimestamp(reply.createdAt)}</p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{reply.message}</p>
      {reply.authorName || reply.authorEmail || reply.authorRole ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {reply.authorName || "Intergrai"}
          {reply.authorEmail ? ` · ${reply.authorEmail}` : ""}
          {reply.authorRole ? ` · ${formatLabel(reply.authorRole)}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge
      variant="outline"
      className="bg-info/12 text-info border-info/20 text-[10px] uppercase tracking-wide"
    >
      {formatLabel(category)}
    </Badge>
  );
}

function RequestStatusBadge({ status }: { status: string }) {
  const tone = REQUEST_STATUS_STYLES[status] || "bg-muted text-muted-foreground";
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent text-[10px] uppercase tracking-wide", tone)}
    >
      {formatLabel(status)}
    </Badge>
  );
}

function ReplyTypeBadge({ type }: { type: RequestReplyRecord["type"] }) {
  const label =
    type === "status_update"
      ? "Status update"
      : type === "message"
        ? "Message"
        : type === "reply"
          ? "Reply"
          : "Update";
  return (
    <Badge
      variant="outline"
      className="border-border/70 bg-muted/30 text-[10px] uppercase tracking-wide"
    >
      {label}
    </Badge>
  );
}

function InlineMessage({ children, tone }: { children: ReactNode; tone: "error" | "success" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success",
      )}
    >
      {children}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function formatTimestamp(value?: string) {
  if (!value) return "Time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return formatDistanceToNow(date, { addSuffix: true });
}

function formatLabel(value: string) {
  return (
    value
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Unknown"
  );
}

const REQUEST_STATUS_STYLES: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  under_review: "bg-info/12 text-info",
  in_progress: "bg-primary/12 text-primary",
  waiting_on_you: "bg-warning/15 text-warning-foreground",
  completed: "bg-success/15 text-success",
  rejected: "bg-destructive/12 text-destructive",
};
