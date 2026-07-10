import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  Users2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useApp } from "@/lib/app-state";
import {
  useArchiveSequenceMutation,
  useCreateSequenceMutation,
  useCreateSequenceStepMutation,
  useDeleteSequenceStepMutation,
  useDisqualifyEnrollmentMutation,
  useDryRunSequenceMutation,
  useEnrollmentsQuery,
  usePauseSequenceMutation,
  useResumeSequenceMutation,
  useRunSequenceOnceMutation,
  useSequenceMetricsQuery,
  useSequenceQuery,
  useSequencesQuery,
  useUpdateSequenceMutation,
  useUpdateSequenceStepMutation,
} from "@/lib/sequences-api-hooks";
import type {
  SendingMode,
  SequenceRecord,
  SequenceStatus,
  SequenceStepRecord,
} from "@/lib/sequences-api";

export const Route = createFileRoute("/sequences")({
  head: () => ({ meta: [{ title: "Sequences — Expert Technology Solutions" }] }),
  component: SequencesPage,
});

const SEQUENCE_STATUS_STYLE: Record<SequenceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/15 text-success border-success/30",
  paused: "bg-warning/15 text-warning-foreground border-warning/40",
  archived: "bg-muted text-muted-foreground",
};

const SENDING_MODE_LABEL: Record<SendingMode, string> = {
  dry_run: "Dry run (no send attempt at all)",
  queue_for_approval: "Queue for approval",
  auto_send_if_policy_allows: "Auto-send if policy allows",
};

function SequencesPage() {
  const sequencesQuery = useSequencesQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const sequences = useMemo(() => sequencesQuery.data ?? [], [sequencesQuery.data]);

  useEffect(() => {
    if (!sequences.length) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !sequences.some((s) => s.id === selectedId)) {
      setSelectedId(sequences[0].id);
    }
  }, [sequences, selectedId]);

  if (sequencesQuery.isLoading) {
    return <SequencesLoadingState />;
  }

  if (sequencesQuery.isError) {
    return (
      <Card className="max-w-[1400px] mx-auto p-10 text-center shadow-card">
        <h1 className="text-2xl font-semibold">Sequences unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(sequencesQuery.error as Error | undefined)?.message ||
            "We couldn't load sequences right now."}
        </p>
        <Button onClick={() => sequencesQuery.refetch()} variant="outline" className="mt-6">
          <RefreshCcw className="h-4 w-4 mr-2" /> Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-step follow-up sequences. Every sequence is dry-run/queued only until live sending
            is separately approved.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => sequencesQuery.refetch()} variant="outline" className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New sequence
          </Button>
        </div>
      </header>

      {sequences.length === 0 ? (
        <Card className="p-10 text-center shadow-card">
          <h2 className="text-xl font-semibold">No sequences yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first follow-up sequence to get started.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-6 gap-2">
            <Plus className="h-4 w-4" /> New sequence
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="overflow-hidden shadow-card">
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
              {sequences.length} sequence{sequences.length === 1 ? "" : "s"}
            </div>
            <div className="divide-y divide-border">
              {sequences.map((sequence) => (
                <button
                  key={sequence.id}
                  onClick={() => setSelectedId(sequence.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-smooth hover:bg-muted/40 ${selectedId === sequence.id ? "bg-muted/60" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{sequence.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {sequence.campaign_name || "No campaign"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`${SEQUENCE_STATUS_STYLE[sequence.status]} text-[10px] uppercase tracking-wide`}
                    >
                      {sequence.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {selectedId ? <SequenceDetailPanel sequenceId={selectedId} /> : null}
        </div>
      )}

      <CreateSequenceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedId(id)}
      />
    </div>
  );
}

function CreateSequenceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [sendingMode, setSendingMode] = useState<SendingMode>("dry_run");
  const createMutation = useCreateSequenceMutation();

  useEffect(() => {
    if (open) {
      setName("");
      setSendingMode("dry_run");
      createMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const sequence = await createMutation.mutateAsync({
      name: name.trim(),
      sending_mode: sendingMode,
    });
    onOpenChange(false);
    onCreated(sequence.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New sequence</DialogTitle>
          <DialogDescription>
            Sequences start as draft. Add steps, then activate when ready.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sequence-name">Name</Label>
            <Input
              id="sequence-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Managed IT Follow-up"
            />
          </div>
          <div className="space-y-2">
            <Label>Sending mode</Label>
            <Select
              value={sendingMode}
              onValueChange={(value) => setSendingMode(value as SendingMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dry_run">{SENDING_MODE_LABEL.dry_run}</SelectItem>
                <SelectItem value="queue_for_approval">
                  {SENDING_MODE_LABEL.queue_for_approval}
                </SelectItem>
                <SelectItem value="auto_send_if_policy_allows">
                  {SENDING_MODE_LABEL.auto_send_if_policy_allows}
                </SelectItem>
              </SelectContent>
            </Select>
            {sendingMode === "auto_send_if_policy_allows" ? <AutoSendWarning /> : null}
          </div>
          {createMutation.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not create sequence</AlertTitle>
              <AlertDescription>{(createMutation.error as Error).message}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AutoSendWarning() {
  return (
    <Alert className="border-warning/40 bg-warning/10">
      <ShieldAlert className="h-4 w-4 text-warning-foreground" />
      <AlertTitle className="text-warning-foreground text-sm">
        This does not enable live sending yet
      </AlertTitle>
      <AlertDescription className="text-xs">
        Auto-send is inert until separately approved after a safety proof. Every queued step is
        still dry-run regardless of this setting.
      </AlertDescription>
    </Alert>
  );
}

function SequenceDetailPanel({ sequenceId }: { sequenceId: string }) {
  const { user } = useApp();
  const isAdmin = user?.role === "intergrai_admin";
  const sequenceQuery = useSequenceQuery(sequenceId);
  const metricsQuery = useSequenceMetricsQuery(sequenceId);
  const enrollmentsQuery = useEnrollmentsQuery(sequenceId);
  const pauseMutation = usePauseSequenceMutation();
  const resumeMutation = useResumeSequenceMutation();
  const archiveMutation = useArchiveSequenceMutation();
  const updateMutation = useUpdateSequenceMutation();
  const dryRunMutation = useDryRunSequenceMutation();
  const runOnceMutation = useRunSequenceOnceMutation();
  const disqualifyMutation = useDisqualifyEnrollmentMutation();
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);
  const [runOnceConfirmOpen, setRunOnceConfirmOpen] = useState(false);

  if (sequenceQuery.isLoading) {
    return (
      <Card className="p-6 shadow-card">
        <Skeleton className="h-96" />
      </Card>
    );
  }

  if (sequenceQuery.isError || !sequenceQuery.data) {
    return (
      <Card className="p-6 shadow-card text-center">
        <p className="text-sm text-muted-foreground">Could not load this sequence.</p>
      </Card>
    );
  }

  const { sequence, steps } = sequenceQuery.data;

  const handleDryRun = async () => {
    const result = await dryRunMutation.mutateAsync(sequenceId);
    setDryRunResult(
      `${result.due_count} enrollment${result.due_count === 1 ? "" : "s"} would be processed right now.`,
    );
  };

  const handleRunOnce = async () => {
    setRunOnceConfirmOpen(false);
    await runOnceMutation.mutateAsync({ sequenceId });
  };

  return (
    <Card className="shadow-card">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{sequence.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sequence.last_run_at
                ? `Engine last ran ${formatDistanceToNow(new Date(sequence.last_run_at), { addSuffix: true })}`
                : "Engine has never run for this sequence yet"}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`${SEQUENCE_STATUS_STYLE[sequence.status]} uppercase text-[10px] tracking-wide`}
          >
            {sequence.status}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {sequence.status !== "active" ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => resumeMutation.mutate(sequenceId)}
              disabled={resumeMutation.isPending}
            >
              <Play className="h-3.5 w-3.5" /> Activate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => pauseMutation.mutate(sequenceId)}
              disabled={pauseMutation.isPending}
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          )}
          {sequence.status !== "archived" ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive"
              onClick={() => archiveMutation.mutate(sequenceId)}
              disabled={archiveMutation.isPending}
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </Button>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="enrollments">
              Enrollments ({enrollmentsQuery.data?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-2">
              <Label>Sending mode</Label>
              <Select
                value={sequence.sending_mode}
                onValueChange={(value) =>
                  updateMutation.mutate({
                    sequenceId,
                    patch: { sending_mode: value as SendingMode },
                  })
                }
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry_run">{SENDING_MODE_LABEL.dry_run}</SelectItem>
                  <SelectItem value="queue_for_approval">
                    {SENDING_MODE_LABEL.queue_for_approval}
                  </SelectItem>
                  <SelectItem value="auto_send_if_policy_allows">
                    {SENDING_MODE_LABEL.auto_send_if_policy_allows}
                  </SelectItem>
                </SelectContent>
              </Select>
              {sequence.sending_mode === "auto_send_if_policy_allows" ? <AutoSendWarning /> : null}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Run the engine
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Dry-run previews what would happen. Every step this engine ever queues is dry-run
                regardless of sending mode - it can never send a live email.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDryRun}
                  disabled={dryRunMutation.isPending}
                  className="gap-1.5"
                >
                  <Clock3 className="h-3.5 w-3.5" />{" "}
                  {dryRunMutation.isPending ? "Checking..." : "Dry run"}
                </Button>
                {isAdmin ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRunOnceConfirmOpen(true)}
                    disabled={runOnceMutation.isPending || sequence.status !== "active"}
                    className="gap-1.5"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />{" "}
                    {runOnceMutation.isPending ? "Running..." : "Run once (admin)"}
                  </Button>
                ) : null}
              </div>
              {dryRunResult ? <p className="mt-3 text-xs text-success">{dryRunResult}</p> : null}
              {runOnceMutation.isSuccess ? (
                <p className="mt-3 text-xs text-success">
                  Engine ran. Steps were queued as dry-run only - check the Enrollments tab.
                </p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="steps">
            <StepsBuilder sequenceId={sequenceId} steps={steps} />
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsPanel sequenceId={sequenceId} metricsQuery={metricsQuery} />
          </TabsContent>

          <TabsContent value="enrollments">
            <EnrollmentsTable
              enrollments={enrollmentsQuery.data ?? []}
              isLoading={enrollmentsQuery.isLoading}
              onDisqualify={(enrollmentId) =>
                disqualifyMutation.mutate({
                  sequenceId,
                  enrollmentId,
                  reason: "Manually disqualified from Sequences page",
                })
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={runOnceConfirmOpen} onOpenChange={setRunOnceConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run the sequence engine now?</DialogTitle>
            <DialogDescription>
              This processes due enrollments for real (not a preview). Every queued step is still
              dry-run - this can never send a live email. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunOnceConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRunOnce}>Run once</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StepsBuilder({ sequenceId, steps }: { sequenceId: string; steps: SequenceStepRecord[] }) {
  const createStepMutation = useCreateSequenceStepMutation();
  const updateStepMutation = useUpdateSequenceStepMutation();
  const deleteStepMutation = useDeleteSequenceStepMutation();
  const [addOpen, setAddOpen] = useState(false);
  const [stepNumber, setStepNumber] = useState("");
  const [delayDays, setDelayDays] = useState("0");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const nextStepNumber = steps.length ? Math.max(...steps.map((s) => s.step_number)) + 1 : 1;

  useEffect(() => {
    if (addOpen) {
      setStepNumber(String(nextStepNumber));
      setDelayDays(steps.length ? "4" : "0");
      setSubject("");
      setBody("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen]);

  const handleAddStep = async () => {
    if (!body.trim()) return;
    await createStepMutation.mutateAsync({
      sequenceId,
      input: {
        step_number: Number(stepNumber),
        delay_days: Number(delayDays),
        subject_template: subject.trim() || undefined,
        body_template: body.trim(),
      },
    });
    setAddOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Step 1 is the first touch (delay ignored). Later steps use their delay from the previous
          step.
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add step
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No steps yet. Add step 1 to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {[...steps]
            .sort((a, b) => a.step_number - b.step_number)
            .map((step) => (
              <Card key={step.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        Step {step.step_number}
                      </Badge>
                      {step.step_number > 1 ? (
                        <span className="text-xs text-muted-foreground">
                          +{step.delay_days}d after previous
                        </span>
                      ) : null}
                      {step.ai_personalization_enabled ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-primary/15 text-primary border-primary/30"
                        >
                          AI personalization
                        </Badge>
                      ) : null}
                    </div>
                    {step.subject_template ? (
                      <p className="mt-2 text-sm font-medium truncate">{step.subject_template}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {step.body_template}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        updateStepMutation.mutate({
                          sequenceId,
                          stepId: step.id,
                          patch: { status: step.status === "active" ? "inactive" : "active" },
                        })
                      }
                      title={step.status === "active" ? "Deactivate step" : "Activate step"}
                    >
                      {step.status === "active" ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteStepMutation.mutate({ sequenceId, stepId: step.id })}
                      title="Delete step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add step {nextStepNumber}</DialogTitle>
            <DialogDescription>
              Use {"{{first_name}}"}, {"{{company_name}}"}, {"{{contact_name}}"} as placeholders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Step number</Label>
                <Input
                  type="number"
                  min={1}
                  value={stepNumber}
                  onChange={(event) => setStepNumber(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Delay (days after previous)</Label>
                <Input
                  type="number"
                  min={0}
                  value={delayDays}
                  onChange={(event) => setDelayDays(event.target.value)}
                  disabled={Number(stepNumber) === 1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Optional subject line"
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="min-h-32"
                placeholder="Hi {{first_name}}, ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStep} disabled={!body.trim() || createStepMutation.isPending}>
              {createStepMutation.isPending ? "Saving..." : "Add step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricsPanel({
  metricsQuery,
}: {
  sequenceId: string;
  metricsQuery: ReturnType<typeof useSequenceMetricsQuery>;
}) {
  if (metricsQuery.isLoading) {
    return <Skeleton className="h-48" />;
  }
  if (metricsQuery.isError || !metricsQuery.data) {
    return <p className="text-sm text-muted-foreground">Metrics unavailable right now.</p>;
  }
  const m = metricsQuery.data;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <MetricStat label="Total enrolled" value={m.total_enrolled} />
        <MetricStat label="Active" value={m.active} />
        <MetricStat label="Completed" value={m.completed} />
        <MetricStat label="Replied" value={m.replied} />
        <MetricStat label="Bounced" value={m.bounced} />
        <MetricStat label="Unsubscribed" value={m.unsubscribed} />
        <MetricStat label="Disqualified" value={m.disqualified} />
        <MetricStat label="Reply rate" value={`${(m.reply_rate * 100).toFixed(1)}%`} />
        <MetricStat label="Bounce rate" value={`${(m.bounce_rate * 100).toFixed(1)}%`} />
        <MetricStat label="Next due" value={m.next_due_count} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricStat
          label="Opens"
          value={m.opens === null ? "Not tracked" : m.opens}
          note={m.opens === null ? "No open tracking exists on this platform yet" : undefined}
        />
        <MetricStat
          label="Clicks"
          value={m.clicks === null ? "Not tracked" : m.clicks}
          note={m.clicks === null ? "No click tracking exists on this platform yet" : undefined}
        />
      </div>
      {m.step_level.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Step-level breakdown
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Enrollments</TableHead>
                <TableHead>Send attempts</TableHead>
                <TableHead>Replies</TableHead>
                <TableHead>Bounces</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.step_level.map((row) => (
                <TableRow key={row.step_number}>
                  <TableCell>Step {row.step_number}</TableCell>
                  <TableCell>{row.enrollments}</TableCell>
                  <TableCell>{row.send_attempts}</TableCell>
                  <TableCell>{row.replies}</TableCell>
                  <TableCell>{row.bounces}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

function MetricStat({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-[10px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function EnrollmentsTable({
  enrollments,
  isLoading,
  onDisqualify,
}: {
  enrollments: Array<{
    id: string;
    company_name?: string;
    contact_name?: string;
    email?: string;
    current_step: number;
    status: string;
    next_due_at: string | null;
  }>;
  isLoading: boolean;
  onDisqualify: (enrollmentId: string) => void;
}) {
  if (isLoading) return <Skeleton className="h-48" />;
  if (enrollments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        <Users2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        No contacts enrolled yet. Enroll leads from the Leads page, or via a bulk contact upload.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Contact</TableHead>
          <TableHead>Step</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Next due</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enrollments.map((enrollment) => (
          <TableRow key={enrollment.id}>
            <TableCell>
              <p className="font-medium">
                {enrollment.contact_name || enrollment.company_name || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">{enrollment.email || "—"}</p>
            </TableCell>
            <TableCell>{enrollment.current_step}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px] uppercase">
                {enrollment.status}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {enrollment.next_due_at
                ? formatDistanceToNow(new Date(enrollment.next_due_at), { addSuffix: true })
                : "—"}
            </TableCell>
            <TableCell className="text-right">
              {!["disqualified", "completed", "replied", "bounced", "unsubscribed"].includes(
                enrollment.status,
              ) ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive gap-1.5"
                  onClick={() => onDisqualify(enrollment.id)}
                >
                  <Ban className="h-3.5 w-3.5" /> Disqualify
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SequencesLoadingState() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export type { SequenceRecord };
