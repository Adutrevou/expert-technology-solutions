import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadStatusBadge } from "@/components/status-badges";
import { Search, Download, ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { useLeadsQuery } from "@/lib/leads-api-hooks";
import { normalizeLead } from "@/lib/leads-api";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Expert Technology Solutions" }] }),
  component: LeadsPage,
});

const PAGE_SIZE = 12;

function LeadsPage() {
  const leadsQuery = useLeadsQuery();
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [qualification, setQualification] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [page, setPage] = useState(1);

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

  const exportCSV = () => {
    const head = ["Name", "Company", "Title", "Industry", "Location", "Qualification", "Campaign", "Email"];
    const rows = filtered.map((lead) => [lead.name, lead.company, lead.title, lead.industry, lead.location, lead.qualification, lead.campaignName, lead.email]);
    const csv = [head, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "expert-technology-solutions-leads.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live lead records for Expert Technology Solutions
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
          <p className="mt-2 text-sm text-muted-foreground">We couldn’t load live leads from Intergrai right now.</p>
          <Button onClick={() => leadsQuery.refetch()} variant="outline" className="mt-6">
            <RefreshCcw className="h-4 w-4 mr-2" /> Try again
          </Button>
        </Card>
      ) : (
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
                <article key={lead.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{lead.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{lead.company}</p>
                    </div>
                    <LeadStatusBadge status={lead.qualification} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <LeadField label="Title" value={lead.title} />
                    <LeadField label="Industry" value={lead.industry} />
                    <LeadField label="Location" value={lead.location} />
                    <LeadField label="Campaign" value={lead.campaignName} />
                  </dl>
                </article>
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
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
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
                  <TableRow key={lead.id} className="transition-smooth">
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.company}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{lead.title}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{lead.industry}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{lead.location}</TableCell>
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
      )}
    </div>
  );
}

function LeadsLoadingState() {
  return (
    <Card className="p-4 shadow-card">
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-11" />
        ))}
      </div>
    </Card>
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
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
