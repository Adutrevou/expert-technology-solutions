import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Bot, RefreshCcw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyCard,
  formatPortalDate,
  PageIntro,
  SectionCard,
  StatCard,
  StatusMessage,
} from "@/components/client-portal";
import { useCreateMissionMutation, useLeadAgentSummaryQuery } from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/lead-agent")({
  head: () => ({ meta: [{ title: "Expert Lead Agent — Expert Technology Solutions" }] }),
  component: LeadAgentPage,
});

const PIPELINE_STAGES = [
  { label: "Found", key: "Found", note: "Prospects identified for review." },
  { label: "Qualified", key: "Qualified", note: "Prospects that fit your target profile." },
  { label: "Prepared", key: "Prepared", note: "Outreach drafted and ready for approval." },
  { label: "Contacted", key: "Contacted", note: "Will remain at zero until launch." },
  { label: "Interested", key: "Interested", note: "Positive replies and interest signals." },
  {
    label: "Meetings / Quotes",
    key: "Meetings / Quotes",
    note: "Hand-raisers ready for follow-up.",
  },
] as const;

const PROMPT_SUGGESTIONS = [
  "Prioritise Managed IT opportunities this week",
  "Show me where approvals are blocking progress",
  "Find more leads similar to recent qualified companies",
] as const;

function LeadAgentPage() {
  const summaryQuery = useLeadAgentSummaryQuery();
  const createMissionMutation = useCreateMissionMutation();
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = summaryQuery.data;
  const pipeline = useMemo(() => {
    const counts = new Map(
      (data?.leadPipelineCounts || []).map((item) => [item.stage.toLowerCase(), item.count]),
    );
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: counts.get(stage.key.toLowerCase()) ?? fallbackPipelineCount(stage.key, data),
    }));
  }, [data]);

  const recentActivity = useMemo(() => {
    if (!data) return [];
    return [
      ...data.activeMissions.map((mission) => ({
        id: `mission-${mission.id}`,
        title: mission.title,
        detail: mission.instruction || "Instruction added",
        date: mission.updatedAt || mission.createdAt,
      })),
      ...data.openRequests.map((request) => ({
        id: `request-${request.id}`,
        title: request.title || "Open request",
        detail: request.latestReply || request.message || "Request recorded",
        date: request.latestReplyAt || request.createdAt,
      })),
    ]
      .sort(
        (left, right) =>
          (new Date(right.date || 0).getTime() || 0) - (new Date(left.date || 0).getTime() || 0),
      )
      .slice(0, 5);
  }, [data]);

  const nextAction = data?.anyCampaignReady
    ? data.currentCampaignFocus
      ? `Keep ${data.currentCampaignFocus} topped up while one-by-one outreach continues.`
      : data.sendingEnabled
        ? "At least one campaign is ready. Run a dry-run send batch before any live outreach."
        : "At least one campaign is ready. Keep sending paused until launch is explicitly enabled."
    : data?.approvalsWaiting
      ? "Review campaign, template, and follow-up approvals before launch."
      : data?.mailboxConnected
        ? "Template approvals are clear. Keep sending paused until launch is explicitly approved."
        : "Connect mailbox reply sync and finish approvals before launch.";

  const currentStatus = data?.agent?.status ? formatFriendlyLabel(data.agent.status) : "Ready";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const instruction = prompt.trim();
    if (!instruction) {
      setError("Enter a short instruction for Expert Lead Agent.");
      return;
    }

    setError(null);
    setNotice(null);

    try {
      const mission = await createMissionMutation.mutateAsync({
        title: buildMissionTitle(instruction),
        instruction,
        assigned_worker_type: "lead_generation_agent",
      });
      setPrompt("");
      setNotice(`Instruction saved: ${mission.title}`);
      await summaryQuery.refetch();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Unable to save that instruction.",
      );
    }
  }

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <LeadAgentLoadingState />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <Card className="rounded-[28px] p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Expert Lead Agent unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn’t load the current agent workspace.
          </p>
          <div className="mt-6">
            <Button variant="outline" onClick={() => summaryQuery.refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageIntro
        badge="Expert Lead Agent"
        title={
          data.anyCampaignReady
            ? "A campaign is ready for launch"
            : "Expert Lead Agent is waiting for approval"
        }
        description={
          data.anyCampaignReady
            ? "Pipeline work is active and at least one campaign has the approvals needed for launch. Sending still stays off until it is explicitly enabled."
            : "Pipeline work is active, outreach is prepared, and sending remains safely paused until launch approval."
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/approvals">Review Approvals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/templates">View Templates</Link>
            </Button>
            <Button asChild>
              <Link to="/conversations">View Conversations</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current status"
          value={currentStatus}
          detail="Lead sourcing and qualification are active."
        />
        <StatCard
          label="New leads today"
          value={data.newLeadsSourcedToday}
          detail="Real campaign-sourced companies added today."
        />
        <StatCard
          label="Ready campaigns"
          value={data.campaignsReadyToLaunchCount}
          detail="These campaigns can launch once sending is explicitly enabled."
        />
        <StatCard
          label="Needs approval"
          value={data.approvalsWaiting}
          detail="Approvals page remains the central decision hub."
        />
        <StatCard
          label="Replies waiting"
          value={data.repliesWaitingApproval}
          detail="Approval-gated reply drafts waiting for review."
        />
        <StatCard
          label="Safety"
          value={data.sendingEnabled ? "Active" : "Paused"}
          detail="No auto-replies. No send actions exposed here."
        />
      </div>

      <SectionCard
        title="Pipeline overview"
        description="A simple six-stage view of where the system is working now."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {pipeline.map((stage) => (
            <div
              key={stage.label}
              className="flex h-full flex-col justify-between rounded-[22px] border border-border/70 bg-background px-4 py-4"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {stage.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tabular-nums">{stage.count}</p>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{stage.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Next action"
          description="One clear next step, based on the current workspace state."
        >
          <div className="rounded-[24px] border border-primary/15 bg-primary/5 px-5 py-5">
            <p className="text-lg font-medium">{nextAction}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Mailbox connected: {data.mailboxConnected ? "Yes" : "No"} · Sending enabled:{" "}
              {data.sendingEnabled ? "Yes" : "No"}
            </p>
            {data.currentCampaignFocus ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Current campaign focus: {data.currentCampaignFocus}
              </p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent activity"
          description="The latest visible work from the agent and open requests."
        >
          {recentActivity.length ? (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-border/70 bg-background px-4 py-4"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatPortalDate(item.date)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard
              title="No recent activity yet"
              description="New missions, open requests, and visible changes will appear here."
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Guide the agent"
        description="Instructions submitted here create tasks for the agent. They do not automatically send outreach unless converted into an approved campaign or approved lead instruction."
        action={
          <Button variant="outline" onClick={() => summaryQuery.refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      >
        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-border/70 bg-background p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="h-12 rounded-2xl"
              placeholder="Example: Create a task to focus this week on Managed IT companies in Johannesburg"
            />
            <Button
              type="submit"
              disabled={createMissionMutation.isPending}
              className="h-12 rounded-2xl px-6"
            >
              <Send className="mr-2 h-4 w-4" />
              {createMissionMutation.isPending ? "Saving..." : "Save instruction"}
            </Button>
          </div>
          {notice ? (
            <div className="mt-4">
              <StatusMessage tone="success">{notice}</StatusMessage>
            </div>
          ) : null}
          {error ? (
            <div className="mt-4">
              <StatusMessage tone="error">{error}</StatusMessage>
            </div>
          ) : null}
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setPrompt(suggestion)}
              className="rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-foreground transition hover:bg-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="rounded-[24px] border border-border/70 bg-card/80 px-5 py-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Bot className="h-4 w-4 text-primary" />
          What this page is for
        </div>
        <p className="mt-2">
          This page is a calm operational overview. Decisions still belong on the Approvals page,
          and template editing still belongs on the Templates page. Outreach uses approved campaigns
          and approved templates only.
        </p>
      </div>
    </div>
  );
}

function LeadAgentLoadingState() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <Skeleton className="h-44 rounded-[32px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-[280px] rounded-[28px]" />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Skeleton className="h-[240px] rounded-[28px]" />
        <Skeleton className="h-[240px] rounded-[28px]" />
      </div>
      <Skeleton className="h-[220px] rounded-[28px]" />
    </div>
  );
}

function fallbackPipelineCount(
  stage: string,
  data?: NonNullable<ReturnType<typeof useLeadAgentSummaryQuery>["data"]>,
) {
  if (!data) return 0;
  switch (stage) {
    case "Found":
      return data.clientFacingCounts.totalLeadsFound;
    case "Qualified":
      return data.clientFacingCounts.qualifiedLeads;
    case "Prepared":
      return data.clientFacingCounts.outreachPrepared;
    case "Contacted":
      return data.clientFacingCounts.emailsSent;
    case "Interested":
      return data.clientFacingCounts.positiveReplies;
    case "Meetings / Quotes":
      return data.clientFacingCounts.meetingsQuoteRequests;
    default:
      return 0;
  }
}

function buildMissionTitle(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57)}...`;
}

function formatFriendlyLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
