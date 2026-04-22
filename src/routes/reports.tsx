import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getKPIs, getFunnel } from "@/lib/demo-data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Apollo Vision" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { client } = useApp();
  const kpi = useMemo(() => getKPIs(client.id), [client.id]);
  const funnel = useMemo(() => getFunnel(client.id), [client.id]);

  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Leads", kpi.totalLeads],
      ["Emails Sent", kpi.emailsSent],
      ["Replies", kpi.replies],
      ["Meetings Booked", kpi.meetingsBooked],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report-${client.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generated {format(new Date(), "PPP")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
          <Button onClick={() => window.print()} className="gap-2 bg-gradient-primary shadow-glow"><FileText className="h-4 w-4" /> Print / PDF</Button>
        </div>
      </header>

      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        {(["weekly", "monthly"] as const).map((period) => (
          <TabsContent key={period} value={period} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { l: "Leads Generated", v: period === "weekly" ? kpi.weekDelta.leads : kpi.totalLeads },
                { l: "Emails Sent", v: period === "weekly" ? Math.floor(kpi.emailsSent / 4) : kpi.emailsSent },
                { l: "Replies", v: period === "weekly" ? kpi.weekDelta.replies : kpi.replies },
                { l: "Meetings", v: period === "weekly" ? kpi.weekDelta.meetings : kpi.meetingsBooked },
              ].map((s) => (
                <Card key={s.l} className="p-5 shadow-card">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</p>
                  <p className="font-display text-3xl font-bold tabular-nums mt-1">{s.v.toLocaleString()}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6 shadow-card">
              <h3 className="font-semibold mb-4">Funnel breakdown</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} layout="vertical" margin={{ left: 0, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="stage" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={80} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>{funnel.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
