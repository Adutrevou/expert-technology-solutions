import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePreviewImportMutation, useCommitImportMutation } from "@/lib/contacts-import-api-hooks";
import { useSequencesQuery } from "@/lib/sequences-api-hooks";
import type { ImportPreviewResult } from "@/lib/contacts-import-api";

const SAMPLE_CSV = `Client Name,Email Address,Number,Business Name,Role
Jordan Lee,jordan.lee@example.co.za,+27 11 555 0100,Example Co,IT Manager
`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "expert-contacts-sample.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

const ROW_ACTION_LABEL: Record<
  string,
  { label: string; tone: "success" | "warning" | "muted" | "destructive" }
> = {
  create: { label: "New contact", tone: "success" },
  update: { label: "Update existing", tone: "success" },
  skip_duplicate_in_file: { label: "Duplicate in file", tone: "warning" },
  skip_suppressed: { label: "Suppressed", tone: "destructive" },
  invalid: { label: "Invalid", tone: "destructive" },
};

export function ImportContactsDialog({
  open,
  onOpenChange,
  onImported,
  initialSequenceId,
  lockSequence = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
  initialSequenceId?: string | null;
  lockSequence?: boolean;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [sequenceId, setSequenceId] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sequencesQuery = useSequencesQuery();
  const previewMutation = usePreviewImportMutation();
  const commitMutation = useCommitImportMutation();

  const eligibleSequences = (sequencesQuery.data ?? []).filter(
    (sequence) =>
      sequence.status === "active" ||
      (sequence.status === "draft" && sequence.metadata?.audience_type === "existing_clients"),
  );
  const selectedSequence = (sequencesQuery.data ?? []).find(
    (sequence) => sequence.id === sequenceId,
  );

  useEffect(() => {
    if (open) setSequenceId(initialSequenceId || "");
  }, [initialSequenceId, open]);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setSequenceId(initialSequenceId || "");
    setPreview(null);
    previewMutation.reset();
    commitMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handlePreview = async () => {
    if (!file) return;
    const result = await previewMutation.mutateAsync({ file, sequenceId: sequenceId || undefined });
    setPreview(result);
    setStep("preview");
  };

  const handleCommit = async () => {
    if (!preview) return;
    await commitMutation.mutateAsync({
      importId: preview.import_id,
      sequenceId: sequenceId || undefined,
    });
    setStep("done");
    onImported?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV, Excel (.xlsx), TSV, or text contact list. Preview validates every row
            before anything is created - nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-4">
              <div>
                <p className="text-sm font-medium">Need the column format?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Client Name, Email Address, Number, Business Name, Role
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCsv}
                className="gap-1.5 shrink-0"
              >
                <FileUp className="h-3.5 w-3.5" /> Sample CSV
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacts-file">Client database file</Label>
              <input
                ref={fileInputRef}
                id="contacts-file"
                type="file"
                accept=".csv,.xlsx,.tsv,.txt,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label>
                {lockSequence ? "Existing-client sequence" : "Enroll into sequence (optional)"}
              </Label>
              {lockSequence ? (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm font-medium">
                  {selectedSequence?.name || "Loading sequence..."}
                </div>
              ) : (
                <Select value={sequenceId} onValueChange={setSequenceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Don't enroll - just add contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleSequences.map((sequence) => (
                      <SelectItem key={sequence.id} value={sequence.id}>
                        {sequence.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {lockSequence ? (
                <p className="text-xs text-muted-foreground">
                  Contacts are prepared in this sequence only. No email sends until you click Go
                  live.
                </p>
              ) : eligibleSequences.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No active sequences yet - contacts can still be uploaded without enrollment.
                </p>
              ) : null}
            </div>

            {previewMutation.isError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Preview failed</AlertTitle>
                <AlertDescription>{(previewMutation.error as Error).message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {step === "preview" && preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <PreviewStat label="Total rows" value={preview.summary.total_rows} />
              <PreviewStat label="Valid" value={preview.summary.valid_rows} tone="success" />
              <PreviewStat
                label="Invalid"
                value={preview.summary.invalid_rows}
                tone="destructive"
              />
              <PreviewStat
                label="Duplicates"
                value={preview.summary.duplicate_rows}
                tone="warning"
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {preview.row_results.map((row) => {
                const meta = ROW_ACTION_LABEL[row.action] ?? {
                  label: row.action,
                  tone: "muted" as const,
                };
                return (
                  <div
                    key={row.row_number}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">Row {row.row_number}</span>
                    <div className="flex items-center gap-2">
                      {row.reason ? (
                        <span className="text-xs text-muted-foreground">{row.reason}</span>
                      ) : null}
                      <Badge variant="outline" className={badgeToneClass(meta.tone)}>
                        {meta.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {commitMutation.isError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Import failed</AlertTitle>
                <AlertDescription>{(commitMutation.error as Error).message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {step === "done" && commitMutation.data ? (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-success" />
            <div>
              <p className="font-medium">Import complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                {commitMutation.data.contacts_created} created,{" "}
                {commitMutation.data.contacts_updated} updated
                {commitMutation.data.enrolled_count > 0
                  ? `, ${commitMutation.data.enrolled_count} enrolled`
                  : ""}
                .
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {step === "upload" ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!file || previewMutation.isPending}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />{" "}
                {previewMutation.isPending ? "Validating..." : "Preview"}
              </Button>
            </>
          ) : null}
          {step === "preview" ? (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleCommit}
                disabled={commitMutation.isPending || preview?.summary.valid_rows === 0}
              >
                {commitMutation.isPending
                  ? "Importing..."
                  : `Import ${preview?.summary.valid_rows ?? 0} contacts`}
              </Button>
            </>
          ) : null}
          {step === "done" ? <Button onClick={() => handleClose(false)}>Done</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning-foreground"
          : "";
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function badgeToneClass(tone: "success" | "warning" | "muted" | "destructive") {
  switch (tone) {
    case "success":
      return "bg-success/15 text-success border-success/30 text-[10px]";
    case "warning":
      return "bg-warning/15 text-warning-foreground border-warning/40 text-[10px]";
    case "destructive":
      return "bg-destructive/15 text-destructive border-destructive/30 text-[10px]";
    default:
      return "bg-muted text-muted-foreground text-[10px]";
  }
}
