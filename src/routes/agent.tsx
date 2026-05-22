import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Bot, CheckCircle2, Inbox, RefreshCcw, Send, ShieldAlert, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestStatusBadge } from "@/components/status-badges";
import { useApp } from "@/lib/app-state";
import { useCampaignsQuery, useLeadsQuery, useRequestDetailQuery, useRequestsQuery } from "@/lib/leads-api-hooks";
import {
  createRequest,
  normalizeCampaign,
  normalizeLead,
  normalizeRequest,
  REQUEST_CATEGORIES,
  type RequestCategory,
} from "@/lib/leads-api";

export const Route = createFileRoute("/agent")({
  head: () => ({ meta: [{ title: "Expert Lead Agent — Expert Technology Solutions" }] }),
  component: AgentRequestsPage,
});

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  new_campaign: "New campaign",
  campaign_change: "Campaign change",
  lead_question: "Lead question",
  outreach_draft: "Outreach draft",
  support_issue: "Support issue",
};

const PREVIEW_COPY =
  "Internal preview — this feature will be enabled for Expert users after login is active.";

function AgentRequestsPage() {
  const { user } = useApp();

  if (user?.role !== "super_admin") {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-10 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Admin preview only</h1>
          <p className="mt-2 text-sm text-muted-foreground">{PREVIEW_COPY}</p>
        </Card>
      </div>
    );
  }

  return <AgentRequestsAdminView />;
}

function AgentRequestsAdminView() {
  const { user } = useApp();
  const queryClient = useQueryClient();
  const requestsQuery = useRequestsQuery();
  const leadsQuery = useLeadsQuery();
  const campaignsQuery = useCampaignsQuery();
  const [category, setCategory] = useState<RequestCategory>("lead_question");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [relatedLeadId, setRelatedLeadId] = useState("none");
  const [relatedCampaignId, setRelatedCampaignId] = useState("none");
  const requests = useMemo(
    () => (requestsQuery.data?.requests || []).map(normalizeRequest),
    [requestsQuery.data?.requests],
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const detailQuery = useRequestDetailQuery(selectedRequestId);
  const leads = useMemo(() => (leadsQuery.data?.leads || []).map(normalizeLead), [leadsQuery.data?.leads]);
  const campaigns = useMemo(
    () => (campaignsQuery.data?.campaigns || []).map(normalizeCampaign),
    [campaignsQuery.data?.campaigns],
  );

  const selectedRequest = useMemo(() => {
    const detailRequest = detailQuery.data?.request ? normalizeRequest(detailQuery.data.request) : null;
    if (detailRequest) return detailRequest;
    return requests.find((request) => request.id === selectedRequestId) || requests[0] || null;
  }, [detailQuery.data?.request, requests, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequestId && requests[0]?.id) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  const submitMutation = useMutation({
    mutationFn: () =>
      createRequest({
        category,
        title: title.trim() || undefined,
        message: message.trim(),
        related_lead_id: relatedLeadId !== "none" ? relatedLeadId : undefined,
        related_campaign_id: relatedCampaignId !== "none" ? relatedCampaignId : undefined,
        created_by_name: user?.name || "Intergrai Admin Preview",
        created_by_email: user?.email || "admin@intergrai.co.za",
        created_by_role: user?.role || "intergrai_admin",
      }),
    onSuccess: async (response) => {
      const createdRequest = normalizeRequest(response.request);
      setTitle("");
      setMessage("");
      setRelatedLeadId("none");
      setRelatedCampaignId("none");
      setSelectedRequestId(createdRequest.id);
      await queryClient.invalidateQueries({ queryKey: ["intergrai", "requests"] });
      await queryClient.invalidateQueries({ queryKey: ["intergrai", "requests", createdRequest.id] });
    },
  });

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-border bg-gradient-subtle p-6 shadow-card md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              Powered by Intergrai
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Expert Lead Agent</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{PREVIEW_COPY}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/85 px-4 py-3 text-sm shadow-card">
            <p className="font-medium">Internal preview notice</p>
            <p className="mt-1 text-muted-foreground">
              Hidden from normal client navigation. Requests submit against the live Intergrai client queue.
            </p>
          </div>
        </div>
      </header>

      {submitMutation.isSuccess ? (
        <Card className="border-success/30 bg-success/10 shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm">Request submitted successfully. History has been refreshed.</p>
          </CardContent>
        </Card>
      ) : null}

      {submitMutation.isError ? (
        <Card className="border-destructive/30 bg-destructive/10 shadow-card">
          <CardContent className="p-4 text-sm text-destructive">
            {(submitMutation.error as Error).message || "The request could not be submitted."}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Submit a request</CardTitle>
            <CardDescription>
              Structured preview form for the central Leads API request queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 rounded-3xl border border-border bg-background/70 p-4 md:grid-cols-3">
              <PreviewMetric label="API target" value="api.intergrai.co.za" />
              <PreviewMetric label="Client slug" value="expert-technology-solutions" />
              <PreviewMetric label="Preview actor" value={user?.name || "Intergrai Admin Preview"} />
            </div>

            <FieldBlock label="Request category">
              <Select value={category} onValueChange={(value) => setCategory(value as RequestCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {CATEGORY_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldBlock>

            <FieldBlock label="Request title" hint="Optional but recommended">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Short summary of the request"
              />
            </FieldBlock>

            <FieldBlock label="Message or details">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the request, needed outcome, context, and any deadlines."
                className="min-h-[180px] resize-y"
              />
            </FieldBlock>

            <div className="grid gap-5 md:grid-cols-2">
              <FieldBlock
                label="Related lead"
                hint={leadsQuery.isError ? "Lead selector unavailable right now." : "Optional"}
              >
                <Select value={relatedLeadId} onValueChange={setRelatedLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No related lead</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} · {lead.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldBlock>

              <FieldBlock
                label="Related campaign"
                hint={campaignsQuery.isError ? "Campaign selector unavailable right now." : "Optional"}
              >
                <Select value={relatedCampaignId} onValueChange={setRelatedCampaignId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No related campaign</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldBlock>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
              <p className="font-medium">Submission identity</p>
              <p className="mt-1 text-muted-foreground">
                {(user?.name || "Intergrai Admin Preview") +
                  " · " +
                  (user?.email || "admin@intergrai.co.za") +
                  " · " +
                  (user?.role || "intergrai_admin")}
              </p>
            </div>

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!message.trim() || submitMutation.isPending}
              className="w-full gap-2 md:w-auto"
            >
              {submitMutation.isPending ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  Submitting
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:grid-cols-1">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Request history</CardTitle>
                <CardDescription>Latest requests submitted for this client.</CardDescription>
              </div>
              <Button onClick={() => requestsQuery.refetch()} variant="outline" size="sm" className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {requestsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : requestsQuery.isError ? (
                <EmptyState title="Request history unavailable" description="The requests endpoint could not be loaded right now." />
              ) : requests.length === 0 ? (
                <EmptyState title="No requests yet" description="Submit the first request from this preview form." />
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => {
                    const active = request.id === (selectedRequestId || selectedRequest?.id);
                    const replyCount = request.replies.length;
                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => setSelectedRequestId(request.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition-smooth ${
                          active
                            ? "border-primary/40 bg-primary/10 shadow-card"
                            : "border-border bg-card hover:border-primary/30 hover:bg-muted/20"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                              {CATEGORY_LABELS[request.category]}
                            </p>
                            <h2 className="mt-2 line-clamp-1 font-semibold">{request.title}</h2>
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{request.latestReply || request.message}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
                              {request.createdByName ? <span>Submitted by {request.createdByName}</span> : null}
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <RequestStatusBadge status={request.status} />
                            <p className="text-xs text-muted-foreground">{formatRequestDate(request.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Request details</CardTitle>
              <CardDescription>Selected request plus latest replies if available.</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRequestId && detailQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              ) : !selectedRequest ? (
                <EmptyState title="No request selected" description="Pick a request from history to inspect its full details." />
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/15 p-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {CATEGORY_LABELS[selectedRequest.category]}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">{selectedRequest.title}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Created {formatRequestDate(selectedRequest.createdAt, true)}
                      </p>
                    </div>
                    <RequestStatusBadge status={selectedRequest.status} />
                  </div>

                  <DetailPanel label="Request message" value={selectedRequest.message} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailPanel
                      label="Related lead"
                      value={findLeadLabel(leads, selectedRequest.relatedLeadId) || "No linked lead"}
                    />
                    <DetailPanel
                      label="Related campaign"
                      value={findCampaignLabel(campaigns, selectedRequest.relatedCampaignId) || "No linked campaign"}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <DetailPanel label="Submitted by" value={selectedRequest.createdByName || "Unknown"} />
                    <DetailPanel label="Email" value={selectedRequest.createdByEmail || "Not provided"} />
                    <DetailPanel
                      label="Role"
                      value={selectedRequest.createdByRole ? selectedRequest.createdByRole.replace(/_/g, " ") : "Not provided"}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Intergrai replies and client-visible updates
                      </p>
                    </div>
                    {selectedRequest.replies.length === 0 ? (
                      <EmptyState title="No replies yet" description="This request has not received a reply from the central queue." compact />
                    ) : (
                      selectedRequest.replies.map((reply) => (
                        <div key={reply.id} className="rounded-2xl border border-border bg-background/80 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">{reply.authorName || "Intergrai"}</p>
                            <p className="text-xs text-muted-foreground">{formatRequestDate(reply.createdAt)}</p>
                          </div>
                          {reply.authorRole ? (
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {reply.authorRole.replace(/_/g, " ")}
                            </p>
                          ) : null}
                          <p className="mt-3 text-sm leading-6">{reply.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">{label}</label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function DetailPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-dashed border-border bg-muted/15 text-center ${compact ? "px-4 py-8" : "px-6 py-10"}`}>
      <Inbox className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function formatRequestDate(value?: string, includeRelative = false) {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const absolute = format(parsed, "PPP p");
  if (!includeRelative) return absolute;
  return `${absolute} (${formatDistanceToNow(parsed, { addSuffix: true })})`;
}

function findLeadLabel(leads: Array<{ id: string; name: string; company: string }>, leadId?: string) {
  if (!leadId) return null;
  const match = leads.find((lead) => lead.id === leadId);
  return match ? `${match.name} · ${match.company}` : leadId;
}

function findCampaignLabel(campaigns: Array<{ id: string; name: string }>, campaignId?: string) {
  if (!campaignId) return null;
  const match = campaigns.find((campaign) => campaign.id === campaignId);
  return match ? match.name : campaignId;
}
