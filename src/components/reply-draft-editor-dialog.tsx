import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPortalDate } from "@/components/client-portal";
import type { ConversationRecord, ReplyDraftRecord } from "@/lib/leads-api";

interface ReplyDraftEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationRecord | null;
  draft: ReplyDraftRecord | null;
  busy?: boolean;
  title?: string;
  description?: string;
  saveLabel?: string;
  onSave: (input: { draftSubject: string; draftBody: string }) => Promise<void> | void;
}

export function ReplyDraftEditorDialog({
  open,
  onOpenChange,
  conversation,
  draft,
  busy = false,
  title = "Edit reply draft",
  description = "Review the reply, make any changes, and return it to approval-gated review.",
  saveLabel = "Save draft",
  onSave,
}: ReplyDraftEditorDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open || !draft) {
      return;
    }
    setSubject(draft.draftSubject || "");
    setBody(draft.draftBody || "");
  }, [draft, open]);

  const context = useMemo(() => {
    const messages = conversation?.messages || [];
    const inboundMessages = messages.filter((message) => message.direction === "inbound");
    const latestInbound = inboundMessages[inboundMessages.length - 1] || null;
    const trainingNotes = (draft?.trainingContextUsed || [])
      .map((entry) => String(entry.title || entry.category || entry.name || "").trim())
      .filter(Boolean)
      .slice(0, 4);
    const generatedReason = String(draft?.metadata?.action_recommended || draft?.metadata?.reply_category || "Generated from the latest inbound reply and reply rules.");

    return {
      companyName: conversation?.companyName || "Unknown company",
      contactName: conversation?.contactName || conversation?.contactEmail || "Decision-maker not verified yet",
      campaignName: conversation?.campaignName || "No linked campaign",
      replySummary: latestInbound ? summarizeReply(latestInbound.subject, latestInbound.bodyText) : "No inbound reply captured.",
      generatedReason,
      trainingSummary: trainingNotes.length ? trainingNotes.join(" · ") : "Reply rules and training notes",
      latestInboundAt: latestInbound?.receivedAt || latestInbound?.createdAt || null,
    };
  }, [conversation, draft]);

  async function handleSave() {
    await onSave({ draftSubject: subject, draftBody: body });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoField label="Company" value={context.companyName} />
            <InfoField label="Contact" value={context.contactName} />
            <InfoField label="Campaign" value={context.campaignName} />
            <InfoField label="Draft status" value={friendlyReplyStatus(draft?.status || "")} />
          </div>

          <div className="rounded-[22px] border border-border/70 bg-muted/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Why this draft exists</p>
            <p className="mt-2 text-sm text-foreground">{context.generatedReason}</p>
            <p className="mt-3 text-xs text-muted-foreground">Training / rule context: {context.trainingSummary}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-border/70 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Inbound reply</p>
              <p className="mt-2 text-sm font-medium">{context.replySummary}</p>
              {context.latestInboundAt ? (
                <p className="mt-2 text-xs text-muted-foreground">{formatPortalDate(context.latestInboundAt)}</p>
              ) : null}
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Draft preview</p>
              <p className="mt-2 text-sm font-medium">{subject || "No subject yet"}</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{body || "No draft body yet."}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                className="mt-2"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Reply subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reply body</label>
              <Textarea
                className="mt-2 min-h-[220px]"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Reply body"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={busy}>
            {busy ? "Saving..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function summarizeReply(subject?: string, body?: string) {
  const cleanedSubject = String(subject || "").trim();
  const cleanedBody = String(body || "")
    .replace(/\s+/g, " ")
    .trim();
  const excerpt = cleanedBody.split(/(?<=[.!?])\s+/)[0] || cleanedBody;
  if (cleanedSubject && excerpt) return `${cleanedSubject} · ${excerpt.slice(0, 160)}`;
  if (cleanedSubject) return cleanedSubject;
  if (excerpt) return excerpt.slice(0, 180);
  return "Inbound reply received.";
}

function friendlyReplyStatus(value: string) {
  switch ((value || "").toLowerCase()) {
    case "waiting_for_approval":
      return "Needs approval";
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes requested";
    case "sent":
      return "Sent";
    case "drafted":
      return "Drafted";
    default:
      return value ? value.replace(/_/g, " ") : "Unknown";
  }
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border/70 bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
