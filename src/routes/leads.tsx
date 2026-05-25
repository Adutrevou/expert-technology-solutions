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
import { normalizeLead, type LeadActivityRecord, type LeadRecord, type LeadWorkflowStatus } from "@/lib/leads-api";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Expert Technology Solutions" }] }),
  component: LeadsPage,
});

const PAGE_SIZE = 12;
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

function LeadsPage() {
  const leadsQuery = useLeadsQuery();
  const updateStatusMutation = useUpdateLeadStatusMutation();
  const addCommentMutation = useAddLeadCommentMutation();
  const { user } = useApp();

  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [qualification, setQualification] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<string>("");
  const [commentDraft, setCommentDraft] = useState("");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [commentNotice, setCommentNotice] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const all = useMemo(() => (leadsQuery.data?.leads || []).map(normalizeLead), [leadsQuery.data?.leads]);
  const industries = useMemo(() => Array.from(new Set(all.map((lead) => lead.industry))).sort(), [all]);
  const campaigns = useMemo(() => Array.from(new Set(all.map((lead) => lead.campaignName))).sort(), [all]);

  const filtered = useMemo(() => {
    return all.filter((lead) => {
      if (q && !`${lead.name} ${lead.company} ${lead.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "all" && lead.industry !== industry) return false;
      if (qualification !== "all" && lead.qualification !== qualification) return false;
      if (campaign !== "all" && lead.campaignName !== campaign) return false;
      return true;
    });
  }, [all, q, industry, qualification, campaign]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedLead = filtered.find((lead) => lead.id === selectedLeadId) || filtered[0] || null;
  const activityQuery = useLeadActivityQuery(selectedLead?.id);
  const activity = activityQuery.data ?? [];
  const currentStatus = selectedLead?.status || "unknown";
  const statusOptions = useMemo(() => {
    if (!currentStatus || LEAD_STATUS_OPTIONS.some((item) => item.value === currentStatus)) {
      return LEAD_STATUS_OPTIONS;
    }

    return [{ value: currentStatus as LeadWorkflowStatus, label: formatStatusLabel(currentStatus) }, ...LEAD_STATUS_OPTIONS];
  }, [currentStatus]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
    setStatusDraft(selectedLead?.status || "new");
    setCommentDraft("");
    setStatusNotice(null);
    setCommentNotice(null);
    setCommentError(null);
  }, [selectedLead?.id, selectedLead?.status]);

  const exportCSV = () => {
    const head = ["Name", "Company", "Title", "Industry", "Location", "Qualification", "Status", "Campaign", "Email"];
    const rows = filtered.map((lead) => [
      lead.name,
      lead.company,
      lead.title,
      lead.industry,
      lead.location,
      lead.qualification,
      lead.status,
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
    if (!selectedLead || !user) return;

    setStatusNotice(null);
    try {
      await updateStatusMutation.mutateAsync({
        leadId: selectedLead.id,
        status: statusDraft as LeadWorkflowStatus,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
      setStatusNotice(`Lead status saved as ${formatStatusLabel(statusDraft)}.`);
      void leadsQuery.refetch();
    } catch {
      setStatusNotice(null);
    }
  };

  const handleCommentSubmit = async () => {
    if (!selectedLead || !user) return;

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
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
      setCommentDraft("");
      setCommentNotice("Comment saved.");
      void leadsQuery.refetch();
    } catch {
      setCommentNotice(null);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live lead records and status history for Expert Technology Solutions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => leadsQuery.refetch()} variant="outline" className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </header>

      <Card className="p-4 shadow-card">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Total leads" value={all.length} />
          <SummaryStat label="Hot" value={all.filter((lead) => lead.qualification === "hot").length} />
          <SummaryStat label="Warm" value={all.filter((lead) => lead.qualification === "warm").length} />
          <SummaryStat label="Review" value={all.filter((lead) => lead.qualification === "review").length} />
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
              {industries.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={qualification} onValueChange={(value) => { setQualification(value); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Qualification" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All qualifications</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="not_qualified">Not qualified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={campaign} onValueChange={(value) => { setCampaign(value); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="Campaign" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {leadsQuery.isLoading ? (
        <LeadsLoadingState />
      ) : leadsQuery.isError || !leadsQuery.data ? (
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
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
              Showing {filtered.length.toLocaleString()} of {all.length.toLocaleString()} synced leads
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {all.length === 0 ? (
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
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="hidden md:table-cell">Title</TableHead>
                    <TableHead className="hidden lg:table-cell">Industry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead className="hidden xl:table-cell">Campaign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16">
                        <EmptyState
                          title="No leads synced yet"
                          description="The live leads endpoint is connected, but this client does not have any leads yet."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {all.length > 0 && paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No leads match your filters.</TableCell>
                    </TableRow>
                  )}
                  {paged.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className={lead.id === selectedLead?.id ? "bg-muted/40" : "transition-smooth"}
                    >
                      <TableCell className="font-medium">
                        <button type="button" className="text-left" onClick={() => setSelectedLeadId(lead.id)}>
                          {lead.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.company}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{lead.title}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{lead.industry}</TableCell>
                      <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                      <TableCell><LeadStatusBadge status={lead.qualification} /></TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground text-xs">{lead.campaignName}</TableCell>
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
            userLine={user ? `${user.name} · ${user.email} · ${user.role}` : "No active user"}
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
          <h2 className="truncate font-semibold">{lead.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lead.company}</p>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <LeadStatusBadge status={lead.qualification} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <LeadField label="Title" value={lead.title} />
        <LeadField label="Industry" value={lead.industry} />
        <LeadField label="Location" value={lead.location} />
        <LeadField label="Campaign" value={lead.campaignName} />
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
              <h2 className="text-2xl font-semibold">{lead.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lead.company}
                {lead.title !== "Unknown title" ? ` · ${lead.title}` : ""}
              </p>
            </div>
            <LeadStatusBadge status={currentStatus} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <LeadField label="Email" value={lead.email || "No email provided"} />
            <LeadField label="Campaign" value={lead.campaignName} />
            <LeadField label="Industry" value={lead.industry} />
            <LeadField label="Location" value={lead.location} />
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
            <Button onClick={onStatusSubmit} disabled={statusLoading || selectedStatus === currentStatus} className="sm:min-w-36">
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
          <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
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

function activityLabel(item: LeadActivityRecord) {
  if (item.type === "comment") return "Comment added";
  if (item.type === "status_change") return item.status ? `Status changed to ${formatStatusLabel(item.status)}` : "Status updated";
  return "Activity recorded";
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}
