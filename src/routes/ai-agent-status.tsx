import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Gauge,
  RefreshCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/app-state";
import { useAiHealthQuery } from "@/lib/ai-health-api-hooks";

export const Route = createFileRoute("/ai-agent-status")({
  head: () => ({ meta: [{ title: "AI Agent Status — Expert Technology Solutions" }] }),
  component: AiAgentStatusPage,
});

// Internal-only page: this must never render provider/model/budget/cap
// internals for client-side roles, and the guard here is what protects
// against a client user opening the URL directly - the sidebar link being
// hidden (app-shell.tsx) is not sufficient on its own.
function AiAgentStatusPage() {
  const { isInternalAdmin } = useApp();
  const navigate = useNavigate();
  // Hook is always called (rules of hooks) - the query itself refuses to
  // fetch for non-admins (see useAiHealthQuery's own isInternalAdmin gate),
  // so no internal data is ever requested or cached for a client user even
  // if this component briefly renders before the redirect below fires.
  const healthQuery = useAiHealthQuery();

  useEffect(() => {
    if (!isInternalAdmin) {
      navigate({ to: "/leads", replace: true });
    }
  }, [isInternalAdmin, navigate]);

  if (!isInternalAdmin) {
    return (
      <Card className="max-w-[1400px] mx-auto p-10 text-center shadow-card">
        <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is only available to Intergrai admins. Redirecting you to Leads...
        </p>
      </Card>
    );
  }

  if (healthQuery.isLoading) {
    return <StatusLoadingState />;
  }

  if (healthQuery.isError || !healthQuery.data) {
    return (
      <Card className="max-w-[1400px] mx-auto p-10 text-center shadow-card">
        <h1 className="text-2xl font-semibold">AI agent status unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(healthQuery.error as Error | undefined)?.message ||
            "We couldn't reach the AI health endpoint right now."}
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => healthQuery.refetch()} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Try again
          </Button>
        </div>
      </Card>
    );
  }

  const health = healthQuery.data;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live health of the AI reasoning providers behind discovery, qualification, and
            sequencing
          </p>
        </div>
        <Button onClick={() => healthQuery.refetch()} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </header>

      {health.ai_blocker ? (
        <Card className="p-4 border-destructive/40 bg-destructive/5 shadow-card">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                AI decisions are currently blocked
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{health.ai_blocker}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ProviderCard
          name="Ollama"
          subtitle="Primary reasoning provider - free/local, tried first for every AI decision"
          configured={health.ollama.configured}
          detail={health.ollama.model ? `Model: ${health.ollama.model}` : "No model configured"}
          badge={health.ollama.is_bulk_provider ? "Active bulk provider" : undefined}
        />
        <ProviderCard
          name="MiniMax"
          subtitle="Fallback only - called when Ollama is unavailable, blocked, or below the confidence floor"
          configured={health.minimax.configured}
          detail={
            health.minimax.configured
              ? `Model: ${health.minimax.model}`
              : "Not configured - Ollama-only right now"
          }
        />
      </div>

      <Card className="p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">AI budget</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BudgetStat label="Daily call cap" value={health.budget.daily_call_cap} />
          <BudgetStat label="Cycle call cap" value={health.budget.cycle_call_cap} />
          <BudgetStat
            label="Cycle priority reserve"
            value={health.budget.cycle_priority_reserved_calls}
            note={
              health.budget.cycle_priority_reserved_calls === null
                ? "Not available on this deployment yet"
                : undefined
            }
          />
          <BudgetStat label="Decisions today" value={health.budget.decisions_today} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <DecisionCard
          icon={CheckCircle2}
          tone="success"
          title="Last successful AI decision"
          empty="No successful AI decision recorded yet."
          content={
            health.last_successful_decision ? (
              <>
                <p className="text-sm font-medium">{health.last_successful_decision.task}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {health.last_successful_decision.provider} ·{" "}
                  {health.last_successful_decision.model} · decision:{" "}
                  {health.last_successful_decision.decision}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(health.last_successful_decision.at), {
                    addSuffix: true,
                  })}
                </p>
              </>
            ) : null
          }
        />
        <DecisionCard
          icon={XCircle}
          tone="destructive"
          title="Last failed AI decision"
          empty="No failed AI decision recorded."
          content={
            health.last_failed_decision ? (
              <>
                <p className="text-sm font-medium">{health.last_failed_decision.task}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {health.last_failed_decision.deterministic_fallback
                    ? "Deterministic fallback"
                    : health.last_failed_decision.blocked_reason || "Blocked"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(health.last_failed_decision.at), {
                    addSuffix: true,
                  })}
                </p>
              </>
            ) : null
          }
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Last checked {formatDistanceToNow(new Date(health.checked_at), { addSuffix: true })}
      </p>
    </div>
  );
}

function ProviderCard({
  name,
  subtitle,
  configured,
  detail,
  badge,
}: {
  name: string;
  subtitle: string;
  configured: boolean;
  detail: string;
  badge?: string;
}) {
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg ${configured ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}
          >
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">{subtitle}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            configured
              ? "bg-success/15 text-success border-success/30"
              : "bg-muted text-muted-foreground"
          }
        >
          {configured ? "Configured" : "Not configured"}
        </Badge>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-sm">{detail}</div>
      {badge ? (
        <Badge variant="outline" className="mt-3 bg-primary/15 text-primary border-primary/30">
          {badge}
        </Badge>
      ) : null}
    </Card>
  );
}

function BudgetStat({
  label,
  value,
  note,
}: {
  label: string;
  value: number | null;
  note?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">
        {value === null ? "—" : value.toLocaleString()}
      </p>
      {note ? <p className="mt-1 text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function DecisionCard({
  icon: Icon,
  tone,
  title,
  empty,
  content,
}: {
  icon: typeof CheckCircle2;
  tone: "success" | "destructive";
  title: string;
  empty: string;
  content: React.ReactNode;
}) {
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${tone === "success" ? "text-success" : "text-destructive"}`} />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {content || <p className="text-sm text-muted-foreground">{empty}</p>}
    </Card>
  );
}

function StatusLoadingState() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-36" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    </div>
  );
}
