import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaignsQuery } from "@/lib/leads-api-hooks";
import { normalizeCampaign } from "@/lib/leads-api";
import { ApprovalStatusBadge, CampaignStatusBadge } from "@/components/status-badges";
import type { CampaignStatus } from "@/lib/demo-data";
import { RefreshCcw, Megaphone, Clock3, CheckCircle2, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Expert Technology Solutions" }] }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const campaignsQuery = useCampaignsQuery();

  if (campaignsQuery.isLoading) {
    return <CampaignsLoadingState />;
  }

  if (campaignsQuery.isError || !campaignsQuery.data) {
    return (
      <Card className="max-w-[1400px] mx-auto p-10 text-center shadow-card">
        <h1 className="text-2xl font-semibold">Campaigns unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn’t load live campaign data from Intergrai right now.</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => campaignsQuery.refetch()} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Try again
          </Button>
        </div>
      </Card>
    );
  }

  const campaigns = campaignsQuery.data.campaigns.map(normalizeCampaign);
  const activeCount = campaigns.filter((campaign) => campaign.status === "active").length;
  const draftCount = campaigns.filter((campaign) => campaign.status === "draft").length;
  const pendingCount = campaigns.filter((campaign) => campaign.approvalStatus === "pending").length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {campaigns.length} campaigns synced from the Intergrai Leads API
          </p>
        </div>
        <Button onClick={() => campaignsQuery.refetch()} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Megaphone} label="Total campaigns" value={campaigns.length} />
        <SummaryCard icon={CheckCircle2} label="Active" value={activeCount} />
        <SummaryCard icon={FileText} label="Draft" value={draftCount} />
        <SummaryCard icon={Clock3} label="Pending approval" value={pendingCount} />
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-10 text-center shadow-card">
          <h2 className="text-xl font-semibold">No campaigns available</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The API is connected, but there are no campaign records for this client yet.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{campaign.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {campaign.targetNiche} · {campaign.targetLocation}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <CampaignStatusBadge status={campaign.status as CampaignStatus} />
                  {campaign.approvalStatus !== "none" ? <ApprovalStatusBadge status={campaign.approvalStatus} /> : null}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Objective</p>
                <p className="mt-2 text-sm">{campaign.objective}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoBlock label="Created" value={campaign.createdAt ? formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true }) : "Unknown"} />
                <InfoBlock label="Last updated" value={campaign.updatedAt ? formatDistanceToNow(new Date(campaign.updatedAt), { addSuffix: true }) : "Unknown"} />
                <InfoBlock label="Target niche" value={campaign.targetNiche} />
                <InfoBlock label="Target location" value={campaign.targetLocation} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignsLoadingState() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-72" />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}
