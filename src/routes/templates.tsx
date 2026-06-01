import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCcw } from "lucide-react";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import {
  useApprovalDecisionMutation,
  useCreateRequestMutation,
  useLeadAgentSummaryQuery,
  useOutreachRenderPreviewQuery,
} from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — Expert Technology Solutions" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const approvalDecisionMutation = useApprovalDecisionMutation();
  const createRequestMutation = useCreateRequestMutation();
  const [selectedQueueItemId, setSelectedQueueItemId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === "intergrai_admin";
  const canApprove = user?.role === "client_owner" || user?.role === "manager" || isAdmin;

  const data = summaryQuery.data;
  const renderPreviewQuery = useOutreachRenderPreviewQuery(selectedQueueItemId || undefined);
  const approvalsByEntityId = useMemo(() => {
    const map = new Map<string, string>();
    for (const approval of data?.approvals || []) {
      if (approval.entityId) map.set(approval.entityId, approval.id);
    }
    return map;
  }, [data?.approvals]);

  useEffect(() => {
    if (!data?.outreachQueue.length) {
      if (selectedQueueItemId) setSelectedQueueItemId("");
      return;
    }
    if (!selectedQueueItemId || !data.outreachQueue.some((item) => item.id === selectedQueueItemId)) {
      const preferredItem = data.outreachQueue.find((item) => item.renderPreviewAvailable) || data.outreachQueue[0];
      setSelectedQueueItemId(preferredItem.id);
    }
  }, [data?.outreachQueue, selectedQueueItemId]);

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <TemplatesLoadingState />;
  }

  if (!data) {
    return (
      <Card className="mx-auto max-w-[1280px] p-10 text-center shadow-card">
        <h1 className="text-2xl font-semibold">Templates unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">The outreach template workspace could not be loaded.</p>
      </Card>
    );
  }

  const selectedQueueItem = data.outreachQueue.find((item) => item.id === selectedQueueItemId) || data.outreachQueue[0] || null;

  const handleDraftChange = (id: string, field: "subject" | "body", value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        subject: current[id]?.subject ?? "",
        body: current[id]?.body ?? "",
        [field]: value,
      },
    }));
  };

  const handleApprove = async (entityId: string) => {
    const approvalId = approvalsByEntityId.get(entityId);
    if (!approvalId) return;

    setError(null);
    setNotice(null);

    try {
      await approvalDecisionMutation.mutateAsync({ approvalId, decision: "approved" });
      setNotice("Template approval recorded.");
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to approve that template.");
    }
  };

  const handleRequestChanges = async (entityId: string, subject: string, body: string, label: string) => {
    const approvalId = approvalsByEntityId.get(entityId);
    const note = buildChangeRequestNote(subject, body);

    setError(null);
    setNotice(null);

    try {
      if (approvalId) {
        await approvalDecisionMutation.mutateAsync({
          approvalId,
          decision: "rejected",
          decision_note: note,
        });
      } else {
        await createRequestMutation.mutateAsync({
          category: "outreach_draft",
          title: `Template changes requested: ${label}`,
          message: note,
          created_by_name: user?.name || "Portal user",
          created_by_email: user?.email || "",
          created_by_role: user?.role || "manager",
        });
      }
      setNotice("Template changes requested.");
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to request changes.");
    }
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <header className="rounded-[28px] border border-border/70 bg-gradient-subtle px-6 py-6 shadow-card md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">Templates</Badge>
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Prepared only</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Outreach templates and preview</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Review outreach templates, compare A/B variants, and manage approval decisions here. Prepared outreach is visible below, but sending remains paused until launch approval.
            </p>
          </div>
          <Button variant="outline" onClick={() => summaryQuery.refetch()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      {error ? <Message tone="error">{error}</Message> : null}
      {notice ? <Message tone="success">{notice}</Message> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-xl font-semibold">Template library</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live templates stay unchanged until they are approved. Use the editable working copy below to request revisions safely.
          </p>

          <div className="mt-5 space-y-4">
            {data.outreachTemplates.map((template) => (
              <div key={template.id} className="rounded-[24px] border border-border/70 bg-background p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{template.campaignName || "No linked campaign"} · {formatLabel(template.templateType)}</p>
                  </div>
                  <ApprovalStatusBadge status={toBadgeStatus(template.approvalStatus)} />
                </div>

                <div className="mt-4 space-y-4">
                  {template.variants.map((variant) => {
                    const draft = drafts[variant.id];
                    const subject = draft?.subject ?? variant.subjectTemplate;
                    const body = draft?.body ?? variant.bodyTemplate;
                    const approvalId = approvalsByEntityId.get(variant.id);
                    const showActions = canApprove && variant.approvalStatus !== "approved";
                    const qualityReview = variant.latestQualityReview;

                    return (
                      <div key={variant.id} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">Variant {variant.variantLabel || "A"}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">{formatLabel(variant.status)}</p>
                          </div>
                          <ApprovalStatusBadge status={toBadgeStatus(variant.approvalStatus)} />
                        </div>

                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Subject working copy</p>
                            <Textarea
                              value={subject}
                              onChange={(event) => handleDraftChange(variant.id, "subject", event.target.value)}
                              className="mt-2 min-h-[72px] resize-y bg-background"
                            />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Body working copy</p>
                            <Textarea
                              value={body}
                              onChange={(event) => handleDraftChange(variant.id, "body", event.target.value)}
                              className="mt-2 min-h-[220px] resize-y bg-background"
                            />
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-border/70 bg-background p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                              Quality score {qualityReview?.score ?? "N/A"}
                            </Badge>
                            <Badge variant="outline" className={qualityBadgeClassName(qualityReview?.status || "needs_review")}>
                              {qualityReview?.status === "improve_before_send" ? "Needs improvement before send" : formatLabel(qualityReview?.status || "needs_review")}
                            </Badge>
                          </div>
                          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Sales-quality review</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {qualityReview
                              ? `Human ${qualityReview.humanSoundingScore}/25 · Specificity ${qualityReview.specificityScore}/25 · Sales clarity ${qualityReview.salesClarityScore}/25 · CTA ${qualityReview.ctaScore}/25`
                              : "No review stored yet. Run the template quality agent to score this variant."}
                          </p>
                          {qualityReview?.riskFlags.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {qualityReview.riskFlags.map((flag) => (
                                <Badge key={`${variant.id}-${flag.code}`} variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                                  {formatLabel(flag.code)}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          {qualityReview?.recommendations.length ? (
                            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                              {qualityReview.recommendations.map((recommendation) => (
                                <p key={`${variant.id}-${recommendation}`}>- {recommendation}</p>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        {showActions ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleApprove(variant.id)} disabled={!approvalId || approvalDecisionMutation.isPending}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestChanges(variant.id, subject, body, `${template.name} / ${variant.variantLabel || "A"}`)}
                              disabled={(approvalDecisionMutation.isPending || createRequestMutation.isPending) || (!approvalId && !user?.email)}
                            >
                              Request Changes
                            </Button>
                          </div>
                        ) : variant.approvalStatus === "approved" ? (
                          <p className="mt-4 text-sm text-muted-foreground">Approved. No further action is needed on this variant.</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {data.outreachTemplates.length === 0 ? (
              <EmptyState title="No templates available yet" description="Prepared outreach templates will appear here once the first campaign draft is ready." />
            ) : null}
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Rendered email preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Prepared only — not sent yet. Sending is paused until mailbox setup and launch approval are complete.
              </p>
            </div>
            <Mail className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 space-y-3">
            {data.outreachQueue.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedQueueItemId(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedQueueItemId === item.id ? "border-primary bg-primary/5 shadow-sm" : "border-border/70 bg-background hover:bg-muted/15"
                }`}
              >
                <p className="font-medium">{item.rawCompanyName || item.leadCompanyName || "Prepared outreach"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.campaignName || "No campaign linked"}</p>
                <p className="mt-2 text-xs text-muted-foreground">{item.variantLabel ? `Variant ${item.variantLabel}` : "Variant pending"} · Waiting for mailbox</p>
                {item.latestQualityReview ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Quality {item.latestQualityReview.score}/100 · {formatLabel(item.latestQualityReview.status)}
                  </p>
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-border/70 bg-background p-5">
            {renderPreviewQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : renderPreviewQuery.data?.preview ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Prepared</Badge>
                  <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">Waiting for mailbox</Badge>
                  {selectedQueueItem?.latestQualityReview ? (
                    <Badge variant="outline" className={qualityBadgeClassName(selectedQueueItem.latestQualityReview.status)}>
                      Quality {selectedQueueItem.latestQualityReview.score}/100
                    </Badge>
                  ) : null}
                </div>
                <Meta label="Recipient / company" value={`${renderPreviewQuery.data.preview.recipientName || "Recipient"}${renderPreviewQuery.data.preview.companyName ? ` · ${renderPreviewQuery.data.preview.companyName}` : ""}`} />
                <Meta label="Subject" value={renderPreviewQuery.data.preview.subject || "No subject rendered"} />
                <Meta label="Campaign" value={selectedQueueItem?.campaignName || "No campaign linked"} />
                <Meta label="Template variant" value={renderPreviewQuery.data.preview.template.variantLabel || "Variant pending"} />
                {selectedQueueItem?.latestQualityReview?.recommendations.length ? (
                  <Meta
                    label="Quality recommendations"
                    value={selectedQueueItem.latestQualityReview.recommendations.join(" | ")}
                  />
                ) : null}
                <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Full body preview</p>
                  <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">{renderPreviewQuery.data.preview.body || "No body rendered"}</pre>
                </div>
                {renderPreviewQuery.data.preview.missingPlaceholders.length ? (
                  <p className="text-sm text-destructive">Missing placeholders: {renderPreviewQuery.data.preview.missingPlaceholders.join(", ")}</p>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No preview selected" description="Choose a prepared outreach item to view the latest email preview." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TemplatesLoadingState() {
  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <Skeleton className="h-40 rounded-[28px]" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[760px]" />
        <Skeleton className="h-[760px]" />
      </div>
    </div>
  );
}

function Message({ tone, children }: { tone: "success" | "error"; children: string }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${
      tone === "success"
        ? "border-success/30 bg-success/10 text-success"
        : "border-destructive/30 bg-destructive/10 text-destructive"
    }`}
    >
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function buildChangeRequestNote(subject: string, body: string) {
  return `Requested template updates:\n\nSubject:\n${subject || "(no subject)"}\n\nBody:\n${body || "(no body)"}`;
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

function qualityBadgeClassName(status: string) {
  if (status === "approved") return "border-success/30 bg-success/10 text-success";
  if (status === "improve_before_send") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-warning/30 bg-warning/10 text-warning-foreground";
}
