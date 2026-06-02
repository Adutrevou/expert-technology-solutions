import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrainCircuit, Plus, RefreshCcw } from "lucide-react";
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
  { key: "do_not_say", label: "Do Not Say" },
  { key: "example_reply", label: "Example Replies" },
  { key: "campaign_learning", label: "Campaign Learnings" },
] as const;

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

  const handleSubmit = async () => {
    if (!form.content.trim()) return;
    await createMutation.mutateAsync({
      category: form.category,
      title: form.title.trim() || undefined,
      content: form.content.trim(),
      visibility: form.visibility,
      applies_to: form.applies_to,
    });
    setForm((current) => ({ ...current, title: "", content: "" }));
  };

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
      <header className="rounded-[28px] border border-border/70 bg-gradient-subtle px-6 py-6 shadow-card md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">Agent Training</Badge>
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Structured knowledge only</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Train the agent over time</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Store tone, objection handling, service guidance, do-not-say rules, and approved reply examples for both outreach and reply drafting.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => trainingQuery.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <Card className="p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Teach the agent something</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Client users can add client-visible notes. Intergrai admins can also add internal-only guidance.
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
                <SelectItem value="faq">FAQ</SelectItem>
                <SelectItem value="client_preference">Client Preference</SelectItem>
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
            <Select
              value={form.visibility}
              onValueChange={(value) => setForm((current) => ({ ...current, visibility: value }))}
            >
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
          <Button className="gap-2" onClick={handleSubmit} disabled={!canEdit || createMutation.isPending || !form.content.trim()}>
            <Plus className="h-4 w-4" />
            Save training entry
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {SECTION_ORDER.map((section) => (
          <Card key={section.key} className="p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{section.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {groupedEntries.get(section.key)?.length || 0} active notes
                </p>
              </div>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                {formatLabel(section.key)}
              </Badge>
            </div>

            <div className="mt-5 space-y-4">
              {(groupedEntries.get(section.key) || []).length ? (
                groupedEntries.get(section.key)!.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{entry.title || section.label}</p>
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
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
                    <p className="mt-3 text-sm leading-6 text-foreground">{entry.content}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Source {formatLabel(entry.source)}</span>
                      <span>Updated {formatDateTime(entry.updatedAt || entry.createdAt)}</span>
                    </div>
                    {canEdit ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.status !== "archived" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({ entryId: entry.id, status: "archived" })}
                            disabled={updateMutation.isPending}
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-10 text-center text-sm text-muted-foreground">
                  No notes added in this section yet.
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
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

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
