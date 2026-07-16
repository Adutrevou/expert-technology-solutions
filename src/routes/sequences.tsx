import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FlaskConical,
  Mail,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  Send,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users2,
  X,
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
import { getLeads, type LeadRecord } from "@/lib/leads-api";
import { readSignatureHtmlFile } from "@/lib/signature-html";
import {
  useCampaignsQuery,
  useLeadAgentSummaryQuery,
  useUpdateCampaignImageSettingsMutation,
  useUploadOutreachAssetMutation,
} from "@/lib/leads-api-hooks";
import {
  useArchiveSequenceMutation,
  useCreateSequenceTestRunMutation,
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
  useSequenceTestRunQuery,
  useSequenceTestRunsQuery,
  useSequencesQuery,
  useSendSequenceTestRunMutation,
  useUpdateSequenceMutation,
  useUpdateSequenceStepMutation,
} from "@/lib/sequences-api-hooks";
import type {
  EnrollmentRecord,
  SendingMode,
  SequenceRecord,
  SequenceStatus,
  SequenceStepRecord,
  SequenceTestRunRecord,
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

const TEST_RUN_STATUS_LABEL: Record<SequenceTestRunRecord["status"], string> = {
  preview_ready: "Preview ready",
  sending: "Sending",
  partially_sent: "Partially sent",
  sent: "Sent",
  failed: "Needs attention",
};

const TEST_RUN_STATUS_STYLE: Record<SequenceTestRunRecord["status"], string> = {
  preview_ready: "bg-primary/10 text-primary border-primary/25",
  sending: "bg-warning/15 text-warning-foreground border-warning/40",
  partially_sent: "bg-warning/15 text-warning-foreground border-warning/40",
  sent: "bg-success/15 text-success border-success/30",
  failed: "bg-destructive/10 text-destructive border-destructive/25",
};

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

const WEEKS_OF_MONTH = [1, 2, 3, 4] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function SequencesPage() {
  const sequencesQuery = useSequencesQuery();
  const testRunsQuery = useSequenceTestRunsQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTestRunId, setSelectedTestRunId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const sequences = useMemo(() => sequencesQuery.data ?? [], [sequencesQuery.data]);
  const testRuns = testRunsQuery.data ?? [];

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
          <Button onClick={() => setTestOpen(true)} variant="outline" className="gap-2">
            <FlaskConical className="h-4 w-4" /> Test sequence
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
            <div className="border-y border-border bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <FlaskConical className="h-3.5 w-3.5 text-primary" /> Test runs
                </span>
                <Badge variant="outline">{testRuns.length}</Badge>
              </div>
            </div>
            {testRunsQuery.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : testRuns.length ? (
              <div className="divide-y divide-border">
                {testRuns.map((run) => (
                  <TestRunListItem
                    key={run.id}
                    run={run}
                    onClick={() => setSelectedTestRunId(run.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                Saved previews and test sends will appear here.
              </p>
            )}
          </Card>

          {selectedId ? <SequenceDetailPanel sequenceId={selectedId} /> : null}
        </div>
      )}

      <CreateSequenceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedId(id)}
      />
      <TestSequenceDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        sequences={sequences}
        initialSequenceId={selectedId}
      />
      <TestRunDetailDialog
        runId={selectedTestRunId}
        open={Boolean(selectedTestRunId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedTestRunId(null);
        }}
      />
    </div>
  );
}

function TestRunListItem({ run, onClick }: { run: SequenceTestRunRecord; onClick: () => void }) {
  const progress = run.total_messages
    ? Math.round(((run.sent_count + run.failed_count) / run.total_messages) * 100)
    : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 text-left transition-smooth hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{run.sequence_name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {run.recipient_count} recipient{run.recipient_count === 1 ? "" : "s"} | {run.sent_count}
            /{run.total_messages} sent
          </p>
        </div>
        <Badge
          variant="outline"
          className={`${TEST_RUN_STATUS_STYLE[run.status]} shrink-0 text-[10px]`}
        >
          {TEST_RUN_STATUS_LABEL[run.status]}
        </Badge>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {formatDistanceToNow(new Date(run.updated_at), { addSuffix: true })}
      </p>
    </button>
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
  const [campaignId, setCampaignId] = useState("");
  const [sendingMode, setSendingMode] = useState<SendingMode>("dry_run");
  const createMutation = useCreateSequenceMutation();
  const campaignsQuery = useCampaignsQuery();
  const campaigns = (campaignsQuery.data?.campaigns ?? []).filter(
    (campaign) => campaign.status !== "archived",
  );

  useEffect(() => {
    if (open) {
      setName("");
      setCampaignId("");
      setSendingMode("dry_run");
      createMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const sequence = await createMutation.mutateAsync({
      name: name.trim(),
      campaign_id: campaignId || undefined,
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
            <Label>Campaign (optional)</Label>
            <Select
              value={campaignId || "__none__"}
              onValueChange={(value) => setCampaignId(value === "__none__" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No campaign - build manually</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Without a campaign, add every step manually. If linked, the campaign's outreach email
              becomes Step 1 and manual steps move forward.
            </p>
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

type PreviewRecipient = {
  id: string;
  name: string;
  company: string;
  email: string;
};

function TestSequenceDialog({
  open,
  onOpenChange,
  sequences,
  initialSequenceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequences: SequenceRecord[];
  initialSequenceId: string | null;
}) {
  const campaignsQuery = useCampaignsQuery();
  const [campaignId, setCampaignId] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("Expert Technology Solutions");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipients, setRecipients] = useState<PreviewRecipient[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [savedRun, setSavedRun] = useState<SequenceTestRunRecord | null>(null);
  const createTestRun = useCreateSequenceTestRunMutation();
  const deferredSearch = useDeferredValue(recipientSearch.trim());
  const sequenceQuery = useSequenceQuery(sequenceId || undefined);
  const campaigns = campaignsQuery.data?.campaigns ?? [];
  const campaignSequences = sequences.filter((sequence) => sequence.campaign_id === campaignId);

  const contactsQuery = useQuery({
    queryKey: ["intergrai", "sequence-preview-contacts", campaignId, deferredSearch],
    queryFn: () =>
      getLeads({
        campaign_id: campaignId,
        search: deferredSearch,
        limit: 8,
      }),
    enabled: open && Boolean(campaignId) && deferredSearch.length >= 2,
    staleTime: 15_000,
  });
  const suggestions = (contactsQuery.data?.leads ?? []) as LeadRecord[];

  useEffect(() => {
    if (!open) return;
    const initialSequence = sequences.find((sequence) => sequence.id === initialSequenceId);
    const firstLinkedSequence = initialSequence?.campaign_id
      ? initialSequence
      : sequences.find((sequence) => sequence.campaign_id);
    setSequenceId(firstLinkedSequence?.id ?? "");
    setCampaignId(firstLinkedSequence?.campaign_id ?? "");
    setRecipients([]);
    setRecipientName("");
    setRecipientCompany("Expert Technology Solutions");
    setRecipientSearch("");
    setPreviewVisible(false);
    setSavedRun(null);
  }, [initialSequenceId, open, sequences]);

  const addRecipient = (recipient: Omit<PreviewRecipient, "id"> & { id?: string }) => {
    const email = recipient.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid recipient email address.");
      return;
    }
    if (recipients.some((item) => item.email.toLowerCase() === email)) {
      toast.error("That recipient is already in this test.");
      return;
    }
    if (recipients.length >= 5) {
      toast.error("A test run is limited to 5 recipients.");
      return;
    }
    setRecipients((current) => [
      ...current,
      {
        id: recipient.id || `manual-${email}`,
        name: recipient.name.trim() || email.split("@")[0],
        company: recipient.company.trim() || "Expert Technology Solutions",
        email,
      },
    ]);
    setRecipientName("");
    setRecipientSearch("");
    setPreviewVisible(false);
    setSavedRun(null);
  };

  const selectCampaign = (value: string) => {
    setCampaignId(value);
    const firstSequence = sequences.find((sequence) => sequence.campaign_id === value);
    setSequenceId(firstSequence?.id ?? "");
    setRecipients([]);
    setPreviewVisible(false);
    setSavedRun(null);
  };

  const steps = sequenceQuery.data?.steps ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" /> Test a sequence
          </DialogTitle>
          <DialogDescription>
            Save a preview, then optionally send one step or the full sequence to up to five test
            recipients. Tests never create campaign enrollments or outreach queue records.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Campaign</Label>
            <Select value={campaignId} onValueChange={selectCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Select an Expert campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sequence</Label>
            <Select
              value={sequenceId}
              onValueChange={(value) => {
                setSequenceId(value);
                setPreviewVisible(false);
                setSavedRun(null);
              }}
              disabled={!campaignId || campaignSequences.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a linked sequence" />
              </SelectTrigger>
              <SelectContent>
                {campaignSequences.map((sequence) => (
                  <SelectItem key={sequence.id} value={sequence.id}>
                    {sequence.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <section className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Test recipients</h3>
              <p className="text-xs text-muted-foreground">
                Start typing a campaign contact or add a manual test address.
              </p>
            </div>
            <Badge variant="outline">sequence_preview / test_only</Badge>
          </div>

          {recipients.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {recipients.map((recipient) => (
                <span
                  key={recipient.id}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
                >
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{recipient.name}</span>
                  <span className="text-muted-foreground">{recipient.email}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${recipient.email}`}
                    onClick={() => {
                      setRecipients((current) =>
                        current.filter((item) => item.id !== recipient.id),
                      );
                      setPreviewVisible(false);
                      setSavedRun(null);
                    }}
                    className="rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="test-recipient-name">Name</Label>
              <Input
                id="test-recipient-name"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-recipient-company">Company</Label>
              <Input
                id="test-recipient-company"
                value={recipientCompany}
                onChange={(event) => setRecipientCompany(event.target.value)}
                placeholder="Expert Technology Solutions"
              />
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="test-recipient-email">Email or campaign contact</Label>
              <Input
                id="test-recipient-email"
                value={recipientSearch}
                onChange={(event) => setRecipientSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && recipientSearch.trim()) {
                    event.preventDefault();
                    addRecipient({
                      name: recipientName,
                      company: recipientCompany,
                      email: recipientSearch,
                    });
                  }
                }}
                placeholder="client@example.com"
                autoComplete="off"
              />
              {deferredSearch.length >= 2 && suggestions.length ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg">
                  {suggestions.map((lead) => (
                    <button
                      type="button"
                      key={lead.id}
                      onClick={() =>
                        addRecipient({
                          id: lead.id,
                          name: lead.displayContactName || lead.name,
                          company: lead.company,
                          email: lead.email,
                        })
                      }
                      className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {lead.displayContactName || lead.name || "Unnamed contact"}
                        </span>
                        <span className="block text-xs text-muted-foreground">{lead.company}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{lead.email}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() =>
                  addRecipient({
                    name: recipientName,
                    company: recipientCompany,
                    email: recipientSearch,
                  })
                }
                disabled={!recipientSearch.trim()}
              >
                <UserPlus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </section>

        {previewVisible ? (
          <SequencePreviewCards
            recipients={recipients}
            steps={steps}
            campaignName={campaigns.find((campaign) => campaign.id === campaignId)?.name || ""}
            sequenceName={sequenceQuery.data?.sequence.name || ""}
          />
        ) : null}

        {savedRun ? (
          <section className="rounded-2xl border border-success/30 bg-success/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Test saved to the list</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Previewing does not send anything. Choose an option below only when you are ready.
                </p>
              </div>
              <Badge variant="outline" className={TEST_RUN_STATUS_STYLE[savedRun.status]}>
                {TEST_RUN_STATUS_LABEL[savedRun.status]}
              </Badge>
            </div>
            <TestSendControls run={savedRun} onSent={setSavedRun} />
          </section>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="gap-2"
            onClick={async () => {
              try {
                const run = await createTestRun.mutateAsync({
                  sequenceId,
                  recipients: recipients.map(({ name, company, email }) => ({
                    name,
                    company,
                    email,
                  })),
                });
                setSavedRun(run);
                setPreviewVisible(true);
                toast.success("Test preview saved. It is now visible in Test runs.");
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Unable to save this test preview.",
                );
              }
            }}
            disabled={
              !sequenceId ||
              !recipients.length ||
              sequenceQuery.isLoading ||
              !steps.length ||
              createTestRun.isPending
            }
          >
            <FlaskConical className="h-4 w-4" />
            {createTestRun.isPending ? "Saving preview..." : "Save test preview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SequencePreviewCards({
  recipients,
  steps,
  campaignName,
  sequenceName,
}: {
  recipients: PreviewRecipient[];
  steps: SequenceStepRecord[];
  campaignName: string;
  sequenceName: string;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{sequenceName}</h3>
          <p className="text-sm text-muted-foreground">
            {campaignName} | {recipients.length} test recipient{recipients.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
          sequence_preview / test_only
        </Badge>
      </div>
      {recipients.map((recipient) => (
        <div key={recipient.id} className="space-y-3 rounded-xl border bg-background p-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <DetailLine label="Name" value={recipient.name} />
            <DetailLine label="Company" value={recipient.company} />
            <DetailLine label="Email" value={recipient.email} />
            <DetailLine label="Campaign" value={campaignName} />
            <DetailLine label="Status" value="sequence_preview / test_only" />
          </div>
          <div className="space-y-3">
            {[...steps]
              .filter((step) => step.status === "active")
              .sort((a, b) => a.step_number - b.step_number)
              .map((step) => {
                const variables = {
                  first_name: recipient.name.split(" ")[0],
                  contact_name: recipient.name,
                  company_name: recipient.company,
                  company: recipient.company,
                  email: recipient.email,
                };
                return (
                  <article key={step.id} className="rounded-xl border bg-muted/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Step {step.step_number}</Badge>
                        <span className="text-xs font-medium text-primary">
                          {scheduleLabel(step)}
                        </span>
                      </div>
                      <Badge variant="secondary">test_only</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold">
                      {renderPreviewTemplate(step.subject_template || "(No subject)", variables)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {renderPreviewTemplate(step.body_template, variables)}
                    </p>
                    {step.signature ? (
                      <div className="mt-3 border-t pt-3">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Email signature
                        </p>
                        <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                          {renderPreviewTemplate(step.signature, variables)}
                        </p>
                      </div>
                    ) : null}
                    {step.image_asset_id ? (
                      <Badge variant="secondary" className="mt-3">
                        Campaign image attached
                      </Badge>
                    ) : null}
                  </article>
                );
              })}
          </div>
        </div>
      ))}
    </section>
  );
}

function TestSendControls({
  run,
  onSent,
}: {
  run: SequenceTestRunRecord;
  onSent: (run: SequenceTestRunRecord) => void;
}) {
  const messages = run.messages ?? [];
  const stepNumbers = [...new Set(messages.map((message) => message.step_number))].sort(
    (left, right) => left - right,
  );
  const [stepNumber, setStepNumber] = useState(String(stepNumbers[0] ?? 1));
  const [sendMode, setSendMode] = useState<"single_step" | "full_sequence">("single_step");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sendTest = useSendSequenceTestRunMutation();
  const selectedCount = messages.filter(
    (message) =>
      message.status !== "sent" &&
      (sendMode === "full_sequence" || message.step_number === Number(stepNumber)),
  ).length;

  const openConfirmation = (mode: "single_step" | "full_sequence") => {
    setSendMode(mode);
    setConfirmOpen(true);
  };

  const send = async () => {
    try {
      const updated = await sendTest.mutateAsync({
        runId: run.id,
        input:
          sendMode === "full_sequence"
            ? { mode: "full_sequence" }
            : { mode: "single_step", step_number: Number(stepNumber) },
      });
      setConfirmOpen(false);
      onSent(updated);
      toast.success(
        sendMode === "full_sequence"
          ? "Full test sequence sent."
          : `Test email for Step ${stepNumber} sent.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send this test.");
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_auto_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Single email</Label>
          <Select value={stepNumber} onValueChange={setStepNumber}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stepNumbers.map((number) => (
                <SelectItem key={number} value={String(number)}>
                  Step {number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={
            !messages.some(
              (message) => message.step_number === Number(stepNumber) && message.status !== "sent",
            )
          }
          onClick={() => openConfirmation("single_step")}
        >
          <Mail className="h-4 w-4" /> Send selected email
        </Button>
        <Button
          type="button"
          className="gap-2"
          disabled={!messages.some((message) => message.status !== "sent")}
          onClick={() => openConfirmation("full_sequence")}
        >
          <Send className="h-4 w-4" /> Send full test sequence
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Full sequence sends every unsent step immediately as separate emails, ignoring the live
        calendar schedule so you can inspect the complete experience now.
      </p>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {sendMode === "full_sequence"
                ? "Send the full test sequence?"
                : "Send this test email?"}
            </DialogTitle>
            <DialogDescription>
              This will send {selectedCount} real email{selectedCount === 1 ? "" : "s"} now to the
              test recipients. Every subject is prefixed with [TEST], and no campaign contacts are
              enrolled.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <FlaskConical className="h-4 w-4" />
            <AlertTitle>Test-only delivery</AlertTitle>
            <AlertDescription>
              {run.recipient_count} recipient{run.recipient_count === 1 ? "" : "s"} |{" "}
              {run.sequence_name}
              {sendMode === "single_step" ? ` | Step ${stepNumber}` : " | All unsent steps"}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={sendTest.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={send}
              disabled={sendTest.isPending || selectedCount === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendTest.isPending
                ? "Sending..."
                : `Send ${selectedCount} test email${selectedCount === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TestRunDetailDialog({
  runId,
  open,
  onOpenChange,
}: {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const runQuery = useSequenceTestRunQuery(runId || undefined);
  const [latestRun, setLatestRun] = useState<SequenceTestRunRecord | null>(null);
  useEffect(() => {
    if (runQuery.data) setLatestRun(runQuery.data);
  }, [runQuery.data]);
  useEffect(() => {
    if (!open) setLatestRun(null);
  }, [open]);
  const run = latestRun ?? runQuery.data;
  const progress = run?.total_messages
    ? Math.round(((run.sent_count + run.failed_count) / run.total_messages) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" /> Test run details
          </DialogTitle>
          <DialogDescription>
            Review delivery progress, inspect each email, or send any remaining test messages.
          </DialogDescription>
        </DialogHeader>
        {runQuery.isLoading || !run ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{run.sequence_name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {run.campaign_name || "No campaign"} | Created{" "}
                    {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant="outline" className={TEST_RUN_STATUS_STYLE[run.status]}>
                  {TEST_RUN_STATUS_LABEL[run.status]}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <DetailLine label="Recipients" value={String(run.recipient_count)} />
                <DetailLine label="Emails" value={String(run.total_messages)} />
                <DetailLine label="Sent" value={String(run.sent_count)} />
                <DetailLine label="Failed" value={String(run.failed_count)} />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              {run.last_error ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Latest delivery error</AlertTitle>
                  <AlertDescription>{run.last_error}</AlertDescription>
                </Alert>
              ) : null}
              <TestSendControls run={run} onSent={setLatestRun} />
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">Email status</h3>
              {(run.messages ?? []).map((message) => (
                <article key={message.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        Step {message.step_number}: {message.subject}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {message.recipient_name} &lt;{message.recipient_email}&gt;
                      </p>
                    </div>
                    <Badge
                      variant={message.status === "failed" ? "destructive" : "outline"}
                      className="capitalize"
                    >
                      {message.status}
                    </Badge>
                  </div>
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {message.body}
                  </p>
                  {message.error ? (
                    <p className="mt-2 text-xs text-destructive">{message.error}</p>
                  ) : null}
                </article>
              ))}
            </section>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function renderPreviewTemplate(template: string, variables: Record<string, string>) {
  return template.replace(
    /\{\{\s*([\w.]+)\s*\}\}/g,
    (match, key: string) => variables[key] ?? match,
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
  const campaignsQuery = useCampaignsQuery();
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

  const handleActivate = async () => {
    try {
      const activated = await resumeMutation.mutateAsync(sequenceId);
      if (activated.campaign_id) {
        toast.success(
          `Sequence activated: ${activated.enrolled_count ?? 0} new campaign contact${activated.enrolled_count === 1 ? "" : "s"} enrolled, ${activated.already_enrolled_count ?? 0} already enrolled.`,
        );
      } else {
        toast.success("Manual sequence activated. Add contacts through enrollment when ready.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to activate this sequence.");
    }
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
              onClick={() => void handleActivate()}
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
              <Label>Campaign</Label>
              <Select
                value={sequence.campaign_id || "__none__"}
                onValueChange={(value) =>
                  updateMutation.mutate({
                    sequenceId,
                    patch: { campaign_id: value === "__none__" ? null : value },
                  })
                }
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Choose a campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No campaign</SelectItem>
                  {(campaignsQuery.data?.campaigns ?? [])
                    .filter((campaign) => campaign.status !== "archived")
                    .map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing the campaign replaces Step 1 with that campaign's outreach email and
                changes which approved image assets are available. Activating the sequence finds
                eligible contacts assigned to this campaign and enrolls them at Step 1.
              </p>
            </div>

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
            <StepsBuilder sequenceId={sequenceId} campaignId={sequence.campaign_id} steps={steps} />
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

function StepsBuilder({
  sequenceId,
  campaignId,
  steps,
}: {
  sequenceId: string;
  campaignId: string | null;
  steps: SequenceStepRecord[];
}) {
  const createStepMutation = useCreateSequenceStepMutation();
  const updateStepMutation = useUpdateSequenceStepMutation();
  const deleteStepMutation = useDeleteSequenceStepMutation();
  const summaryQuery = useLeadAgentSummaryQuery();
  const uploadAssetMutation = useUploadOutreachAssetMutation();
  const updateCampaignImageSettingsMutation = useUpdateCampaignImageSettingsMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SequenceStepRecord | null>(null);
  const [stepNumber, setStepNumber] = useState("");
  const [sendWeekday, setSendWeekday] = useState("1");
  const [sendWeekOfMonth, setSendWeekOfMonth] = useState("1");
  const [sendMonth, setSendMonth] = useState("__every__");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [signature, setSignature] = useState("");
  const [imageAssetId, setImageAssetId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAltText, setImageAltText] = useState("");

  const nextStepNumber = steps.length ? Math.max(...steps.map((s) => s.step_number)) + 1 : 1;
  const campaign = summaryQuery.data?.campaigns.find((item) => item.id === campaignId);
  const availableAssets = (summaryQuery.data?.outreachAssets ?? []).filter(
    (asset) => asset.campaignId === campaignId && asset.status !== "archived",
  );

  useEffect(() => {
    if (!dialogOpen) return;
    setStepNumber(String(editingStep?.step_number ?? nextStepNumber));
    setSendWeekday(String(editingStep?.send_weekday ?? 1));
    setSendWeekOfMonth(String(editingStep?.send_week_of_month ?? 1));
    setSendMonth(editingStep?.send_month ? String(editingStep.send_month) : "__every__");
    setSubject(editingStep?.subject_template ?? "");
    setBody(editingStep?.body_template ?? "");
    setSignature(editingStep?.signature ?? "");
    setImageAssetId(editingStep?.image_asset_id ?? "");
    setImageFile(null);
    setImageAltText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editingStep]);

  const openAdd = () => {
    setEditingStep(null);
    setDialogOpen(true);
  };

  const openEdit = (step: SequenceStepRecord) => {
    setEditingStep(step);
    setDialogOpen(true);
  };

  const handleSaveStep = async () => {
    if (!body.trim()) return;
    let nextImageAssetId: string | null = imageAssetId || null;

    if (imageFile) {
      if (!campaignId) return;
      if (!campaign?.imagesEnabled) {
        await updateCampaignImageSettingsMutation.mutateAsync({
          campaignId,
          imagesEnabled: true,
        });
      }
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("campaign_id", campaignId);
      formData.append("title", `${campaign?.name || "Sequence"} step ${stepNumber} image`);
      formData.append("alt_text", imageAltText.trim());
      formData.append("placement", "inline");
      formData.append("status", "pending_approval");
      const asset = await uploadAssetMutation.mutateAsync(formData);
      nextImageAssetId = asset.id;
    }

    const content = {
      send_weekday: Number(sendWeekday),
      send_week_of_month: Number(sendWeekOfMonth),
      send_month: sendMonth === "__every__" ? null : Number(sendMonth),
      subject_template: subject.trim() || null,
      body_template: body.trim(),
      signature: signature.trim() || null,
      image_asset_id: nextImageAssetId,
    };

    if (editingStep) {
      await updateStepMutation.mutateAsync({
        sequenceId,
        stepId: editingStep.id,
        patch: content,
      });
    } else {
      await createStepMutation.mutateAsync({
        sequenceId,
        input: {
          step_number: Number(stepNumber),
          ...content,
        },
      });
    }
    setDialogOpen(false);
  };

  const saving =
    createStepMutation.isPending ||
    updateStepMutation.isPending ||
    uploadAssetMutation.isPending ||
    updateCampaignImageSettingsMutation.isPending;

  const mutationError =
    createStepMutation.error ||
    updateStepMutation.error ||
    uploadAssetMutation.error ||
    updateCampaignImageSettingsMutation.error;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Each step uses a month, week-of-month, and weekday calendar target. Add the subject, body,
          signature, and optional approved campaign image here.
        </p>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add step
        </Button>
      </div>

      {!campaignId ? (
        <Alert>
          <Plus className="h-4 w-4" />
          <AlertTitle>Manual sequence</AlertTitle>
          <AlertDescription>
            You can add and edit steps without a campaign. Campaign images become available after
            linking one in Overview.
          </AlertDescription>
        </Alert>
      ) : null}

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
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        Step {step.step_number}
                      </Badge>
                      <span className="text-xs font-medium text-primary">
                        {scheduleLabel(step)}
                      </span>
                      {step.image_asset_id ? <Badge variant="secondary">Image</Badge> : null}
                      {step.signature ? <Badge variant="secondary">Signature</Badge> : null}
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
                    {step.signature ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                        {step.signature}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(step)}
                      title="Edit step"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? `Edit step ${editingStep.step_number}` : `Add step ${nextStepNumber}`}
            </DialogTitle>
            <DialogDescription>
              Use {"{{first_name}}"}, {"{{company_name}}"}, {"{{contact_name}}"} as placeholders.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Step number</Label>
              <Input
                type="number"
                min={1}
                value={stepNumber}
                onChange={(event) => setStepNumber(event.target.value)}
                disabled={Boolean(editingStep)}
              />
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={sendMonth} onValueChange={setSendMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__every__">Every month</SelectItem>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={month} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Week of month</Label>
              <Select value={sendWeekOfMonth} onValueChange={setSendWeekOfMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKS_OF_MONTH.map((week) => (
                    <SelectItem key={week} value={String(week)}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Day of week</Label>
              <Select value={sendWeekday} onValueChange={setSendWeekday}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((weekday) => (
                    <SelectItem key={weekday.value} value={String(weekday.value)}>
                      {weekday.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Optional subject line"
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label>Body</Label>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="min-h-40"
                placeholder="Hi {{first_name}}, ..."
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label>Email signature</Label>
              <Textarea
                value={signature}
                onChange={(event) => setSignature(event.target.value)}
                className="min-h-24"
                placeholder="Kind regards,\nExpert Technology Solutions"
              />
              <Input
                type="file"
                accept=".html,.htm,text/html"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  void readSignatureHtmlFile(file)
                    .then((html) => {
                      setSignature(html);
                      toast.success("HTML signature loaded. Review it before saving the step.");
                    })
                    .catch((error) =>
                      toast.error(
                        error instanceof Error ? error.message : "Unable to read that HTML file.",
                      ),
                    );
                }}
              />
              <p className="text-xs text-muted-foreground">
                Paste a signature or upload an .html/.htm document up to 256KB.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Approved campaign image</Label>
              <Select
                value={imageAssetId || "__none__"}
                onValueChange={(value) => setImageAssetId(value === "__none__" ? "" : value)}
                disabled={!campaignId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No image" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No image</SelectItem>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Or upload a new image</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={!campaignId}
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              />
              {!campaignId ? (
                <p className="text-xs text-muted-foreground">
                  Link a campaign before uploading an image.
                </p>
              ) : null}
            </div>
            {imageFile ? (
              <div className="space-y-2 md:col-span-4">
                <Label>Image alt text</Label>
                <Input
                  value={imageAltText}
                  onChange={(event) => setImageAltText(event.target.value)}
                  placeholder="Describe what the image shows"
                />
              </div>
            ) : null}
          </div>
          {mutationError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not save this step</AlertTitle>
              <AlertDescription>{mutationError.message}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveStep}
              disabled={
                !body.trim() ||
                !sendWeekday ||
                !sendWeekOfMonth ||
                (Boolean(imageFile) && !imageAltText.trim()) ||
                saving
              }
            >
              {saving ? "Saving..." : editingStep ? "Save changes" : "Add step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function weekdayLabel(value: number | null) {
  if (!value) return "Weekday not set";
  return WEEKDAYS.find((weekday) => weekday.value === value)?.label || "Weekday not set";
}

function scheduleLabel(step: SequenceStepRecord) {
  const month = step.send_month ? MONTHS[step.send_month - 1] : "Every month";
  const week = step.send_week_of_month ? `week ${step.send_week_of_month}` : "any week";
  return `${month}, ${week}, ${weekdayLabel(step.send_weekday)}`;
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
  enrollments: EnrollmentRecord[];
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
  const completedEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === "completed",
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-success/30 bg-success/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Human takeover</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Contacts who completed the full sequence, ready for personal follow-up.
            </p>
          </div>
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
            {completedEnrollments.length} ready
          </Badge>
        </div>
        {completedEnrollments.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {completedEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-xl border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {enrollment.contact_name || "Contact name unavailable"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[enrollment.title, enrollment.company_name].filter(Boolean).join(" at ") ||
                        "Company details unavailable"}
                    </p>
                  </div>
                  <Badge className="bg-success/15 text-success hover:bg-success/15">
                    Ready for takeover
                  </Badge>
                </div>
                <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                  <ContactLink label="Email" value={enrollment.email} hrefPrefix="mailto:" />
                  <ContactLink label="Phone" value={enrollment.phone} hrefPrefix="tel:" />
                  <ContactLink label="Website" value={enrollment.website} external />
                  <ContactLink label="LinkedIn" value={enrollment.linkedin_url} external />
                  <DetailLine label="Industry" value={enrollment.industry} />
                  <DetailLine label="Location" value={enrollment.location} />
                  <DetailLine label="Source" value={enrollment.lead_source || enrollment.source} />
                  <DetailLine label="Qualification" value={enrollment.qualification} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No contacts have completed this sequence yet.
          </p>
        )}
      </section>

      <div>
        <h3 className="mb-3 font-semibold">All enrollments</h3>
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
      </div>
    </div>
  );
}

function ContactLink({
  label,
  value,
  hrefPrefix = "",
  external = false,
}: {
  label: string;
  value?: string;
  hrefPrefix?: string;
  external?: boolean;
}) {
  if (!value) return <DetailLine label={label} />;
  const href =
    external && !/^https?:\/\//i.test(value) ? `https://${value}` : `${hrefPrefix}${value}`;
  return (
    <p className="truncate">
      <span className="text-muted-foreground">{label}: </span>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="font-medium text-primary hover:underline"
      >
        {value}
      </a>
    </p>
  );
}

function DetailLine({ label, value }: { label: string; value?: string }) {
  return (
    <p className="truncate">
      <span className="text-muted-foreground">{label}: </span>
      <span>{value || "Not sourced"}</span>
    </p>
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
