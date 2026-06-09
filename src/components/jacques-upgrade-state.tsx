import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Mail, RefreshCcw, Sparkles, Wifi, ShieldCheck } from "lucide-react";
import { useDashboardQuery, useLeadAgentSummaryQuery } from "@/lib/leads-api-hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTile, SafetyBanner, StatCard } from "@/components/client-portal";
import { EXPERT_JACQUES_UPGRADE_END_AT } from "@/lib/expert-upgrade";

export function JacquesUpgradeState() {
  const dashboardQuery = useDashboardQuery();
  const summaryQuery = useLeadAgentSummaryQuery();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const targetAt = useMemo(() => new Date(EXPERT_JACQUES_UPGRADE_END_AT).getTime(), []);
  const remainingMs = Math.max(0, targetAt - now);
  const isComplete = remainingMs === 0;
  const countdownLabel = formatCountdown(remainingMs);

  const summary = summaryQuery.data;
  const leadsFoundToday = summary?.newLeadsSourcedToday ?? null;
  const emailsSentToday = summary?.mailboxSentToday ?? null;
  const outreachActive = Boolean(summary?.sendingEnabled || summary?.sendReady || summary?.mailboxConnected);
  const leadSourceLabel = summaryQuery.isLoading ? "Loading today's count" : leadsFoundToday === null ? "Not available" : leadsFoundToday.toLocaleString();
  const sentSourceLabel = summaryQuery.isLoading ? "Loading today's sends" : emailsSentToday === null ? "Not available" : emailsSentToday.toLocaleString();
  const outreachStatusLabel = summaryQuery.isLoading
    ? "Checking"
    : outreachActive
      ? "Active in background"
      : "Standing by";
  const latestCycleLabel =
    summary?.agent?.lastHeartbeatAt ||
    summary?.mailboxLastHealthCheckAt ||
    null;
  const hasWarnings = dashboardQuery.isError || summaryQuery.isError;

  if (dashboardQuery.isLoading || summaryQuery.isLoading) {
    return <JacquesUpgradeSkeleton />;
  }

  return (
    <div className="relative mx-auto max-w-[1240px]">
      <div className="absolute inset-x-10 top-0 h-48 rounded-full bg-gradient-to-r from-primary/20 via-cyan-200/15 to-emerald-200/15 blur-3xl" />
      <Card className="relative overflow-hidden rounded-[34px] border-primary/15 bg-card/95 shadow-[0_24px_90px_rgba(15,23,42,0.14)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(23,138,142,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_30%)]" />
        <div className="relative grid gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-8 lg:py-8">
          <div className="space-y-5">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Temporary client view
            </Badge>
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-muted-foreground">Expert Lead Agent is being upgraded</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Agent is being upgraded. Emails and outreach will still continue in the background.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                Outreach remains active while the lead workspace is refreshed. Your live totals stay visible here, and the full portal view returns at 13:00 South Africa time.
              </p>
            </div>

            <SafetyBanner>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Outreach is still active
                </span>
                <span className="text-muted-foreground">Emails continue within approved limits.</span>
              </div>
            </SafetyBanner>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoTile
                label="Leads found today"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-lg font-semibold tabular-nums">{leadSourceLabel}</span>
                  </span>
                }
              />
              <InfoTile
                label="Emails sent today"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="text-lg font-semibold tabular-nums">{sentSourceLabel}</span>
                  </span>
                }
              />
              <InfoTile
                label="Outreach status"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-primary" />
                    <span className="font-medium">{outreachStatusLabel}</span>
                  </span>
                }
              />
              <InfoTile
                label="Latest cycle"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{latestCycleLabel ? formatSouthAfricaMoment(latestCycleLabel) : "Not available"}</span>
                  </span>
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void Promise.allSettled([dashboardQuery.refetch(), summaryQuery.refetch()])}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh live metrics
              </Button>
              <p className="text-sm text-muted-foreground">
                The full view will be back at 13:00 South Africa time.
              </p>
            </div>

            {hasWarnings ? (
              <div className="rounded-[22px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
                Live metrics are still syncing in the background. Outreach continues unaffected.
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <Card className="rounded-[28px] border-border/70 bg-background/90 p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Countdown</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {isComplete ? "Finalising update..." : "Back in the full portal soon"}
                  </h2>
                </div>
                <Badge variant={isComplete ? "secondary" : "default"} className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isComplete ? "Almost there" : "Live"}
                </Badge>
              </div>

              <div className="mt-5 rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-cyan-500/5 px-4 py-5 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Time remaining</p>
                <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">{isComplete ? "00:00:00" : countdownLabel}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {isComplete
                    ? "Finalising update..."
                    : "System will be fully back at 13:00 South Africa time."}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="Outreach still active"
                  value={outreachActive ? "Yes" : "Standing by"}
                  detail="One-by-one sending continues in the background."
                />
                <StatCard
                  label="Client view"
                  value="Upgrading"
                  detail="Jacques-only temporary view."
                />
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}

function JacquesUpgradeSkeleton() {
  return (
    <div className="mx-auto max-w-[1240px]">
      <Skeleton className="h-[560px] rounded-[34px]" />
    </div>
  );
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatSouthAfricaMoment(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}
