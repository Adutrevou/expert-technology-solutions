import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type EmailTemplate } from "@/lib/demo-data";
import { useEmailScripts } from "@/lib/email-scripts-store";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Mail, TrendingUp, ShieldAlert, Trophy, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/email-scripts")({
  head: () => ({ meta: [{ title: "Email Scripts — Apollo Vision" }] }),
  component: EmailScriptsPage,
});

const scriptSchema = z.object({
  clientId: z.string().min(1, "Choose a client"),
  campaignName: z.string().trim().min(1, "Campaign required").max(80),
  step: z.coerce.number().int().min(1, "Step must be ≥ 1").max(10, "Step must be ≤ 10"),
  subject: z.string().trim().min(1, "Subject required").max(160),
  body: z.string().trim().min(1, "Body required").max(4000),
});

type ScriptInput = z.infer<typeof scriptSchema>;

type DecoratedTemplate = EmailTemplate & { _clientName: string; _brand: string };

function EmailScriptsPage() {
  const { user, clients, client } = useApp();
  const isAdmin = user?.role === "super_admin";
  const clientIds = useMemo(
    () => (isAdmin ? clients.map((c) => c.id) : [client.id]),
    [isAdmin, clients, client.id],
  );
  const { templates, addScript, updateScript, deleteScript } = useEmailScripts(clientIds);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ mode: "add" | "edit"; tpl?: EmailTemplate } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const all = useMemo<DecoratedTemplate[]>(() => {
    const byId = new Map(clients.map((c) => [c.id, c]));
    return templates
      .map((t) => {
        const c = byId.get(t.clientId);
        return c ? { ...t, _clientName: c.companyName, _brand: c.brandColor } : null;
      })
      .filter((t): t is DecoratedTemplate => t !== null);
  }, [templates, clients]);

  const groups = useMemo(() => {
    const map = new Map<string, DecoratedTemplate[]>();
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

  const topPerformer = useMemo(
    () => [...all].filter((t) => t.sent > 0).sort((a, b) => replyRate(b) - replyRate(a))[0],
    [all],
  );

  if (!user) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Card className="p-8 text-center shadow-card">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Restricted</h2>
          <p className="text-sm text-muted-foreground">Please sign in to view email scripts.</p>
        </Card>
      </div>
    );
  }

  if (selectedId) {
    const tpl = all.find((t) => t.id === selectedId);
    if (tpl) {
      return (
        <TemplateDetail
          tpl={tpl}
          onBack={() => setSelectedId(null)}
          onEdit={isAdmin ? () => setEditor({ mode: "edit", tpl }) : undefined}
          onDelete={isAdmin ? () => setConfirmDeleteId(tpl.id) : undefined}
        />
      );
    }
  }

  const confirmDeleteTpl = confirmDeleteId ? all.find((t) => t.id === confirmDeleteId) : null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Email Scripts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? `Compare outreach copy across all ${clients.length} clients · ${all.length} templates tracked`
              : `See which of your outreach emails are performing best · ${all.length} templates tracked`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {topPerformer && (
            <Card className="px-4 py-3 shadow-card hidden md:flex items-center gap-3 bg-gradient-to-br from-primary/10 to-transparent">
              <Trophy className="h-5 w-5 text-primary" />
              <div className="text-xs">
                <div className="text-muted-foreground">Top performer</div>
                <div className="font-semibold">{topPerformer.campaignName} · Step {topPerformer.step}</div>
                <div className="text-muted-foreground">
                  {isAdmin ? `${topPerformer._clientName} · ` : ""}{replyRate(topPerformer).toFixed(1)}% reply
                </div>
              </div>
            </Card>
          )}
          {isAdmin && (
            <Button onClick={() => setEditor({ mode: "add" })} className="gap-2">
              <Plus className="h-4 w-4" /> New script
            </Button>
          )}
        </div>
      </header>

      <Tabs defaultValue={isAdmin ? "compare" : "leaderboard"} className="space-y-4">
        <TabsList>
          {isAdmin && <TabsTrigger value="compare">Side-by-side compare</TabsTrigger>}
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="all">All templates</TabsTrigger>
        </TabsList>

        {isAdmin && <TabsContent value="compare" className="space-y-6">
          {groups.length === 0 && (
            <Card className="p-10 text-center text-sm text-muted-foreground shadow-card">
              No scripts yet. Click <strong>New script</strong> to add the first one.
            </Card>
          )}
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
                  <div
                    key={t.id}
                    className="relative p-3 rounded-lg border border-border bg-card hover:border-primary hover:shadow-glow transition-smooth group"
                  >
                    <button onClick={() => setSelectedId(t.id)} className="text-left w-full">
                      <div className="flex items-center justify-between mb-2 pr-16">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white" style={{ backgroundColor: t._brand }}>
                            {t._clientName.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-xs font-medium truncate">{t._clientName}</span>
                        </div>
                        {idx === 0 && t.sent > 0 && <Badge variant="secondary" className="text-[9px] gap-1"><Trophy className="h-2.5 w-2.5" />Best</Badge>}
                      </div>
                      <div className="text-sm font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-smooth">{t.subject}</div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.body}</p>
                      <div className="flex items-center gap-3 text-[11px] tabular-nums">
                        <span className="text-muted-foreground">{t.sent.toLocaleString()} sent</span>
                        <span className="text-success">{replyRate(t).toFixed(1)}% reply</span>
                        <span className="text-muted-foreground">{t.meetings} mtg</span>
                      </div>
                    </button>
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditor({ mode: "edit", tpl: t })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>}

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
                  {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...all].sort((a, b) => replyRate(b) - replyRate(a)).map((t, i) => (
                  <TableRow key={t.id}>
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
                    <TableCell className="max-w-[280px] truncate text-sm cursor-pointer" onClick={() => setSelectedId(t.id)}>{t.subject}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{t.sent.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{openRate(t).toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-semibold text-success">{replyRate(t).toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{t.meetings}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditor({ mode: "edit", tpl: t })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="grid gap-3 md:grid-cols-2">
          {all.map((t) => (
            <Card key={t.id} className="p-4 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-smooth h-full relative group">
              <button onClick={() => setSelectedId(t.id)} className="text-left w-full">
                <div className="flex items-center justify-between mb-2 pr-16">
                  <Badge variant="outline" className="text-[10px]">{t.campaignName} · Step {t.step}</Badge>
                  <span className="text-[10px] text-muted-foreground" style={{ color: t._brand }}>{t._clientName}</span>
                </div>
                <div className="font-semibold text-sm mb-1 line-clamp-1">{t.subject}</div>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3 whitespace-pre-line">{t.body}</p>
                <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>{t.sent.toLocaleString()} sent</span>
                  <span className="text-success font-semibold">{replyRate(t).toFixed(1)}% reply</span>
                </div>
              </button>
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditor({ mode: "edit", tpl: t })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {editor && (
        <ScriptEditorDialog
          mode={editor.mode}
          initial={editor.tpl}
          clients={clients}
          onClose={() => setEditor(null)}
          onSubmit={(values) => {
            if (editor.mode === "add") {
              addScript(values);
              toast.success("Script created");
            } else if (editor.tpl) {
              updateScript(editor.tpl.id, values);
              toast.success("Script updated");
            }
            setEditor(null);
          }}
        />
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this script?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteTpl ? (
                <>
                  <strong>{confirmDeleteTpl.subject}</strong> ({confirmDeleteTpl.campaignName} · Step {confirmDeleteTpl.step}) for{" "}
                  {confirmDeleteTpl._clientName}. This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteId) {
                  deleteScript(confirmDeleteId);
                  toast.success("Script deleted");
                  if (selectedId === confirmDeleteId) setSelectedId(null);
                }
                setConfirmDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScriptEditorDialog({
  mode,
  initial,
  clients,
  onClose,
  onSubmit,
}: {
  mode: "add" | "edit";
  initial?: EmailTemplate;
  clients: { id: string; companyName: string }[];
  onClose: () => void;
  onSubmit: (values: ScriptInput) => void;
}) {
  const [form, setForm] = useState<ScriptInput>({
    clientId: initial?.clientId ?? clients[0]?.id ?? "",
    campaignName: initial?.campaignName ?? "",
    step: initial?.step ?? 1,
    subject: initial?.subject ?? "",
    body: initial?.body ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ScriptInput, string>>>({});

  const handleSubmit = () => {
    const result = scriptSchema.safeParse(form);
    if (!result.success) {
      const e: Partial<Record<keyof ScriptInput, string>> = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof ScriptInput;
        if (!e[k]) e[k] = issue.message;
      }
      setErrors(e);
      return;
    }
    onSubmit(result.data);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "New email script" : "Edit email script"}</DialogTitle>
          <DialogDescription>
            Use placeholders like <code>{`{{firstName}}`}</code>, <code>{`{{company}}`}</code>, <code>{`{{senderName}}`}</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Step</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.step}
                onChange={(e) => setForm({ ...form, step: Number(e.target.value) })}
              />
              {errors.step && <p className="text-xs text-destructive">{errors.step}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Campaign name</Label>
            <Input
              value={form.campaignName}
              maxLength={80}
              onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
              placeholder="e.g. Q4 Enterprise Push"
            />
            {errors.campaignName && <p className="text-xs text-destructive">{errors.campaignName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Subject line</Label>
            <Input
              value={form.subject}
              maxLength={160}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Quick question about {{company}}"
            />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Email body</Label>
            <Textarea
              value={form.body}
              maxLength={4000}
              rows={10}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Hi {{firstName}}, ..."
              className="font-mono text-sm"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{errors.body ?? " "}</span>
              <span className="tabular-nums">{form.body.length}/4000</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{mode === "add" ? "Create script" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateDetail({
  tpl,
  onBack,
  onEdit,
  onDelete,
}: {
  tpl: DecoratedTemplate;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to scripts
        </Button>
        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="outline" size="sm" onClick={onDelete} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

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
