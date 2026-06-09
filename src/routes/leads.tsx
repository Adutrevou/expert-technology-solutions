import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ChevronLeft, ChevronRight, Download, MessageSquare, RefreshCcw, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { LeadStatusBadge } from "@/components/status-badges";
import {
  useAddLeadCommentMutation,
  useLeadActivityQuery,
  useLeadsQuery,
  useUpdateLeadStatusMutation,
} from "@/lib/leads-api-hooks";
import { normalizeLead, type CanonicalLeadCounts, type LeadActivityRecord, type LeadRecord, type LeadsResponse, type LeadWorkflowStatus } from "@/lib/leads-api";
import { deriveNormalizedLeadStatusCounts, normalizeLeadStatus, type NormalizedLeadStatusCounts } from "@/lib/lead-status";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Expert Technology Solutions" }] }),
  component: LeadsPage,
});

const PAGE_SIZE = 50;
const LEAD_STATUS_OPTIONS: Array<{ value: LeadWorkflowStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "follow_up", label: "Follow up" },
  { value: "meeting_booked", label: "Meeting booked" },
  { value: "converted", label: "Converted" },
  { value: "rejected", label: "Rejected" },
];
const DEFAULT_LEAD_PIPELINE_FILTER_OPTIONS = [
  "Finding contact/email",
  "Outreach ready",
  "Contacted",
  "Reply received",
  "Blocked/Avoided",
] as const;

function LeadsPage() {
  const leadsQuery = useLeadsQuery();
  const updateStatusMutation = useUpdateLeadStatusMutation();
  const addCommentMutation = useAddLeadCommentMutation();
  const { user } = useApp();

  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [pipelineStatus, setPipelineStatus] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<string>("");
  const [commentDraft, setCommentDraft] = useState("");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [commentNotice, setCommentNotice] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [lastGoodLeadsData, setLastGoodLeadsData] = useState<typeof leadsQuery.data | null>(null);

  useEffect(() => {
    if (hasLeadDataSignal(leadsQuery.data)) {
      setLastGoodLeadsData(leadsQuery.data);
    }
  }, [leadsQuery.data]);

  const effectiveLeadsData = leadsQuery.data ?? lastGoodLeadsData;
  const all = useMemo(() => safeNormalizeLeadsArray(effectiveLeadsData?.records ?? effectiveLeadsData?.leads), [effectiveLeadsData?.records, effectiveLeadsData?.leads]);
  const leadActor = useMemo(
    () => ({
      name: user?.name?.trim() || "Expert Admin",
      email: user?.email?.trim() || "admin@experttechnologysolutions.co.za",
      role: user?.role || "manager",
    }),
    [user],
  );
  const industries = useMemo(() => Array.from(new Set(all.map((lead) => lead.industry))).sort(), [all]);
  const campaigns = useMemo(() => Array.from(new Set(all.map((lead) => lead.campaignName))).sort(), [all]);
  const hasLeadData = all.length > 0;
  const isAdminViewer = user?.role === "intergrai_admin" || user?.role === "system_agent";
  const visibleIndustries = useMemo(() => industries.filter(Boolean), [industries]);
  const visibleCampaigns = useMemo(() => campaigns.filter(Boolean), [campaigns]);
  const derivedStatusCounts = useMemo(() => deriveNormalizedLeadStatusCounts(all), [all]);
  const statusCounts = useMemo(
    () => resolveCanonicalStatusCounts(derivedStatusCounts, effectiveLeadsData?.counts, effectiveLeadsData?.totalCount),
    [derivedStatusCounts, effectiveLeadsData?.counts, effectiveLeadsData?.totalCount],
  );
  const totalLeadCount = statusCounts.total;
  const loadedLeadCount = safePositiveCount(effectiveLeadsData?.loadedCount, effectiveLeadsData?.returnedCount, all.length);
  const returnedLeadCount = safePositiveCount(effectiveLeadsData?.returnedCount, all.length);
  const pipelineFilterOptions = useMemo(() => {
    const options = [...DEFAULT_LEAD_PIPELINE_FILTER_OPTIONS];
    if (statusCounts.companyFound > 0) {
      options.unshift("Company found");
    }
    if (statusCounts.needsReviewTrueOnly > 0) {
      options.push("Needs review");
    }
    return options;
  }, [statusCounts.companyFound, statusCounts.needsReviewTrueOnly]);

  const filtered = useMemo(() => {
    return all.filter((lead) => {
      if (q && !`${lead.displayContactName || lead.name} ${lead.company} ${lead.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "all" && lead.industry !== industry) return false;
      if (pipelineStatus !== "all" && normalizeLeadStatus(lead) !== pipelineStatus) return false;
      if (campaign !== "all" && lead.campaignName !== campaign) return false;
      return true;
    });
  }, [all, q, industry, pipelineStatus, campaign]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedLead = filtered.find((lead) => lead.id === selectedLeadId) || filtered[0] || null;
  const activityQuery = useLeadActivityQuery(selectedLead?.id);
  const activity = activityQuery.data ?? [];
  const currentStatus = normalizeLeadStatus(selectedLead);
  const currentWorkflowStatus = getLeadWorkflowStatus(selectedLead);
  const statusOptions = useMemo(() => {
    if (!currentWorkflowStatus || LEAD_STATUS_OPTIONS.some((item) => item.value === currentWorkflowStatus)) {
      return LEAD_STATUS_OPTIONS;
    }

    return [{ value: currentWorkflowStatus as LeadWorkflowStatus, label: formatStatusLabel(currentWorkflowStatus) }, ...LEAD_STATUS_OPTIONS];
  }, [currentWorkflowStatus]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (industry !== "all" && !visibleIndustries.includes(industry)) {
      setIndustry("all");
    }
    if (campaign !== "all" && !visibleCampaigns.includes(campaign)) {
      setCampaign("all");
    }
    if (pipelineStatus !== "all" && !pipelineFilterOptions.includes(pipelineStatus as (typeof pipelineFilterOptions)[number])) {
      setPipelineStatus("all");
    }
  }, [all, campaign, industry, pipelineFilterOptions, pipelineStatus, visibleCampaigns, visibleIndustries]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const receivedCounts = effectiveLeadsData?.counts ?? null;
    console.debug("[Expert Leads] leads received", all.length);
    console.debug("[Expert Leads] counts received", receivedCounts);
    console.debug("[Expert Leads] counts derived from normalized leads", statusCounts);

    if (all.length > 0 && receivedCounts) {
      const countsAreZero =
        Number(receivedCounts.allLeads || receivedCounts.totalLeadsFound || 0) === 0 &&
        Number(receivedCounts.enrichmentQueue || 0) === 0 &&
        Number(receivedCounts.outreachReady || 0) === 0 &&
        Number(receivedCounts.contacted || 0) === 0 &&
        Number(receivedCounts.repliesReceived || 0) === 0 &&
        Number(receivedCounts.blockedAvoided || 0) === 0;

      if (countsAreZero) {
        console.warn("[Expert Leads] counts object is zero while leads are rendered", {
          leadsLength: all.length,
          receivedCounts,
          derivedCounts: statusCounts,
        });
      }
    }
  }, [all.length, effectiveLeadsData?.counts, statusCounts]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedLeadId !== null) setSelectedLeadId(null);
      return;
    }

    const leadExists = filtered.some((lead) => lead.id === selectedLeadId);
    if (!selectedLeadId || !leadExists) {
      setSelectedLeadId(filtered[0].id);
    }
  }, [filtered, selectedLeadId]);

  useEffect(() => {
    setStatusDraft(getLeadWorkflowStatus(selectedLead));
    setCommentDraft("");
    setStatusNotice(null);
    setCommentNotice(null);
    setCommentError(null);
  }, [selectedLead?.id, selectedLead?.status, selectedLead?.workflowStatus, selectedLead?.displayStatus]);

  const exportCSV = () => {
    const head = ["Name", "Company", "Title", "Industry", "Location", "Pipeline status", "Campaign", "Email"];
    const rows = filtered.map((lead) => [
      lead.displayContactName || lead.name,
      lead.company,
      lead.title,
      lead.industry,
      lead.location,
      normalizeLeadStatus(lead),
      lead.campaignName,
      lead.email,
    ]);
    const csv = [head, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "expert-technology-solutions-leads.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusUpdate = async () => {
    if (!selectedLead) return;

    setStatusNotice(null);
    try {
      await updateStatusMutation.mutateAsync({
        leadId: selectedLead.id,
        status: statusDraft as LeadWorkflowStatus,
        user: leadActor,
      });
      await Promise.all([leadsQuery.refetch(), activityQuery.refetch()]);
      setStatusNotice("Status updated successfully.");
    } catch {
      setStatusNotice(null);
    }
  };

  const handleCommentSubmit = async () => {
    if (!selectedLead) return;

    const nextComment = commentDraft.trim();
    if (!nextComment) {
      setCommentError("Enter a comment before saving.");
      setCommentNotice(null);
      return;
    }

    setCommentError(null);
    setCommentNotice(null);

    try {
      await addCommentMutation.mutateAsync({
        leadId: selectedLead.id,
        comment: nextComment,
        user: leadActor,
      });
      await Promise.all([leadsQuery.refetch(), activityQuery.refetch()]);
      setCommentDraft("");
      setCommentNotice("Comment saved successfully.");
    } catch {
      setCommentNotice(null);
    }
  };

  const showHardFailure = !effectiveLeadsData && leadsQuery.isError;
  const showingLastGoodData = Boolean(lastGoodLeadsData) && Boolean(leadsQuery.isError || (leadsQuery.isFetching && !leadsQuery.isLoading));

  try {
    void totalLeadCount;
    void loadedLeadCount;
    void returnedLeadCount;
  } catch (error) {
    console.error("[Expert Leads] route render guard tripped", error);
    return (
      <Card className="p-10 shadow-card">
        <h2 className="text-xl font-semibold">Leads temporarily unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Live lead data could not be rendered safely right now. Refresh to retry.
        </p>
        <Button onClick={() => leadsQuery.refetch()} variant="outline" className="mt-6">
          <RefreshCcw className="h-4 w-4 mr-2" /> Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads <span className="text-muted-foreground">({totalLeadCount.toLocaleString()})</span></h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live lead records and status history for Expert Technology Solutions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => leadsQuery.refetch()} variant="outline" className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${leadsQuery.isFetching ? "animate-spin" : ""}`} /> {leadsQuery.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </header>

      <Card className="p-4 shadow-card">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="All Leads" value={statusCounts.total} />
          <SummaryStat label="Enrichment Queue" value={statusCounts.enrichmentQueue} />
          <SummaryStat label="Outreach Ready" value={statusCounts.outreachReady} />
          <SummaryStat label="Contacted" value={statusCounts.contacted} />
          <SummaryStat label="Replies" value={statusCounts.replies} />
          <SummaryStat label="Blocked/Avoided" value={statusCounts.blockedAvoided} />
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1">All Leads: {statusCounts.total}</span>
          <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1">Enrichment Queue: {statusCounts.enrichmentQueue}</span>
          <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1">Outreach Ready: {statusCounts.outreachReady}</span>
          <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1">Contacted: {statusCounts.contacted}</span>
          <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1">Replies: {statusCounts.replies}</span>
          <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1">Blocked/Avoided: {statusCounts.blockedAvoided}</span>
          {statusCounts.needsReviewTrueOnly > 0 ? (
            <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-warning-foreground">True ambiguity needing review: {statusCounts.needsReviewTrueOnly}</span>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Search name, company, email..." className="pl-9" />
          </div>
          <Select value={industry} onValueChange={(value) => { setIndustry(value); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Industry" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {visibleIndustries.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pipelineStatus} onValueChange={(value) => { setPipelineStatus(value); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Pipeline status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {pipelineFilterOptions.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={campaign} onValueChange={(value) => { setCampaign(value); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="Campaign" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {visibleCampaigns.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {leadsQuery.isLoading ? (
        <LeadsLoadingState />
      ) : showHardFailure ? (
        <Card className="p-10 text-center shadow-card">
          <h2 className="text-xl font-semibold">Leads unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {(leadsQuery.error as Error | undefined)?.message || "We couldn’t load live leads from Intergrai right now."}
          </p>
          <Button onClick={() => leadsQuery.refetch()} variant="outline" className="mt-6">
            <RefreshCcw className="h-4 w-4 mr-2" /> Try again
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <Card className="overflow-hidden shadow-card">
            {showingLastGoodData ? (
              <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                {leadsQuery.isError ? "Showing last good live snapshot while refresh retries." : "Refreshing live lead data…"}
              </div>
            ) : null}
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
              Showing {paged.length.toLocaleString()} of {filtered.length.toLocaleString()} matching leads ({loadedLeadCount.toLocaleString()} loaded / {totalLeadCount.toLocaleString()} total sourced)
              {returnedLeadCount !== loadedLeadCount ? ` · ${returnedLeadCount.toLocaleString()} returned this page` : ""}
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {!hasLeadData ? (
                <EmptyState
                  title="No leads synced yet"
                  description="The live leads endpoint is connected, but this client does not have any leads yet."
                />
              ) : paged.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No leads match your filters.
                </div>
              ) : (
                paged.map((lead) => (
                  <LeadMobileCard
                    key={lead.id}
                    lead={lead}
                    isSelected={lead.id === selectedLead?.id}
                    onSelect={() => setSelectedLeadId(lead.id)}
                  />
                ))
              )}
            </div>
            <div className="overflow-x-auto">
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Company</TableHead>
                    <TableHead>Contact / Decision-maker</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Campaign / Focus Area</TableHead>
                    <TableHead className="hidden md:table-cell">Found date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!hasLeadData && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16">
                        <EmptyState
                          title="No leads synced yet"
                          description="The live leads endpoint is connected. Agent-found companies and contact opportunities will appear here."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {hasLeadData && paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No leads match your filters.</TableCell>
                    </TableRow>
                  )}
                  {paged.map((lead) => (
                    <TableRow
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      aria-selected={lead.id === selectedLead?.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedLeadId(lead.id);
                        }
                      }}
                      className={lead.id === selectedLead?.id ? "cursor-pointer bg-primary/5 ring-1 ring-primary/30" : "cursor-pointer transition-smooth hover:bg-muted/30"}
                    >
                      <TableCell className="font-medium">{displayValue(lead.company)}</TableCell>
                      <TableCell className="text-muted-foreground">{displayValue(lead.displayContactName || lead.name || lead.title)}</TableCell>
                      <TableCell><LeadStatusBadge status={normalizeLeadStatus(lead)} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{displayValue(lead.campaignName)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {lead.foundAt ? new Date(lead.foundAt).toLocaleDateString() : "Not provided"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="text-muted-foreground text-xs">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages || all.length === 0}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <LeadDetailPanel
            lead={selectedLead}
            activity={activity}
            activityError={(activityQuery.error as Error | undefined)?.message || null}
            activityLoading={activityQuery.isLoading || activityQuery.isFetching}
            commentDraft={commentDraft}
            commentError={commentError || (addCommentMutation.error as Error | undefined)?.message || null}
            commentNotice={commentNotice}
            currentStatus={currentStatus}
            currentWorkflowStatus={currentWorkflowStatus}
            onCommentChange={setCommentDraft}
            onCommentSubmit={handleCommentSubmit}
            onStatusChange={setStatusDraft}
            onStatusSubmit={handleStatusUpdate}
            selectedStatus={statusDraft}
            statusError={(updateStatusMutation.error as Error | undefined)?.message || null}
            statusLoading={updateStatusMutation.isPending}
            statusNotice={statusNotice}
            statusOptions={statusOptions}
            commentLoading={addCommentMutation.isPending}
            isAdminViewer={isAdminViewer}
            userLine={`${leadActor.name} · ${leadActor.email} · ${leadActor.role}`}
          />
        </div>
      )}
    </div>
  );
}

function LeadsLoadingState() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
      <Card className="p-4 shadow-card">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-11" />
          ))}
        </div>
      </Card>
      <Card className="p-4 shadow-card">
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-36" />
          <Skeleton className="h-48" />
        </div>
      </Card>
    </div>
  );
}

function hasLeadDataSignal(data: LeadsResponse | null | undefined) {
  if (!data) return false;
  const counts = data.counts ?? {
    allLeads: 0,
    totalLeadsFound: 0,
    companyFound: 0,
    enrichmentQueue: 0,
    outreachReady: 0,
    contacted: 0,
    repliesReceived: 0,
    blockedAvoided: 0,
    needsReview: 0,
    emailsSentToday: 0,
  };
  return Boolean(
    (Array.isArray(data.records) ? data.records.length : 0)
    || (Array.isArray(data.leads) ? data.leads.length : 0)
    || data.totalCount
    || data.returnedCount
    || data.loadedCount
    || counts.allLeads
    || counts.enrichmentQueue
    || counts.outreachReady
    || counts.contacted
    || counts.repliesReceived
    || counts.blockedAvoided
  );
}

function safeNormalizeLeadsArray(value: unknown): LeadRecord[] {
  const items = Array.isArray(value) ? value : [];
  return items.map((item, index) => {
    try {
      return normalizeLead(item, index);
    } catch (error) {
      console.error("[Expert Leads] failed to normalize lead row", { index, error, item });
      return normalizeLead({}, index);
    }
  });
}

function safePositiveCount(...values: Array<number | null | undefined>) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next) && next >= 0) {
      return next;
    }
  }
  return 0;
}

function LeadMobileCard({
  lead,
  isSelected,
  onSelect,
}: {
  lead: LeadRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left shadow-card ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{displayValue(lead.displayContactName || lead.name)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{displayValue(lead.company)}</p>
        </div>
        <LeadStatusBadge status={normalizeLeadStatus(lead)} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <LeadField label="Title" value={displayValue(lead.title)} />
        <LeadField label="Industry" value={displayValue(lead.industry)} />
        <LeadField label="Location" value={displayValue(lead.location)} />
        <LeadField label="Campaign" value={displayValue(lead.campaignName)} />
        <LeadField label="Score" value={lead.leadScore ? String(lead.leadScore) : "0"} />
        <LeadField label="Found by" value="Found by Agent" />
      </dl>
    </button>
  );
}

function LeadDetailPanel({
  lead,
  activity,
  activityError,
  activityLoading,
  commentDraft,
  commentError,
  commentLoading,
  commentNotice,
  currentStatus,
  currentWorkflowStatus,
  onCommentChange,
  onCommentSubmit,
  onStatusChange,
  onStatusSubmit,
  selectedStatus,
  statusError,
  statusLoading,
  statusNotice,
  statusOptions,
  userLine,
  isAdminViewer,
}: {
  lead: LeadRecord | null;
  activity: LeadActivityRecord[];
  activityError: string | null;
  activityLoading: boolean;
  commentDraft: string;
  commentError: string | null;
  commentLoading: boolean;
  commentNotice: string | null;
  currentStatus: string;
  currentWorkflowStatus: LeadWorkflowStatus;
  onCommentChange: (value: string) => void;
  onCommentSubmit: () => void;
  onStatusChange: (value: string) => void;
  onStatusSubmit: () => void;
  selectedStatus: string;
  statusError: string | null;
  statusLoading: boolean;
  statusNotice: string | null;
  statusOptions: Array<{ value: LeadWorkflowStatus; label: string }>;
  userLine: string;
  isAdminViewer: boolean;
}) {
  if (!lead) {
    return (
      <Card className="p-6 shadow-card">
        <EmptyState
          title="Select a lead"
          description="Choose a lead to view status history, add comments, and update the client-facing workflow."
        />
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-card">
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{displayValue(lead.displayContactName || lead.name)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {displayValue(lead.company)}
                {lead.title ? ` · ${lead.title}` : ""}
              </p>
            </div>
            <LeadStatusBadge status={currentStatus} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <LeadField label="Contact" value={displayValue(lead.displayContactName || lead.name)} />
            <LeadField label="Company" value={displayValue(lead.company)} />
            <LeadField label="Email" value={displayValue(lead.email)} />
            <LeadField label="Phone" value={displayValue(lead.phone)} />
            <LeadField label="Title" value={displayValue(lead.title)} />
            <LeadField label="Campaign" value={displayValue(lead.campaignName)} />
            <LeadField label="Industry" value={displayValue(lead.industry)} />
            <LeadField label="Location" value={displayValue(lead.location)} />
            <LeadField label="Website" value={displayValue(lead.website || lead.domain)} />
            <LeadField label="LinkedIn" value={displayValue(lead.linkedinUrl || lead.companyLinkedin)} />
            <LeadField label="Found by" value={isAdminViewer ? formatFoundByDetails(lead) : "Found by Agent"} />
            <LeadField label="Lead score" value={lead.leadScore ? String(lead.leadScore) : "0"} />
            <LeadField label="Outreach status" value={displayValue(lead.outreachStatus)} />
            <LeadField label="Next action" value={displayValue(lead.nextAction)} />
            <LeadField label="Routing" value={currentStatus === "Needs review" ? "Needs human review" : "Operational"} />
            <LeadField label="Last activity" value={lead.lastActivity ? formatDistanceToNow(new Date(lead.lastActivity), { addSuffix: true }) : "Not provided"} />
          </div>
          <div className="mt-4 rounded-xl border border-border bg-muted/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Match reason</p>
            <p className="mt-2 text-sm">{displayValue(lead.matchReason)}</p>
            {lead.qualityReasons.length ? (
              <div className="mt-3 rounded-xl border border-border/70 bg-background p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Quality review</p>
                <ul className="mt-2 space-y-1">
                  {lead.qualityReasons.map((reason) => (
                    <li key={reason}>- {reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {lead.decisionMakerPath.length ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Decision-maker path: {lead.decisionMakerPath.join(" -> ")}
              </p>
            ) : null}
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current status</p>
              <p className="text-xs text-muted-foreground">Updates are logged against the signed-in user.</p>
            </div>
            <LeadStatusBadge status={currentStatus} />
          </div>
          <div className="rounded-xl border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
            {userLine}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={onStatusSubmit} disabled={statusLoading || selectedStatus === currentWorkflowStatus} className="sm:min-w-36">
              {statusLoading ? "Saving..." : "Update status"}
            </Button>
          </div>
          {statusNotice ? <InlineNotice message={statusNotice} /> : null}
          {statusError ? <InlineAlert title="Status update failed" description={statusError} /> : null}
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium">Add comment</p>
            <p className="text-xs text-muted-foreground">Notes can be empty in history, but new comments require text.</p>
          </div>
          <Textarea
            value={commentDraft}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="Add a note about outreach, qualification, or the next action..."
            className="min-h-28"
          />
          <div className="flex justify-end">
            <Button onClick={onCommentSubmit} disabled={commentLoading} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {commentLoading ? "Saving..." : "Save comment"}
            </Button>
          </div>
          {commentNotice ? <InlineNotice message={commentNotice} /> : null}
          {commentError ? <InlineAlert title="Comment not saved" description={commentError} /> : null}
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium">Activity history</p>
            <p className="text-xs text-muted-foreground">Status changes and notes for this lead.</p>
          </div>
          {activityError ? <InlineAlert title="Activity unavailable" description={activityError} /> : null}
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-18" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No activity or comments have been recorded for this lead yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}

function ActivityItem({ item }: { item: LeadActivityRecord }) {
  return (
    <article className="rounded-xl border border-border bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{activityLabel(item)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{displayValue(item.message)}</p>
        </div>
        {item.status ? <LeadStatusBadge status={item.status} /> : null}
      </div>
      {item.comment && item.comment !== item.message ? (
        <p className="mt-3 rounded-lg bg-background/80 px-3 py-2 text-sm">{item.comment}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{item.userName || item.userEmail || "System update"}</span>
        {item.userRole ? <span>{item.userRole}</span> : null}
        {item.createdAt ? <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span> : null}
      </div>
    </article>
  );
}

function InlineAlert({ title, description }: { title: string; description: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

function InlineNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
      {message}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function LeadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm break-words">{value}</dd>
    </div>
  );
}

function displayValue(value?: string | null) {
  return value?.trim() ? value : "Not provided";
}

function formatFoundByDetails(lead: LeadRecord) {
  const parts = [
    lead.sourceProvider?.trim(),
    lead.sourceType?.trim(),
    lead.sourceEvidence?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Found by Agent";
}

function activityLabel(item: LeadActivityRecord) {
  if (item.type === "comment") return "Comment added";
  if (item.type === "status_change") return item.status ? `Status changed to ${formatStatusLabel(item.status)}` : "Status updated";
  return "Activity recorded";
}

function getLeadWorkflowStatus(lead: LeadRecord | null | undefined) {
  if (!lead) {
    return "new" as LeadWorkflowStatus;
  }

  const normalized = String(lead.workflowStatus || lead.status || "").trim().toLowerCase();
  switch (normalized) {
    case "new":
    case "reviewed":
    case "contacted":
    case "interested":
    case "not_interested":
    case "follow_up":
    case "meeting_booked":
    case "converted":
    case "rejected":
      return normalized as LeadWorkflowStatus;
    default:
      return mapPipelineStatusToWorkflowStatus(normalizeLeadStatus(lead));
  }
}

function mapPipelineStatusToWorkflowStatus(status: string): LeadWorkflowStatus {
  switch (status) {
    case "Company found":
      return "new";
    case "Finding contact/email":
      return "new";
    case "Needs review":
      return "reviewed";
    case "Outreach ready":
      return "reviewed";
    case "Blocked/Avoided":
      return "reviewed";
    case "Contacted":
      return "contacted";
    case "Reply received":
      return "follow_up";
    default:
      return "reviewed";
  }
}

function formatStatusLabel(status: string) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "manual review" || normalized === "manual_review" || normalized === "manual_review_required" || normalized === "needs review" || normalized === "needs_review" || normalized === "review") {
    return "Needs review";
  }
  if (normalized === "researching" || normalized === "raw company" || normalized === "raw_company" || normalized === "company found" || normalized === "company_found") {
    return "Company found";
  }
  if (normalized === "needs enrichment" || normalized === "needs_enrichment" || normalized === "finding contact/email" || normalized === "finding_contact_email") {
    return "Finding contact/email";
  }
  if (normalized === "qualified" || normalized === "qualified company" || normalized === "qualified_company" || normalized === "decision maker found" || normalized === "verified contact") {
    return "Finding contact/email";
  }
  if (normalized === "outreach ready" || normalized === "outreach_ready") {
    return "Outreach ready";
  }
  if (normalized === "outreach prepared" || normalized === "outreach_prepared") {
    return "Outreach ready";
  }
  if (normalized === "contacted" || normalized === "outreach sent" || normalized === "outreach_sent") {
    return "Contacted";
  }
  if (normalized === "replied" || normalized === "reply received" || normalized === "reply_received" || normalized === "needs reply approval" || normalized === "needs_reply_approval") {
    return "Reply received";
  }
  if (normalized === "excluded" || normalized === "duplicate suppressed" || normalized === "duplicate_suppressed" || normalized === "failed no email" || normalized === "failed_no_email" || normalized === "blocked/avoided" || normalized === "blocked_avoided") {
    return "Blocked/Avoided";
  }

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function resolveCanonicalStatusCounts(
  derivedCounts: NormalizedLeadStatusCounts,
  apiCounts?: CanonicalLeadCounts | null,
  totalCount?: number,
): NormalizedLeadStatusCounts {
  const canonicalTotal = Number(apiCounts?.allLeads || apiCounts?.totalLeadsFound || totalCount || 0);
  const apiHasSignal = Boolean(
    canonicalTotal
    || Number(apiCounts?.enrichmentQueue || 0)
    || Number(apiCounts?.outreachReady || 0)
    || Number(apiCounts?.contacted || 0)
    || Number(apiCounts?.repliesReceived || 0)
    || Number(apiCounts?.blockedAvoided || 0)
    || Number(apiCounts?.companyFound || 0)
    || Number(apiCounts?.needsReview || 0),
  );

  if (!apiCounts || !apiHasSignal) {
    return derivedCounts;
  }

  const companyFound = Number(apiCounts.companyFound || 0);
  const enrichmentQueue = Number(apiCounts.enrichmentQueue || 0);

  return {
    total: canonicalTotal || derivedCounts.total,
    companyFound,
    findingContactEmail: Math.max(0, enrichmentQueue - companyFound),
    enrichmentQueue,
    outreachReady: Number(apiCounts.outreachReady || 0),
    contacted: Number(apiCounts.contacted || 0),
    replies: Number(apiCounts.repliesReceived || 0),
    blockedAvoided: Number(apiCounts.blockedAvoided || 0),
    needsReviewTrueOnly: Number(apiCounts.needsReview || 0),
  };
}
