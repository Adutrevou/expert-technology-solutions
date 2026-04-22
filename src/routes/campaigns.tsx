import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/components/status-badges";
import { generateCampaigns } from "@/lib/demo-data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Megaphone, Mail, MessageSquare, Calendar } from "lucide-react";

export const Route = createFileRoute("/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Apollo Vision" }] }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const { client } = useApp();
  const campaigns = useMemo(() => generateCampaigns(client.id), [client.id]);
  const chart = campaigns.map((c) => ({ name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name, replies: +c.replyRate.toFixed(1), opens: +c.openRate.toFixed(1) }));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">{campaigns.length} campaigns · click any to view detailed analytics</p>
      </header>

      <Card className="p-6 shadow-card">
        <h3 className="font-semibold mb-1">Campaign performance</h3>
        <p className="text-xs text-muted-foreground mb-4">Open & reply rates (%)</p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="opens" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="replies" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.map((c) => (
          <Card key={c.id} className="p-5 shadow-card transition-smooth hover:shadow-glow hover:-translate-y-0.5 cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                  <Megaphone className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-smooth">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.targetIndustry} · {c.targetLocation}</p>
                </div>
              </div>
              <CampaignStatusBadge status={c.status} />
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
              <Stat icon={Mail} label="Sent" value={c.emailsSent.toLocaleString()} />
              <Stat label="Open" value={`${c.openRate.toFixed(1)}%`} accent={c.openRate > 45 ? "success" : c.openRate > 30 ? "warning" : "destructive"} />
              <Stat icon={MessageSquare} label="Reply" value={`${c.replyRate.toFixed(1)}%`} accent={c.replyRate > 8 ? "success" : c.replyRate > 4 ? "warning" : "destructive"} />
              <Stat icon={Calendar} label="Meet" value={c.meetingsBooked.toString()} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent }: { label: string; value: string; icon?: any; accent?: "success" | "warning" | "destructive" }) {
  const cls = accent === "success" ? "text-success" : accent === "warning" ? "text-warning-foreground" : accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </div>
      <div className={`text-base font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
