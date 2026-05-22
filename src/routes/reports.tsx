import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useReportsQuery } from "@/lib/leads-api-hooks";
import { normalizeReport } from "@/lib/leads-api";
import { ClientReadyPlaceholder, PlaceholderAction } from "@/components/client-ready-placeholder";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Expert Technology Solutions" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const reportsQuery = useReportsQuery();

  if (reportsQuery.isLoading) {
    return <ReportsLoadingState />;
  }

  if (reportsQuery.isError || !reportsQuery.data) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <Card className="p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Reports unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn’t load live reporting data from Intergrai right now.
          </p>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => reportsQuery.refetch()} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" /> Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const reports = reportsQuery.data.reports.map(normalizeReport);

  if (reports.length === 0) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <header>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live reporting will appear here as soon as Intergrai publishes the first client-ready report set.
          </p>
        </header>
        <ClientReadyPlaceholder
          icon={FileBarChart}
          eyebrow="Reports Onboarding"
          title="No live reports are available yet"
          description="The reporting endpoint is connected, but it is not returning any published report records for Expert Technology Solutions yet."
          note="Until reporting is enabled, use the Dashboard, Leads, and Campaigns pages for live operational visibility."
          action={
            <>
              <Button onClick={() => reportsQuery.refetch()} variant="outline">
                <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <PlaceholderAction href="https://experttechnologysolutions.intergrai.co.za" variant="outline">
                Open live portal
              </PlaceholderAction>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {reports.length} published report{reports.length === 1 ? "" : "s"} from the Intergrai reporting endpoint
          </p>
        </div>
        <Button onClick={() => reportsQuery.refetch()} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id} className="p-6 shadow-card">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Live report</p>
            <h2 className="mt-3 text-xl font-semibold">{report.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{report.summary}</p>
            <p className="mt-6 text-xs text-muted-foreground">
              {report.createdAt
                ? `Published ${formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}`
                : "Publish date unavailable"}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportsLoadingState() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
