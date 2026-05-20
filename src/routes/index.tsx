import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { Users, Send, MessageSquare, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import { generateActivity, generateLeadsTimeseries, getFunnel, getKPIs } from "@/lib/demo-data";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Expert Technology Solutions" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { client, user } = useApp();
  const kpi = useMemo(() => getKPIs(client.id), [client.id]);
  const funnel = useMemo(() => getFunnel(client.id), [client.id]);
  const series = useMemo(() => generateLeadsTimeseries(client.id), [client.id]);
  const activity = useMemo(() => generateActivity(client.id), [client.id]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{client.companyName}</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">
            Welcome back, <span className="text-gradient-primary">{user?.name}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Here's how your outreach is performing this week.</p>
        </div>
      </header>

      {/* Weekly banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl border border-border bg-gradient-primary p-5 shadow-glow">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_50%,white,transparent_50%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 text-primary-foreground">
            <TrendingUp className="h-5 w-5" />
            <p className="text-sm font-medium">
              <span className="font-bold">This week:</span> +{kpi.weekDelta.leads} leads, +{kpi.weekDelta.replies} replies, +{kpi.weekDelta.meetings} meetings booked
            </p>
          </div>
          <Link to="/reports" className="text-xs font-semibold text-primary-foreground/90 hover:text-primary-foreground inline-flex items-center gap-1">
            View weekly report <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Leads" value={kpi.totalLeads} delta={`${kpi.weekDelta.leads} this week`} icon={Users} accent="primary" />
        <KpiCard label="Emails Sent" value={kpi.emailsSent} delta="8.2% vs last week" icon={Send} accent="info" />
        <KpiCard label="Replies" value={kpi.replies} delta={`${kpi.weekDelta.replies} this week`} icon={MessageSquare} accent="warning" />
        <KpiCard label="Meetings Booked" value={kpi.meetingsBooked} delta={`${kpi.weekDelta.meetings} this week`} icon={Calendar} accent="success" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Leads growth</h3>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="leads" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="replies" stroke="var(--chart-3)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h3 className="font-semibold">Performance funnel</h3>
          <p className="text-xs text-muted-foreground mb-4">Leads → Meetings</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="stage" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={75} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {funnel.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Activity */}
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Recent activity</h3>
            <p className="text-xs text-muted-foreground">Latest from your campaigns</p>
          </div>
        </div>
        <div className="space-y-3">
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg p-2 -mx-2 transition-smooth hover:bg-muted/50">
              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                a.type === "lead" ? "bg-primary" :
                a.type === "reply" ? "bg-warning" :
                a.type === "meeting" ? "bg-success" :
                a.type === "email" ? "bg-info" : "bg-muted-foreground"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
