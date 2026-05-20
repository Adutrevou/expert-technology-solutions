import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CampaignStatusBadge } from "@/components/status-badges";
import { useCampaigns, type CustomCampaign } from "@/lib/campaigns-store";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Megaphone, Mail, MessageSquare, Calendar, Plus, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Expert Technology Solutions" }] }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const { client, user } = useApp();
  const { campaigns, addCampaign, setReview } = useCampaigns(client.id);
  const isAdmin = user?.role === "super_admin";

  const pending = useMemo(
    () => campaigns.filter((c) => "reviewStatus" in c && c.reviewStatus === "pending_review") as CustomCampaign[],
    [campaigns],
  );

  const chart = campaigns
    .filter((c) => c.emailsSent > 0)
    .map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
      replies: +c.replyRate.toFixed(1),
      opens: +c.openRate.toFixed(1),
    }));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {campaigns.length} campaigns · {isAdmin ? "review and launch client requests" : "request a new campaign and we'll launch it for you"}
          </p>
        </div>
        <NewCampaignDialog
          clientId={client.id}
          isAdmin={isAdmin}
          userEmail={user?.email}
          onCreate={(input) => {
            const c = addCampaign(input);
            toast.success(
              isAdmin ? `Campaign "${c.name}" launched` : `Campaign "${c.name}" submitted for review`,
            );
          }}
        />
      </header>

      {isAdmin && pending.length > 0 && (
        <Card className="p-5 shadow-card border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-warning-foreground" />
            <h3 className="font-semibold">Pending client requests ({pending.length})</h3>
          </div>
          <div className="space-y-3">
            {pending.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">{c.name}</p>
                    <Badge variant="outline" className="text-[10px] uppercase">From client</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.targetIndustry} · {c.targetLocation}
                    {c.requestedByEmail ? ` · requested by ${c.requestedByEmail}` : ""}
                  </p>
                  {c.goal && <p className="text-sm mt-2">🎯 {c.goal}</p>}
                  {c.notes && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{c.notes}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => { setReview(c.id, "rejected"); toast.message("Request declined"); }}>
                    <X className="h-4 w-4 mr-1" /> Decline
                  </Button>
                  <Button size="sm" onClick={() => { setReview(c.id, "approved"); toast.success(`Launched "${c.name}"`); }}>
                    <Check className="h-4 w-4 mr-1" /> Approve & launch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {chart.length > 0 && (
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
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.map((c) => {
          const isPending = "reviewStatus" in c && c.reviewStatus === "pending_review";
          const isRejected = "reviewStatus" in c && c.reviewStatus === "rejected";
          return (
            <Card
              key={c.id}
              className={`p-5 shadow-card transition-smooth hover:shadow-glow hover:-translate-y-0.5 cursor-pointer group ${isPending ? "border-warning/50" : ""}`}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow shrink-0">
                    <Megaphone className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold group-hover:text-primary transition-smooth truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{c.targetIndustry} · {c.targetLocation}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isPending ? (
                    <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/40 text-[10px] uppercase">Pending review</Badge>
                  ) : isRejected ? (
                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] uppercase">Declined</Badge>
                  ) : (
                    <CampaignStatusBadge status={c.status} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                <Stat icon={Mail} label="Sent" value={c.emailsSent.toLocaleString()} />
                <Stat label="Open" value={`${c.openRate.toFixed(1)}%`} accent={c.openRate > 45 ? "success" : c.openRate > 30 ? "warning" : c.openRate > 0 ? "destructive" : undefined} />
                <Stat icon={MessageSquare} label="Reply" value={`${c.replyRate.toFixed(1)}%`} accent={c.replyRate > 8 ? "success" : c.replyRate > 4 ? "warning" : c.replyRate > 0 ? "destructive" : undefined} />
                <Stat icon={Calendar} label="Meet" value={c.meetingsBooked.toString()} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NewCampaignDialog({
  clientId,
  isAdmin,
  userEmail,
  onCreate,
}: {
  clientId: string;
  isAdmin: boolean;
  userEmail?: string;
  onCreate: (input: {
    clientId: string;
    name: string;
    targetIndustry: string;
    targetLocation: string;
    goal?: string;
    notes?: string;
    requestedBy: "client" | "admin";
    requestedByEmail?: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => { setName(""); setIndustry(""); setLocation(""); setGoal(""); setNotes(""); };
  const submit = () => {
    if (!name.trim() || !industry.trim() || !location.trim()) return;
    onCreate({
      clientId,
      name: name.trim(),
      targetIndustry: industry.trim(),
      targetLocation: location.trim(),
      goal: goal.trim() || undefined,
      notes: notes.trim() || undefined,
      requestedBy: isAdmin ? "admin" : "client",
      requestedByEmail: userEmail,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="shrink-0"><Plus className="h-4 w-4 mr-1" /> {isAdmin ? "New campaign" : "Request campaign"}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isAdmin ? "Launch a new campaign" : "Request a new campaign"}</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Create and immediately activate a campaign for this client."
              : "Tell us who to target. We'll review and launch it for you — usually within 1 business day."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cname">Campaign name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q1 Logistics CEOs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cind">Target industry</Label>
              <Input id="cind" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Logistics" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cloc">Target location</Label>
              <Input id="cloc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="United States" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cgoal">Primary goal (optional)</Label>
            <Input id="cgoal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Book 20 demos with VPs of Ops" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnotes">Notes for the team (optional)</Label>
            <Textarea id="cnotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Audience details, messaging angles, exclusions…" rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || !industry.trim() || !location.trim()}>
            {isAdmin ? "Launch campaign" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
