import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateEmailTemplates, type EmailTemplate } from "@/lib/demo-data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Mail, TrendingUp, ShieldAlert, Trophy, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/email-scripts")({
  head: () => ({ meta: [{ title: "Email Scripts — Apollo Vision" }] }),
  component: EmailScriptsPage,
});

function EmailScriptsPage() {
  const { user, clients } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Build all templates across all clients
  const all = useMemo(() => {
    return clients.flatMap((c) =>
      generateEmailTemplates(c.id).map((t) => ({ ...t, _clientName: c.companyName, _brand: c.brandColor })),
    );
  }, [clients]);

  // Group by campaign+step for cross-company comparison
  const groups = useMemo(() => {
    const map = new Map<string, typeof all>();
    for (const t of all) {
      const key = `${t.campaignName}__${t.step}`;
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const [campaignName, step] = key.split("__");
      const sorted = [...items].sort((a, b) => replyRate(b) - replyRate(a));
      return { campaignName, step: Number(step), items: sorted };
    });
  }, [all]);

  const topPerformer = useMemo(() => [...all].sort((a, b) => replyRate(b) - replyRate(a))[0], [all]);

  if (user?.role !== "super_admin") {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Card className="p-8 text-center shadow-card">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Restricted</h2>
          <p className="text-sm text-muted-foreground">Email Scripts are only visible to Super Admins.</p>
        </Card>
      </div>
    );
  }

  if (selectedId) {
    const tpl = all.find((t) => t.id === selectedId);
    if (tpl) return <TemplateDetail tpl={tpl} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Email Scripts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare outreach copy across all {clients.length} clients · {all.length} templates tracked
          </p>
        </div>
        {topPerformer && (
          <Card className="px-4 py-3 shadow-card flex items-center gap-3 bg-gradient-to-br from-primary/10 to-transparent">
            <Trophy className="h-5 w-5 text-primary" />
            <div className="text-xs">
              <div className="text-muted-foreground">Top performer</div>
              <div className="font-semibold">{topPerformer.campaignName} · Step {topPerformer.step}</div>
              <div className="text-muted-foreground">{topPerformer._clientName} · {replyRate(topPerformer).toFixed(1)}% reply</div>
            </div>
          </Card>
        )}
      </header>

      <Tabs defaultValue="compare" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compare">Side-by-side compare</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="all">All templates</TabsTrigger>
        </TabsList>

        <TabsContent value="compare" className="space-y-6">
          {groups.map((g) => (
            <Card key={`${g.campaignName}-${g.step}`} className="p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    {g.campaignName}
                  </h3>
                  <p className="text-xs text-muted-foreground">Step {g.step} · {g.items.length} variants across clients</p>
                </div>
              </div>
              <div className="h-[180px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={g.items.map((t) => ({ name: t._clientName, open: +openRate(t).toFixed(1), reply: +replyRate(t).toFixed(1) }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="open" name="Open %" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="reply" name="Reply %" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {g.items.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="text-left p-3 rounded-lg border border-border bg-card hover:border-primary hover:shadow-glow transition-smooth group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white" style={{ backgroundColor: t._brand }}>
                          {t._clientName.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-xs font-medium truncate">{t._clientName}</span>
                      </div>
                      {idx === 0 && <Badge variant="secondary" className="text-[9px] gap-1"><Trophy className="h-2.5 w-2.5" />Best</Badge>}
                    </div>
                    <div className="text-sm font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-smooth">{t.subject}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.body}</p>
                    <div className="flex items-center gap-3 text-[11px] tabular-nums">
                      <span className="text-muted-foreground">{t.sent.toLocaleString()} sent</span>
                      <span className="text-success">{replyRate(t).toFixed(1)}% reply</span>
                      <span className="text-muted-foreground">{t.meetings} mtg</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card className="p-0 shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Campaign · Step</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Open %</TableHead>
                  <TableHead className="text-right">Reply %</TableHead>
                  <TableHead className="text-right">Meetings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...all].sort((a, b) => replyRate(b) - replyRate(a)).map((t, i) => (
                  <TableRow key={t.id} onClick={() => setSelectedId(t.id)} className="cursor-pointer">
                    <TableCell className="font-semibold tabular-nums">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white" style={{ backgroundColor: t._brand }}>
                          {t._clientName.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm">{t._clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{t.campaignName} · {t.step}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm">{t.subject}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{t.sent.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{openRate(t).toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-semibold text-success">{replyRate(t).toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{t.meetings}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="grid gap-3 md:grid-cols-2">
          {all.map((t) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)} className="text-left">
              <Card className="p-4 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-smooth h-full">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-[10px]">{t.campaignName} · Step {t.step}</Badge>
                  <span className="text-[10px] text-muted-foreground" style={{ color: t._brand }}>{t._clientName}</span>
                </div>
                <div className="font-semibold text-sm mb-1 line-clamp-1">{t.subject}</div>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3 whitespace-pre-line">{t.body}</p>
                <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>{t.sent.toLocaleString()} sent</span>
                  <span className="text-success font-semibold">{replyRate(t).toFixed(1)}% reply</span>
                </div>
              </Card>
            </button>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateDetail({ tpl, onBack }: { tpl: EmailTemplate & { _clientName: string; _brand: string }; onBack: () => void }) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to scripts
      </Button>

      <Card className="p-6 shadow-card">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: tpl._brand }}>
                {tpl._clientName.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-sm font-medium">{tpl._clientName}</span>
              <Badge variant="outline" className="text-[10px]">{tpl.campaignName} · Step {tpl.step}</Badge>
            </div>
            <h1 className="text-2xl font-bold">{tpl.subject}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Edited by {tpl.author} · {format(new Date(tpl.lastEditedAt), "PP")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 py-4 border-y border-border mb-6">
          <Stat label="Sent" value={tpl.sent.toLocaleString()} />
          <Stat label="Open rate" value={`${openRate(tpl).toFixed(1)}%`} accent="warning" />
          <Stat label="Reply rate" value={`${replyRate(tpl).toFixed(1)}%`} accent="success" />
          <Stat label="Meetings" value={tpl.meetings.toString()} />
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Mail className="h-3 w-3" /> Email body
          </h3>
          <pre className="whitespace-pre-wrap font-sans text-sm p-4 rounded-lg bg-muted/40 border border-border leading-relaxed">
            {tpl.body}
          </pre>
        </div>
      </Card>

      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Performance signals
        </h3>
        <p className="text-xs text-muted-foreground mb-4">How this script performs vs. the cross-client benchmark.</p>
        <BenchmarkRow label="Open rate" value={openRate(tpl)} benchmark={45} />
        <BenchmarkRow label="Reply rate" value={replyRate(tpl)} benchmark={6} />
        <BenchmarkRow label="Meeting conversion" value={tpl.replies ? (tpl.meetings / tpl.replies) * 100 : 0} benchmark={25} />
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" }) {
  const cls = accent === "success" ? "text-success" : accent === "warning" ? "text-warning-foreground" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function BenchmarkRow({ label, value, benchmark }: { label: string; value: number; benchmark: number }) {
  const pct = Math.min(100, (value / (benchmark * 1.6)) * 100);
  const above = value >= benchmark;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="tabular-nums">
          <span className={above ? "text-success font-semibold" : "text-warning-foreground font-semibold"}>{value.toFixed(1)}%</span>
          <span className="text-muted-foreground"> · benchmark {benchmark}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${above ? "bg-success" : "bg-warning"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function openRate(t: EmailTemplate) {
  return t.sent ? (t.opens / t.sent) * 100 : 0;
}
function replyRate(t: EmailTemplate) {
  return t.sent ? (t.replies / t.sent) * 100 : 0;
}
