import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrainCircuit, Pencil, Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { EmptyCard, PageIntro, SectionCard, StatCard, formatPortalDate } from "@/components/client-portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import {
  useAgentTrainingQuery,
  useCreateAgentTrainingEntryMutation,
  useUpdateAgentTrainingEntryMutation,
} from "@/lib/leads-api-hooks";
import type { AgentTrainingEntryRecord } from "@/lib/leads-api";

export const Route = createFileRoute("/agent-training")({
  head: () => ({ meta: [{ title: "Agent Training — Expert Technology Solutions" }] }),
  component: AgentTrainingPage,
});

const SECTION_ORDER = [
  { key: "tone", label: "Tone & Messaging" },
  { key: "service_info", label: "Services & Differentiators" },
  { key: "objection", label: "Common Objections" },
  { key: "reply_rule", label: "Reply Rules" },
  { key: "qualification_rule", label: "Qualification Rules" },
  { key: "do_not_say", label: "Do Not Say" },
  { key: "faq", label: "FAQs" },
  { key: "client_preference", label: "Client Preferences" },
  { key: "example_reply", label: "Example Replies" },
  { key: "campaign_learning", label: "Campaign Learnings" },
] as const;

type TrainingEditorState = {
  title: string;
  category: string;
  content: string;
  appliesTo: string;
  visibility: string;
  status: string;
};

function AgentTrainingPage() {
  const { user } = useApp();
  const trainingQuery = useAgentTrainingQuery();
  const createMutation = useCreateAgentTrainingEntryMutation();
  const updateMutation = useUpdateAgentTrainingEntryMutation();
  const isAdmin = user?.role === "intergrai_admin";
  const canEdit = ["client_owner", "manager", "sales_user", "intergrai_admin"].includes(user?.role || "");
  const [form, setForm] = useState({
    category: "tone",
    title: "",
    content: "",
    visibility: "client_visible",
    applies_to: "outreach",
  });
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<TrainingEditorState | null>(null);

  const groupedEntries = useMemo(() => {
    const buckets = new Map<string, AgentTrainingEntryRecord[]>();
    for (const section of SECTION_ORDER) {
      buckets.set(section.key, []);
    }

    for (const entry of trainingQuery.data || []) {
      const group = buckets.get(entry.category) || [];
      group.push(entry);
      buckets.set(entry.category, group);
    }

    return buckets;
  }, [trainingQuery.data]);

  async function handleSubmit() {
    if (!form.content.trim()) return;

    try {
      await createMutation.mutateAsync({
        category: form.category,
        title: form.title.trim() || undefined,
        content: form.content.trim(),
        visibility: form.visibility,
        applies_to: form.applies_to,
      });
      setForm((current) => ({ ...current, title: "", content: "" }));
      toast.success("Training entry saved.");
      await trainingQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that training entry.");
    }
  }

  function startEditing(entry: AgentTrainingEntryRecord) {
    setEditingEntryId(entry.id);
    setEditingDraft({
      title: entry.title || "",
      category: entry.category,
      content: entry.content,
      appliesTo: entry.appliesTo,
      visibility: entry.visibility,
      status: entry.status,
    });
  }

  function cancelEditing() {
    setEditingEntryId(null);
    setEditingDraft(null);
  }

  async function saveEntry(entry: AgentTrainingEntryRecord) {
    if (!editingDraft) return;

    try {
      await updateMutation.mutateAsync({
        entryId: entry.id,
        input: {
          title: editingDraft.title.trim(),
          category: editingDraft.category,
          content: editingDraft.content.trim(),
          applies_to: editingDraft.appliesTo,
          visibility: isAdmin ? editingDraft.visibility : undefined,
          status: isAdmin ? editingDraft.status : undefined,
        },
      });
      toast.success("Training entry updated.");
      cancelEditing();
      await trainingQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that training entry.");
    }
  }

  async function archiveEntry(entry: AgentTrainingEntryRecord) {
    try {
      await updateMutation.mutateAsync({
        entryId: entry.id,
        input: { status: "archived" },
      });
      toast.success("Training entry archived.");
      if (editingEntryId === entry.id) {
        cancelEditing();
      }
      await trainingQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive that training entry.");
    }
  }

  if (trainingQuery.isLoading && !trainingQuery.data) {
    return (
      <div className="mx-auto max-w-[1320px] space-y-6">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-72 rounded-[28px]" />
        <Skeleton className="h-[620px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageIntro
        badge="Agent Training"
        title="What should the agent know when replying?"
        description="Add and edit guidance about tone, objections, services, and reply rules so the system drafts better messages without exposing internal clutter."
        actions={(
          <Button variant="outline" className="gap-2" onClick={() => void trainingQuery.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Training entries" value={(trainingQuery.data || []).length} detail="Client-visible and admin-only notes for this workspace." />
        <StatCard label="Active" value={(trainingQuery.data || []).filter((entry) => entry.status === "active").length} detail="Active notes guide the system immediately." />
        <StatCard label="Draft" value={(trainingQuery.data || []).filter((entry) => entry.status === "draft").length} detail="Draft notes stay visible here until finalized." />
        <StatCard label="Archived" value={(trainingQuery.data || []).filter((entry) => entry.status === "archived").length} detail="Archived notes are kept for reference." />
      </div>

      <Card className="p-6 shadow-card">
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            Reply drafting stays rule-based by default. Active entries marked <span className="font-medium">Replies</span> or <span className="font-medium">All</span> are used to guide approval-gated reply drafts.
          </p>
        </div>

        <div className="mt-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Add a training note</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep notes simple and specific. Existing notes can be edited lower down on the page.
            </p>
          </div>
          <BrainCircuit className="h-5 w-5 text-primary" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Category</p>
            <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTION_ORDER.map((section) => (
                  <SelectItem key={section.key} value={section.key}>{section.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Applies to</p>
            <Select value={form.applies_to} onValueChange={(value) => setForm((current) => ({ ...current, applies_to: value }))}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outreach">Outreach</SelectItem>
                <SelectItem value="replies">Replies</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="reporting">Reporting</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Visibility</p>
            <Select value={form.visibility} onValueChange={(value) => setForm((current) => ({ ...current, visibility: value }))}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_visible">Client visible</SelectItem>
                {isAdmin ? <SelectItem value="internal_only">Internal only</SelectItem> : null}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Title</p>
            <Input
              className="mt-2"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Optional short label"
            />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Content</p>
          <Textarea
            className="mt-2 min-h-[160px] resize-y bg-background"
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            placeholder="Examples: keep the tone direct, do not overstate claims, mention proactive support before incident response..."
          />
        </div>

        <div className="mt-4">
          <Button className="gap-2" onClick={() => void handleSubmit()} disabled={!canEdit || createMutation.isPending || !form.content.trim()}>
            <Plus className="h-4 w-4" />
            Save training entry
          </Button>
        </div>
      </Card>

      {SECTION_ORDER.map((section) => (
        <SectionCard
          key={section.key}
          title={section.label}
          description={`${groupedEntries.get(section.key)?.length || 0} note${(groupedEntries.get(section.key)?.length || 0) === 1 ? "" : "s"} in this section.`}
        >
          {(groupedEntries.get(section.key) || []).length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {groupedEntries.get(section.key)!.map((entry) => {
                const editing = editingEntryId === entry.id && editingDraft;
                return (
                  <Card key={entry.id} className="rounded-[24px] border-border/70 p-5 shadow-none">
                    {editing ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Title</p>
                            <Input className="mt-2" value={editingDraft.title} onChange={(event) => setEditingDraft((current) => current ? { ...current, title: event.target.value } : current)} />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Category</p>
                            <Select value={editingDraft.category} onValueChange={(value) => setEditingDraft((current) => current ? { ...current, category: value } : current)}>
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SECTION_ORDER.map((item) => (
                                  <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Content</p>
                          <Textarea
                            className="mt-2 min-h-[180px]"
                            value={editingDraft.content}
                            onChange={(event) => setEditingDraft((current) => current ? { ...current, content: event.target.value } : current)}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Applies to</p>
                            <Select value={editingDraft.appliesTo} onValueChange={(value) => setEditingDraft((current) => current ? { ...current, appliesTo: value } : current)}>
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="outreach">Outreach</SelectItem>
                                <SelectItem value="replies">Replies</SelectItem>
                                <SelectItem value="qualification">Qualification</SelectItem>
                                <SelectItem value="reporting">Reporting</SelectItem>
                                <SelectItem value="all">All</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {isAdmin ? (
                            <>
                              <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Visibility</p>
                                <Select value={editingDraft.visibility} onValueChange={(value) => setEditingDraft((current) => current ? { ...current, visibility: value } : current)}>
                                  <SelectTrigger className="mt-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="client_visible">Client visible</SelectItem>
                                    <SelectItem value="internal_only">Internal only</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</p>
                                <Select value={editingDraft.status} onValueChange={(value) => setEditingDraft((current) => current ? { ...current, status: value } : current)}>
                                  <SelectTrigger className="mt-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => void saveEntry(entry)} disabled={updateMutation.isPending || !editingDraft.content.trim()}>
                            Save changes
                          </Button>
                          <Button variant="outline" onClick={cancelEditing}>
                            Cancel
                          </Button>
                          {entry.status !== "archived" ? (
                            <Button variant="outline" onClick={() => void archiveEntry(entry)} disabled={updateMutation.isPending}>
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                            {formatLabel(entry.category)}
                          </Badge>
                          <Badge variant="outline" className={entry.status === "archived" ? "border-border/70 bg-muted/10 text-muted-foreground" : "border-success/30 bg-success/10 text-success"}>
                            {formatLabel(entry.status)}
                          </Badge>
                          <Badge variant="outline" className="border-border/70 bg-background text-muted-foreground">
                            {formatLabel(entry.appliesTo)}
                          </Badge>
                          {entry.visibility === "internal_only" ? (
                            <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                              Internal only
                            </Badge>
                          ) : null}
                        </div>

                        <h3 className="mt-3 text-lg font-semibold">{entry.title || section.label}</h3>
                        <p className="mt-3 text-sm leading-6 text-foreground">{entry.content}</p>

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Updated {formatPortalDate(entry.updatedAt || entry.createdAt)}</span>
                          <span>Source {formatLabel(entry.source)}</span>
                        </div>

                        {canEdit ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => startEditing(entry)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            {entry.status !== "archived" ? (
                              <Button variant="outline" size="sm" onClick={() => void archiveEntry(entry)} disabled={updateMutation.isPending}>
                                Archive
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyCard title="No notes here yet" description="Add a note when you want the agent to handle this area differently." />
          )}
        </SectionCard>
      ))}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}
