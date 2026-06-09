import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Bot, RefreshCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIntro, SectionCard, StatCard, StatusMessage } from "@/components/client-portal";
import { useCreateMissionMutation, useLeadAgentSummaryQuery } from "@/lib/leads-api-hooks";

export const Route = createFileRoute("/lead-agent")({
  head: () => ({ meta: [{ title: "Expert Lead Agent — Expert Technology Solutions" }] }),
  component: LeadAgentPage,
});

const PIPELINE_STAGES = [
  { label: "Found", key: "Found", note: "Prospects identified for review." },
  { label: "Qualified", key: "Qualified", note: "Prospects that fit your target profile." },
  { label: "Prepared", key: "Prepared", note: "Outreach drafted and ready for approval." },
  { label: "Contacted", key: "Contacted", note: "Increases as one-by-one sends go out." },
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

  const currentStatus = data?.expertLeadAgentStateLabel || (data?.agent?.status ? formatFriendlyLabel(data.agent.status) : "Ready");

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
            : "Expert Lead Agent is active"
        }
        description={
          data.anyCampaignReady
            ? "Pipeline work is active and at least one campaign has the approvals needed for launch. Sending continues one-by-one whenever the live send gate passes and caps remain available."
            : "Pipeline work is active. Approvals, templates, and outreach readiness are tracked here without blocking access to the workspace."
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
          label="Outreach status"
          value={currentStatus}
          detail="Lead sourcing, verification, and sending stay within the approved safety limits."
        />
        <StatCard
          label="All Leads"
          value={data.clientFacingCounts.totalLeadsFound}
          detail="Companies and contact opportunities found by the agent."
        />
        <StatCard
          label="Enrichment Queue"
          value={data.clientFacingCounts.enrichmentQueue}
          detail="Leads still missing a usable email."
        />
        <StatCard
          label="Outreach Ready"
          value={data.clientFacingCounts.outreachReady}
          detail="Leads ready for safe first outreach."
        />
        <StatCard
          label="Emails Sent Today"
          value={data.clientFacingCounts.emailsSentToday}
          detail="Messages sent today under the approved caps."
        />
        <StatCard
          label="Replies Received"
          value={data.clientFacingCounts.repliesReceived}
          detail="Inbound replies captured across live conversations."
        />
        <StatCard
          label="Blocked/Avoided Count"
          value={data.clientFacingCounts.blockedAvoided}
          detail="Duplicates, competitors, bad-fit, and unsafe rows suppressed."
        />
        <StatCard
          label="Approvals waiting"
          value={data.approvalsWaiting}
          detail="Client-actionable approvals still open."
        />
        <StatCard
          label="Sending status"
          value={data.sendingEnabled ? "Enabled" : "Paused"}
          detail="24/7 sending is allowed when mailbox readiness and caps permit it."
        />
        <StatCard
          label="Caps"
          value={`${data.mailboxSentToday}/50 today`}
          detail={`${data.mailboxSentThisMonth}/2000 this month`}
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
          Simple operating view
        </div>
        <p className="mt-2">
          Decisions still belong on the Approvals page, and template editing still belongs on the Templates page. Outreach uses approved campaigns and approved templates only.
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
