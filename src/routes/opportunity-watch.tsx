import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  ExternalLink,
  FileText,
  Radar,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIntro, SafetyBanner, StatCard } from "@/components/client-portal";
import { useApp } from "@/lib/app-state";
import { getOpportunityWatch, type PublicOpportunityRecord } from "@/lib/leads-api";

export const Route = createFileRoute("/opportunity-watch")({
  head: () => ({ meta: [{ title: "Opportunity Watch — Expert Technology Solutions" }] }),
  component: OpportunityWatchPage,
});

const SERVICE_FILTERS = [
  { value: "all", label: "All services" },
  { value: "cctv_security", label: "CCTV & Security" },
  { value: "managed_it", label: "Managed IT" },
  { value: "copiers_print", label: "Copiers & Managed Print" },
] as const;
const EMPTY_OPPORTUNITIES: PublicOpportunityRecord[] = [];

function OpportunityWatchPage() {
  const { isAuthenticated } = useApp();
  const [search, setSearch] = useState("");
  const [service, setService] = useState("all");
  const [province, setProvince] = useState("all");
  const [deadline, setDeadline] = useState("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const feedQuery = useQuery({
    queryKey: ["intergrai", "opportunity-watch"],
    queryFn: getOpportunityWatch,
    enabled: typeof window !== "undefined" && isAuthenticated,
    retry: 1,
    staleTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
  });

  const opportunities = feedQuery.data?.opportunities ?? EMPTY_OPPORTUNITIES;
  const provinces = useMemo(
    () => Array.from(new Set(opportunities.map((item) => item.province).filter(Boolean))).sort(),
    [opportunities],
  );
  const filtered = useMemo(
    () =>
      opportunities.filter((item) => {
        const matchesSearch =
          !deferredSearch ||
          [item.title, item.description, item.buyer, item.tender_number, item.delivery_location]
            .join(" ")
            .toLowerCase()
            .includes(deferredSearch);
        const matchesService =
          service === "all" || item.services.some((entry) => entry.key === service);
        const matchesProvince = province === "all" || item.province === province;
        const matchesDeadline =
          deadline === "all" ||
          (deadline === "7" &&
            item.days_remaining !== null &&
            item.days_remaining !== undefined &&
            item.days_remaining <= 7) ||
          (deadline === "14" &&
            item.days_remaining !== null &&
            item.days_remaining !== undefined &&
            item.days_remaining <= 14);
        return matchesSearch && matchesService && matchesProvince && matchesDeadline;
      }),
    [deadline, deferredSearch, opportunities, province, service],
  );

  const urgentCount = opportunities.filter(
    (item) =>
      item.days_remaining !== null && item.days_remaining !== undefined && item.days_remaining <= 7,
  ).length;
  const gautengCount = opportunities.filter(
    (item) => item.province.toLowerCase() === "gauteng",
  ).length;

  if (feedQuery.isLoading && !feedQuery.data) return <OpportunityWatchLoading />;

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageIntro
        badge="Free public opportunity feed"
        title="See organisations already asking for Expert's services"
        description="Live public tenders and RFQs for CCTV, managed IT, copiers, and managed print. Review the official requirements before deciding whether to respond."
        actions={
          <Button
            variant="outline"
            onClick={() => feedQuery.refetch()}
            disabled={feedQuery.isFetching}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${feedQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh feed
          </Button>
        }
      />

      <SafetyBanner>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">View-only and POPIA-safe by design</p>
            <p className="mt-1 text-muted-foreground">
              This page uses public procurement notices and no paid search credits. Nothing here is
              automatically added to a campaign, sequence, or email list.
            </p>
          </div>
        </div>
      </SafetyBanner>

      {feedQuery.isError ? (
        <Card className="rounded-[24px] border-destructive/20 bg-destructive/5 p-6">
          <p className="font-medium text-destructive">
            The public opportunity feed could not be reached.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your existing campaigns and sequences are unaffected. Try refreshing this page shortly.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Matching opportunities"
          value={opportunities.length}
          detail={`From ${feedQuery.data?.scanned_count || 0} recent public notices`}
        />
        <StatCard
          label="Closing within 7 days"
          value={urgentCount}
          detail="Prioritise eligibility checks"
        />
        <StatCard
          label="Gauteng opportunities"
          value={gautengCount}
          detail="Johannesburg and Pretoria focus"
        />
        <StatCard label="Credit cost" value="R0" detail="No Apollo, Brave, or AI credits" />
      </div>

      <Card className="rounded-[28px] border-border/70 p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="min-w-0 flex-1">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Search opportunities
            </span>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search buyer, tender number, or requirement"
                className="h-11 pl-10"
              />
            </div>
          </label>
          <FilterSelect
            label="Service"
            value={service}
            onChange={setService}
            options={SERVICE_FILTERS}
          />
          <FilterSelect
            label="Province"
            value={province}
            onChange={setProvince}
            options={[
              { value: "all", label: "All provinces" },
              ...provinces.map((value) => ({ value, label: value })),
            ]}
          />
          <FilterSelect
            label="Deadline"
            value={deadline}
            onChange={setDeadline}
            options={[
              { value: "all", label: "Any closing date" },
              { value: "7", label: "Next 7 days" },
              { value: "14", label: "Next 14 days" },
            ]}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4 text-sm text-muted-foreground">
          <span>
            Showing {filtered.length} of {opportunities.length} relevant notices
          </span>
          <span>Updated {formatDateTime(feedQuery.data?.fetched_at)}</span>
        </div>
      </Card>

      {filtered.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      ) : (
        <Card className="rounded-[28px] border-dashed p-10 text-center">
          <Radar className="mx-auto h-9 w-9 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No opportunities match these filters</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Clear a filter or refresh later as new public notices are published.
          </p>
        </Card>
      )}

      <Card className="overflow-hidden rounded-[28px] border-border/70 shadow-card">
        <div className="border-b border-border/70 bg-muted/20 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-semibold">Public sources being watched</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            National Treasury is connected automatically. The other official portals remain
            one-click checks while we validate stable public feeds.
          </p>
        </div>
        <div className="grid gap-px bg-border/60 md:grid-cols-2 xl:grid-cols-4">
          {(feedQuery.data?.sources || []).map((source) => (
            <a
              key={source.key}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="group bg-card p-5 transition-colors hover:bg-muted/25"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{source.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{source.coverage}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <Badge variant="outline" className="mt-4">
                {source.automated ? "Live feed" : "Official portal"}
              </Badge>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: PublicOpportunityRecord }) {
  const primaryDocument = opportunity.documents[0];
  return (
    <Card className="flex h-full flex-col rounded-[28px] border-border/70 p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {opportunity.services.map((service) => (
            <Badge key={service.key} variant="secondary">
              {service.label}
            </Badge>
          ))}
        </div>
        <DeadlineBadge opportunity={opportunity} />
      </div>
      <h2 className="mt-4 text-xl font-semibold leading-snug">{opportunity.title}</h2>
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 shrink-0" />
        <span>{opportunity.buyer}</span>
      </div>
      <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
        {opportunity.description || "Open the official notice to review the full requirement."}
      </p>
      <div className="mt-5 grid gap-3 rounded-[20px] border border-border/60 bg-muted/15 p-4 sm:grid-cols-2">
        <MetaItem label="Province" value={opportunity.province || "Not stated"} />
        <MetaItem label="Tender number" value={opportunity.tender_number || "Not stated"} />
        <MetaItem label="Closes" value={formatDate(opportunity.closes_at)} />
        <MetaItem label="Method" value={opportunity.procurement_method || "Public notice"} />
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
        {primaryDocument ? (
          <Button asChild className="sm:flex-1">
            <a href={primaryDocument.url} target="_blank" rel="noreferrer">
              <FileText className="mr-2 h-4 w-4" /> Open tender document
            </a>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="sm:flex-1">
          <a href={opportunity.source_url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> View official record
          </a>
        </Button>
      </div>
    </Card>
  );
}

function DeadlineBadge({ opportunity }: { opportunity: PublicOpportunityRecord }) {
  const days = opportunity.days_remaining;
  const className =
    opportunity.urgency === "urgent"
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : opportunity.urgency === "soon"
        ? "border-warning/30 bg-warning/10 text-warning-foreground"
        : "border-success/20 bg-success/10 text-success";
  return (
    <Badge variant="outline" className={className}>
      <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
      {days === null || days === undefined
        ? "Closing date not stated"
        : days === 0
          ? "Closes today"
          : `${days} day${days === 1 ? "" : "s"} left`}
    </Badge>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="xl:min-w-44">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not stated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not stated";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "when the page loaded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "when the page loaded";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

function OpportunityWatchLoading() {
  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <Skeleton className="h-48 rounded-[32px]" />
      <Skeleton className="h-24 rounded-[24px]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-[28px]" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-96 rounded-[28px]" />
        ))}
      </div>
    </div>
  );
}
