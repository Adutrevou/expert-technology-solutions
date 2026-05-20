import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadStatusBadge } from "@/components/status-badges";
import { generateLeads, type LeadStatus } from "@/lib/demo-data";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Expert Technology Solutions" }] }),
  component: LeadsPage,
});

const PAGE_SIZE = 12;

function LeadsPage() {
  const { client } = useApp();
  const all = useMemo(() => generateLeads(client.id), [client.id]);

  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [status, setStatus] = useState<"all" | LeadStatus>("all");
  const [campaign, setCampaign] = useState("all");
  const [page, setPage] = useState(1);

  const industries = useMemo(() => Array.from(new Set(all.map((l) => l.industry))).sort(), [all]);
  const campaigns = useMemo(() => Array.from(new Set(all.map((l) => l.campaignName))).sort(), [all]);

  const filtered = useMemo(() => {
    return all.filter((l) => {
      if (q && !`${l.name} ${l.company} ${l.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "all" && l.industry !== industry) return false;
      if (status !== "all" && l.status !== status) return false;
      if (campaign !== "all" && l.campaignName !== campaign) return false;
      return true;
    });
  }, [all, q, industry, status, campaign]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const head = ["Name", "Company", "Title", "Industry", "Location", "Status", "Campaign", "Email"];
    const rows = filtered.map((l) => [l.name, l.company, l.title, l.industry, l.location, l.status, l.campaignName, l.email]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-${client.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length.toLocaleString()} leads · {all.length.toLocaleString()} total</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </header>

      <Card className="p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, company, email..." className="pl-9" />
          </div>
          <Select value={industry} onValueChange={(v) => { setIndustry(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Industry" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">Review</SelectItem>
              <SelectItem value="contacted">Warm</SelectItem>
              <SelectItem value="replied">Warm (Replied)</SelectItem>
              <SelectItem value="interested">Hot</SelectItem>
              <SelectItem value="meeting_booked">Hot (Meeting Booked)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={campaign} onValueChange={(v) => { setCampaign(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Campaign" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="hidden md:table-cell">Title</TableHead>
                <TableHead className="hidden lg:table-cell">Industry</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Campaign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No leads match your filters.</TableCell></TableRow>
              )}
              {paged.map((l) => (
                <TableRow key={l.id} className="transition-smooth">
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-muted-foreground">{l.company}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{l.title}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{l.industry}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{l.location}</TableCell>
                  <TableCell><LeadStatusBadge status={l.status} /></TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground text-xs">{l.campaignName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground text-xs">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
