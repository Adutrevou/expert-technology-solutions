import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Lock, Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { EmptyCard, PageIntro, SafetyBanner, SectionCard, StatCard, StatusMessage, formatPortalDate } from "@/components/client-portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-state";
import {
  useCreateResponseRuleMutation,
  useLeadAgentSummaryQuery,
  useResponseRulesQuery,
  useUpdateResponseRuleMutation,
} from "@/lib/leads-api-hooks";
import type { ResponseRuleCategoryRecord, ResponseRuleRecord } from "@/lib/leads-api";

export const Route = createFileRoute("/responses-rules")({
  head: () => ({ meta: [{ title: "Responses + Rules — Expert Technology Solutions" }] }),
  component: ResponsesRulesPage,
});

type RuleSectionKey = "general" | "campaign" | "variant" | "manual" | "auto";

type RuleEditorState = {
  open: boolean;
  mode: "create" | "edit";
  section: RuleSectionKey;
  rule: ResponseRuleRecord | null;
  form: RuleFormState;
};

type RuleFormState = {
  name: string;
  description: string;
  category: string;
  actionType: string;
  campaignId: string;
  campaignVariantId: string;
  triggerPhrases: string;
  replyTemplateSubject: string;
  replyTemplateBody: string;
  requiresApproval: string;
  manualReplyRequired: string;
  draftReplyEnabled: string;
  autoReplyDelayMode: string;
  autoReplyDelayMinutes: string;
  autoReplyWindowStart: string;
  autoReplyWindowEnd: string;
  autoReplyDurationMode: string;
  autoReplyDurationDays: string;
  autoReplyDateStart: string;
  autoReplyDateEnd: string;
  maxAutoRepliesPerConversation: string;
  escalationRule: string;
  safetyNote: string;
};

const SECTION_COPY: Record<RuleSectionKey, { title: string; description: string; actionLabel: string }> = {
  general: {
    title: "General Rules",
    description: "Start with General Rules. Campaign-specific rules are optional.",
    actionLabel: "Add general rule",
  },
  campaign: {
    title: "Campaign Rules",
    description: "Campaign rules apply to one Expert campaign and override General Rules.",
    actionLabel: "Add campaign rule",
  },
  variant: {
    title: "Variant Rules",
    description: "Variant rules apply to a specific email or follow-up and override campaign rules.",
    actionLabel: "Add variant rule",
  },
  manual: {
    title: "Manual Replies",
    description: "Manual replies are prepared response templates the agent can suggest when a prospect replies.",
    actionLabel: "Add manual reply",
  },
  auto: {
    title: "Auto-Reply Setup",
    description: "Auto-replies are off. These settings only prepare future rules.",
    actionLabel: "Prepare auto-reply rule",
  },
};

const ACTION_OPTIONS = [
  { value: "prepare_reply_draft", label: "Prepare a reply draft" },
  { value: "prepare_manual_reply", label: "Suggest a manual reply" },
  { value: "pause_and_follow_up", label: "Pause and follow up later" },
  { value: "mark_not_interested", label: "Mark as not interested" },
  { value: "suppress_contact", label: "Stop future contact" },
  { value: "escalate_to_human", label: "Escalate for human review" },
  { value: "log_delivery_issue", label: "Log a delivery issue" },
] as const;

function ResponsesRulesPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const responseRulesQuery = useResponseRulesQuery();
  const createMutation = useCreateResponseRuleMutation();
  const updateMutation = useUpdateResponseRuleMutation();
  const canEdit = ["client_owner", "manager", "sales_user", "intergrai_admin"].includes(user?.role || "");
  const [editor, setEditor] = useState<RuleEditorState | null>(null);

  const summary = summaryQuery.data;
  const responseRulesData = responseRulesQuery.data;
  const categories = responseRulesData?.categories || summary?.responseRuleCategories || [];
  const rules = responseRulesData?.rules || summary?.responseRules || [];

  const campaignOptions = useMemo(() => {
    return (summary?.campaigns || []).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
    }));
  }, [summary?.campaigns]);

  const variantOptions = useMemo(() => {
    return (summary?.outreachTemplates || []).flatMap((template) =>
      template.variants.map((variant) => ({
        id: variant.id,
        label: `${template.campaignName || "Campaign"} · ${template.name || "Template"}${variant.variantLabel ? ` · ${variant.variantLabel}` : ""}`,
        campaignId: template.campaignId,
      })),
    );
  }, [summary?.outreachTemplates]);

  const groupedRules = useMemo(() => {
    const visibleRules = rules.filter((rule) => rule.visibility !== "internal_only");
    return {
      general: sortRules(visibleRules.filter((rule) => rule.ruleKind === "response_rule" && rule.scopeLevel === "general")),
      campaign: sortRules(visibleRules.filter((rule) => rule.ruleKind === "response_rule" && rule.scopeLevel === "campaign")),
      variant: sortRules(visibleRules.filter((rule) => rule.ruleKind === "response_rule" && rule.scopeLevel === "variant")),
      manual: sortRules(visibleRules.filter((rule) => rule.ruleKind === "manual_reply")),
      auto: sortRules(visibleRules.filter((rule) => rule.ruleKind === "auto_reply")),
    };
  }, [rules]);

  async function refreshAll() {
    await Promise.all([summaryQuery.refetch(), responseRulesQuery.refetch()]);
  }

  function openCreate(section: RuleSectionKey) {
    setEditor({
      open: true,
      mode: "create",
      section,
      rule: null,
      form: buildRuleForm(section, null, categories),
    });
  }

  function openEdit(rule: ResponseRuleRecord, section: RuleSectionKey) {
    setEditor({
      open: true,
      mode: "edit",
      section,
      rule,
      form: buildRuleForm(section, rule, categories),
    });
  }

  async function handleSaveRule() {
    if (!editor) return;
    const payload = buildRulePayload(editor.section, editor.form, editor.rule);
    const editedApprovedRule = editor.mode === "edit" && normalizeApprovalStatus(editor.rule?.status) === "approved";

    try {
      if (editor.mode === "edit" && editor.rule) {
        await updateMutation.mutateAsync({ ruleId: editor.rule.id, input: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(
        editedApprovedRule
          ? "Changes saved. Review the updated rule before launch."
          : "Response rule saved.",
      );
      setEditor(null);
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save that rule.");
    }
  }

  async function handleArchive(rule: ResponseRuleRecord) {
    try {
      await updateMutation.mutateAsync({
        ruleId: rule.id,
        input: { status: "archived" },
      });
      toast.success("Rule archived.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive that rule.");
    }
  }

  async function handleToggleRule(rule: ResponseRuleRecord, enabled: boolean) {
    try {
      await updateMutation.mutateAsync({
        ruleId: rule.id,
        input: {
          enabled,
          requires_approval: false,
          metadata: {
            ...(rule.metadata || {}),
            rule_enabled: enabled,
          },
        },
      });
      toast.success(enabled ? "Rule turned on." : "Rule turned off.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update that rule.");
    }
  }

  if ((summaryQuery.isLoading && !summary) || (responseRulesQuery.isLoading && !responseRulesData)) {
    return (
      <div className="mx-auto max-w-[1320px] space-y-6">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-24 rounded-[24px]" />
        <Skeleton className="h-80 rounded-[28px]" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <Card className="rounded-[28px] p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Responses + Rules unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">The rule workspace could not be loaded.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageIntro
        badge="Responses + Rules"
        title="When someone replies like this, what should the agent do?"
        description="Set how Expert Lead Agent should understand replies and prepare responses. Auto-replies stay off unless explicitly enabled."
        actions={(
          <Button variant="outline" onClick={() => void refreshAll()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      <SafetyBanner>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
            Auto-replies are OFF
          </Badge>
          <span>No automatic replies will be sent.</span>
          <span>Reply drafts require approval.</span>
        </div>
      </SafetyBanner>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total rules" value={responseRulesData?.responseRulesCount ?? summary.responseRulesCount} detail="General, campaign, variant, manual, and auto-reply setup." />
        <StatCard label="Rules turned on" value={rules.filter((rule) => rule.status !== "archived" && rule.enabled).length} detail="Only turned-on rules guide reply classification and draft suggestions." />
        <StatCard label="Manual replies" value={groupedRules.manual.length} detail="Approved reply templates the agent can suggest." />
        <StatCard label="Auto-reply setup" value={responseRulesData?.autoReplyRulesConfiguredCount ?? summary.autoReplyRulesConfiguredCount} detail="Prepared only. Automatic replies remain off." />
      </div>

      <StatusMessage tone="warning">
        Start with General Rules. Campaign-specific rules are optional. Most replies should become drafts for approval. Auto-replies are off globally. These rules prepare future behaviour but will not send automatically.
      </StatusMessage>

      <ResponsesRuleSection
        section="general"
        rules={groupedRules.general}
        canEdit={canEdit}
        onAdd={() => openCreate("general")}
        onEdit={(rule) => openEdit(rule, "general")}
        onToggle={handleToggleRule}
        onArchive={handleArchive}
      />

      <ResponsesRuleSection
        section="campaign"
        rules={groupedRules.campaign}
        canEdit={canEdit}
        onAdd={() => openCreate("campaign")}
        onEdit={(rule) => openEdit(rule, "campaign")}
        onToggle={handleToggleRule}
        onArchive={handleArchive}
      />

      <ResponsesRuleSection
        section="variant"
        rules={groupedRules.variant}
        canEdit={canEdit}
        onAdd={() => openCreate("variant")}
        onEdit={(rule) => openEdit(rule, "variant")}
        onToggle={handleToggleRule}
        onArchive={handleArchive}
      />

      <ResponsesRuleSection
        section="manual"
        rules={groupedRules.manual}
        canEdit={canEdit}
        onAdd={() => openCreate("manual")}
        onEdit={(rule) => openEdit(rule, "manual")}
        onToggle={handleToggleRule}
        onArchive={handleArchive}
      />

      <ResponsesRuleSection
        section="auto"
        rules={groupedRules.auto}
        canEdit={canEdit}
        onAdd={() => openCreate("auto")}
        onEdit={(rule) => openEdit(rule, "auto")}
        onToggle={handleToggleRule}
        onArchive={handleArchive}
        headerTone={(
          <div className="rounded-[20px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            Auto-replies are off globally. You can prepare rules here, but they will not send automatically.
          </div>
        )}
      />

      <Dialog open={Boolean(editor?.open)} onOpenChange={(open) => {
        if (!open) {
          setEditor(null);
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editor?.mode === "edit" ? "Edit rule" : "Add rule"}</DialogTitle>
            <DialogDescription>
              Keep it simple: tell the agent what should happen when this kind of reply arrives.
            </DialogDescription>
          </DialogHeader>

          {editor ? (
            <RuleEditorForm
              section={editor.section}
              form={editor.form}
              categories={categories}
              campaigns={campaignOptions}
              variants={variantOptions}
              onChange={(field, value) => setEditor((current) => current ? {
                ...current,
                form: { ...current.form, [field]: value },
              } : current)}
            />
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveRule()}
              disabled={!canEdit || createMutation.isPending || updateMutation.isPending || !editor?.form.name.trim()}
              title={!canEdit ? "You do not have permission to edit rules." : undefined}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResponsesRuleSection({
  section,
  rules,
  canEdit,
  onAdd,
  onEdit,
  onToggle,
  onArchive,
  headerTone,
}: {
  section: RuleSectionKey;
  rules: ResponseRuleRecord[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (rule: ResponseRuleRecord) => void;
  onToggle: (rule: ResponseRuleRecord, enabled: boolean) => void;
  onArchive: (rule: ResponseRuleRecord) => void;
  headerTone?: ReactNode;
}) {
  const copy = SECTION_COPY[section];

  return (
    <SectionCard
      title={copy.title}
      description={copy.description}
      action={(
        <Button onClick={onAdd} disabled={!canEdit} title={!canEdit ? "You do not have permission to edit rules." : undefined}>
          <Plus className="mr-2 h-4 w-4" />
          {copy.actionLabel}
        </Button>
      )}
    >
      {headerTone}
      {rules.length ? (
        <div className={`grid gap-4 ${headerTone ? "mt-4" : ""}`}>
          {rules.map((rule) => (
            <ResponseRuleCard
              key={rule.id}
              rule={rule}
              canEdit={canEdit}
              onEdit={() => onEdit(rule)}
              onToggle={(enabled) => onToggle(rule, enabled)}
              onArchive={() => onArchive(rule)}
            />
          ))}
        </div>
      ) : (
        <div className={headerTone ? "mt-4" : ""}>
          <EmptyCard
            title={`No ${copy.title.toLowerCase()} yet`}
            description="Add a rule when you want different reply behavior for this scope."
          />
        </div>
      )}
    </SectionCard>
  );
}

function ResponseRuleCard({
  rule,
  canEdit,
  onEdit,
  onToggle,
  onArchive,
}: {
  rule: ResponseRuleRecord;
  canEdit: boolean;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onArchive: () => void;
}) {
  const archiveReason = !canEdit ? "You do not have permission to archive rules." : rule.status === "archived" ? "This rule is already archived." : "";
  const toggleReason = !canEdit ? "You do not have permission to change this rule." : rule.status === "archived" ? "Archived rules cannot be turned on." : "";

  return (
    <div className="rounded-[24px] border border-border/70 bg-background px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={rule.enabled ? "border-success/30 bg-success/10 text-success" : "border-border/70 bg-muted/15 text-muted-foreground"}>
              {rule.enabled ? "On" : "Off"}
            </Badge>
            <Badge variant="outline" className="border-border/70 bg-muted/15 text-muted-foreground">
              {friendlyScope(rule.scopeLevel)}
            </Badge>
            {rule.defaultRule ? (
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                Default rule
              </Badge>
            ) : null}
            <Badge variant="outline" className={autoReplyBadgeClass(rule.autoReplyStatus)}>
              Auto-reply {friendlyAutoReplyStatus(rule.autoReplyStatus).toLowerCase()}
            </Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{rule.name}</h3>
          {rule.description ? <p className="mt-2 text-sm text-muted-foreground">{rule.description}</p> : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/10 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">On / Off</span>
            <Switch checked={rule.enabled} onCheckedChange={onToggle} disabled={Boolean(toggleReason)} aria-label={`Toggle ${rule.name}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onEdit} disabled={!canEdit} title={!canEdit ? "You do not have permission to edit rules." : undefined}>
              Edit
            </Button>
          <Button size="sm" variant="outline" onClick={onArchive} disabled={Boolean(archiveReason)} title={archiveReason || undefined}>
            Archive
          </Button>
        </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RuleFact label="Rule name" value={rule.name} />
        <RuleFact label="Category" value={rule.categoryLabel || friendlyCategory(rule.category)} />
        <RuleFact label="Applies to" value={rule.appliesToLabel} />
        <RuleFact label="Action" value={friendlyRuleAction(rule.actionType)} />
        <RuleFact label="Draft behavior" value={rule.draftReplyEnabled ? "Prepare a reply draft" : "Do not prepare a draft"} />
        <RuleFact label="Approval workflow" value="Not required right now" />
        <RuleFact label="Last updated" value={formatPortalDate(rule.updatedAt || rule.createdAt)} />
      </div>

      {rule.replyTemplateBody ? (
        <div className="mt-4 rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Suggested reply</p>
          {rule.replyTemplateSubject ? <p className="mt-2 text-sm font-medium">Subject: {rule.replyTemplateSubject}</p> : null}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{truncateText(rule.replyTemplateBody, 280)}</p>
        </div>
      ) : null}
    </div>
  );
}

function RuleEditorForm({
  section,
  form,
  categories,
  campaigns,
  variants,
  onChange,
}: {
  section: RuleSectionKey;
  form: RuleFormState;
  categories: ResponseRuleCategoryRecord[];
  campaigns: Array<{ id: string; name: string }>;
  variants: Array<{ id: string; label: string; campaignId: string }>;
  onChange: (field: keyof RuleFormState, value: string) => void;
}) {
  const filteredVariants = section === "variant" && form.campaignId
    ? variants.filter((variant) => variant.campaignId === form.campaignId)
    : variants;
  const isAutoSection = section === "auto";
  const isManualSection = section === "manual";
  const selectedCategory = categories.find((category) => category.key === form.category);

  return (
    <div className="space-y-5">
      {isAutoSection ? (
        <div className="rounded-[20px] border border-warning/30 bg-warning/10 px-4 py-4 text-sm text-warning-foreground">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="h-4 w-4" />
            Auto-reply sending stays locked
          </div>
          <p className="mt-2">You can prepare the rule, delay, time window, and escalation notes here, but no automatic reply will be sent.</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="rule-name">Rule name</Label>
          <Input id="rule-name" className="mt-2" value={form.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Example: Positive replies should become meeting drafts" />
        </div>
        <div>
          <Label htmlFor="rule-category">Reply type</Label>
          <Select value={form.category} onValueChange={(value) => onChange("category", value)}>
            <SelectTrigger id="rule-category" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.key} value={category.key}>{category.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="rule-description">Description</Label>
        <Textarea id="rule-description" className="mt-2 min-h-[96px]" value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="Keep this short and client-friendly." />
        {selectedCategory?.description ? <p className="mt-2 text-xs text-muted-foreground">{selectedCategory.description}</p> : null}
      </div>

      {section === "campaign" || section === "variant" || section === "auto" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="rule-campaign">Campaign</Label>
            <Select value={form.campaignId || "__all__"} onValueChange={(value) => onChange("campaignId", value === "__all__" ? "" : value)}>
              <SelectTrigger id="rule-campaign" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(section === "auto" || section === "campaign") ? <SelectItem value="__all__">All campaigns</SelectItem> : null}
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {section === "variant" || section === "auto" ? (
            <div>
              <Label htmlFor="rule-variant">Variant</Label>
              <Select value={form.campaignVariantId || "__none__"} onValueChange={(value) => onChange("campaignVariantId", value === "__none__" ? "" : value)}>
                <SelectTrigger id="rule-variant" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific variant</SelectItem>
                  {filteredVariants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>{variant.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="rule-action">What should the agent do?</Label>
          <Select value={form.actionType} onValueChange={(value) => onChange("actionType", value)}>
            <SelectTrigger id="rule-action" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((action) => (
                <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Approval workflow</Label>
          <div className="mt-2 rounded-[14px] border border-border/70 bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
            Rule approvals are not required right now. Save changes when the rule is ready.
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="rule-trigger-phrases">Trigger phrases</Label>
        <Textarea
          id="rule-trigger-phrases"
          className="mt-2 min-h-[96px]"
          value={form.triggerPhrases}
          onChange={(event) => onChange("triggerPhrases", event.target.value)}
          placeholder="One phrase per line. Leave blank if the category itself is enough."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="rule-subject">Suggested subject</Label>
          <Input id="rule-subject" className="mt-2" value={form.replyTemplateSubject} onChange={(event) => onChange("replyTemplateSubject", event.target.value)} placeholder="Optional subject for suggested drafts" />
        </div>
        <div>
          <Label htmlFor="rule-manual-required">Manual review</Label>
          <Select value={form.manualReplyRequired} onValueChange={(value) => onChange("manualReplyRequired", value)}>
            <SelectTrigger id="rule-manual-required" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Require manual review</SelectItem>
              <SelectItem value="no">No manual review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="rule-body">{isManualSection ? "Manual reply body" : "Suggested reply body"}</Label>
        <Textarea id="rule-body" className="mt-2 min-h-[180px]" value={form.replyTemplateBody} onChange={(event) => onChange("replyTemplateBody", event.target.value)} placeholder="Write the reply template the agent should suggest." />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="rule-draft-enabled">Draft suggestion</Label>
          <Select value={form.draftReplyEnabled} onValueChange={(value) => onChange("draftReplyEnabled", value)}>
            <SelectTrigger id="rule-draft-enabled" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Prepare a draft</SelectItem>
              <SelectItem value="no">Do not prepare a draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rule-max-replies">Max auto-replies per conversation</Label>
          <Input id="rule-max-replies" className="mt-2" type="number" min="0" value={form.maxAutoRepliesPerConversation} onChange={(event) => onChange("maxAutoRepliesPerConversation", event.target.value)} />
        </div>
      </div>

      {isAutoSection ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="auto-delay-mode">Delay before sending</Label>
              <Select value={form.autoReplyDelayMode} onValueChange={(value) => onChange("autoReplyDelayMode", value)}>
                <SelectTrigger id="auto-delay-mode" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Immediate</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.autoReplyDelayMode === "custom" ? (
              <div>
                <Label htmlFor="auto-delay-minutes">Custom delay in minutes</Label>
                <Input id="auto-delay-minutes" className="mt-2" type="number" min="0" value={form.autoReplyDelayMinutes} onChange={(event) => onChange("autoReplyDelayMinutes", event.target.value)} />
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="auto-window-start">Allowed sending hours start</Label>
              <Input id="auto-window-start" className="mt-2" type="time" value={form.autoReplyWindowStart} onChange={(event) => onChange("autoReplyWindowStart", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="auto-window-end">Allowed sending hours end</Label>
              <Input id="auto-window-end" className="mt-2" type="time" value={form.autoReplyWindowEnd} onChange={(event) => onChange("autoReplyWindowEnd", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="auto-duration-mode">Active duration</Label>
              <Select value={form.autoReplyDurationMode} onValueChange={(value) => onChange("autoReplyDurationMode", value)}>
                <SelectTrigger id="auto-duration-mode" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always until disabled</SelectItem>
                  <SelectItem value="date_range">Date range</SelectItem>
                  <SelectItem value="campaign_duration">Campaign duration</SelectItem>
                  <SelectItem value="days">Custom number of days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.autoReplyDurationMode === "days" ? (
              <div>
                <Label htmlFor="auto-duration-days">Number of days</Label>
                <Input id="auto-duration-days" className="mt-2" type="number" min="0" value={form.autoReplyDurationDays} onChange={(event) => onChange("autoReplyDurationDays", event.target.value)} />
              </div>
            ) : null}
          </div>

          {form.autoReplyDurationMode === "date_range" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="auto-date-start">Start date</Label>
                <Input id="auto-date-start" className="mt-2" type="date" value={form.autoReplyDateStart} onChange={(event) => onChange("autoReplyDateStart", event.target.value)} />
              </div>
              <div>
                <Label htmlFor="auto-date-end">End date</Label>
                <Input id="auto-date-end" className="mt-2" type="date" value={form.autoReplyDateEnd} onChange={(event) => onChange("autoReplyDateEnd", event.target.value)} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="auto-escalation-rule">Escalation rule</Label>
              <Textarea id="auto-escalation-rule" className="mt-2 min-h-[96px]" value={form.escalationRule} onChange={(event) => onChange("escalationRule", event.target.value)} placeholder="Example: only use this after an out-of-office reply and never after pricing or legal questions." />
            </div>
            <div>
              <Label htmlFor="auto-safety-note">Safety note</Label>
              <Textarea id="auto-safety-note" className="mt-2 min-h-[96px]" value={form.safetyNote} onChange={(event) => onChange("safetyNote", event.target.value)} placeholder="Example: keep this short, do not confirm pricing, and stop if the reply feels sensitive." />
            </div>
          </div>
        </>
      ) : null}

      {!isAutoSection ? (
        <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
          General rules apply everywhere. Campaign rules only apply to that campaign. Variant rules are for a specific email or follow-up.
        </div>
      ) : null}
    </div>
  );
}

function RuleFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value || "Not set"}</p>
    </div>
  );
}

function sortRules(rules: ResponseRuleRecord[]) {
  return [...rules].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return left.name.localeCompare(right.name);
  });
}

function buildRuleForm(section: RuleSectionKey, rule: ResponseRuleRecord | null, categories: ResponseRuleCategoryRecord[]): RuleFormState {
  const defaultCategory = rule?.category || categories[0]?.key || "positive_reply";
  const categoryFallback = categories.find((category) => category.key === defaultCategory);
  const delayValue = rule?.autoReplyDelayMinutes ?? null;
  const autoReplyDelayMode = delayValue === 15 || delayValue === 60 || delayValue === 0 ? String(delayValue) : delayValue === null ? "15" : "custom";
  const metadata = rule?.metadata || {};

  return {
    name: rule?.name || categoryFallback?.label || "Response rule",
    description: rule?.description || categoryFallback?.description || "",
    category: defaultCategory,
    actionType: rule?.actionType || categoryFallback?.actionType || (section === "manual" ? "prepare_manual_reply" : "prepare_reply_draft"),
    campaignId: rule?.campaignId || "",
    campaignVariantId: rule?.campaignVariantId || "",
    triggerPhrases: (rule?.triggerPhrases || categoryFallback?.triggerPhrases || []).join("\n"),
    replyTemplateSubject: rule?.replyTemplateSubject || categoryFallback?.defaultSubject || "",
    replyTemplateBody: rule?.replyTemplateBody || categoryFallback?.defaultBody || "",
    requiresApproval: "no",
    manualReplyRequired: rule?.manualReplyRequired === false ? "no" : "yes",
    draftReplyEnabled: rule?.draftReplyEnabled === false ? "no" : "yes",
    autoReplyDelayMode,
    autoReplyDelayMinutes: delayValue !== null && delayValue !== undefined ? String(delayValue) : "15",
    autoReplyWindowStart: rule?.autoReplyWindowStart || "",
    autoReplyWindowEnd: rule?.autoReplyWindowEnd || "",
    autoReplyDurationMode: String(metadata.auto_reply_duration_mode || (rule?.autoReplyDurationDays ? "days" : "always")),
    autoReplyDurationDays: rule?.autoReplyDurationDays !== null && rule?.autoReplyDurationDays !== undefined ? String(rule.autoReplyDurationDays) : "",
    autoReplyDateStart: String(metadata.auto_reply_date_start || ""),
    autoReplyDateEnd: String(metadata.auto_reply_date_end || ""),
    maxAutoRepliesPerConversation: String(rule?.maxAutoRepliesPerConversation ?? 1),
    escalationRule: String(metadata.escalation_rule || ""),
    safetyNote: String(metadata.safety_note || ""),
  };
}

function buildRulePayload(section: RuleSectionKey, form: RuleFormState, rule: ResponseRuleRecord | null) {
  const triggerPhrases = form.triggerPhrases
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const triggerType = form.category === "out_of_office"
    ? "system_detected"
    : triggerPhrases.length
      ? "phrase_match"
      : "category_match";
  const autoReplyDelayMinutes = section === "auto"
    ? (form.autoReplyDelayMode === "custom" ? parseNullableInteger(form.autoReplyDelayMinutes) : parseNullableInteger(form.autoReplyDelayMode))
    : null;
  const autoReplyDurationDays = section === "auto" && form.autoReplyDurationMode === "days"
    ? parseNullableInteger(form.autoReplyDurationDays)
    : null;

  return {
    rule_kind: section === "manual" ? "manual_reply" : section === "auto" ? "auto_reply" : "response_rule",
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    action_type: section === "manual" ? "prepare_manual_reply" : form.actionType,
    campaign_id: form.campaignId || null,
    campaign_variant_id: form.campaignVariantId || null,
    trigger_type: triggerType,
    trigger_phrases: triggerPhrases,
    reply_template_subject: form.replyTemplateSubject.trim(),
    reply_template_body: form.replyTemplateBody.trim(),
    requires_approval: false,
    manual_reply_required: form.manualReplyRequired === "yes",
    draft_reply_enabled: section === "auto" ? true : form.draftReplyEnabled === "yes",
    auto_reply_enabled: false,
    auto_reply_prepared: section === "auto",
    enabled: rule?.enabled ?? true,
    auto_reply_delay_minutes: autoReplyDelayMinutes,
    auto_reply_window_start: section === "auto" ? normalizeNullableString(form.autoReplyWindowStart) : null,
    auto_reply_window_end: section === "auto" ? normalizeNullableString(form.autoReplyWindowEnd) : null,
    auto_reply_duration_days: autoReplyDurationDays,
    max_auto_replies_per_conversation: parseNullableInteger(form.maxAutoRepliesPerConversation) ?? 1,
    metadata: {
      ...(rule?.metadata || {}),
      auto_reply_duration_mode: section === "auto" ? form.autoReplyDurationMode : undefined,
      auto_reply_date_start: section === "auto" ? normalizeNullableString(form.autoReplyDateStart) : undefined,
      auto_reply_date_end: section === "auto" ? normalizeNullableString(form.autoReplyDateEnd) : undefined,
      escalation_rule: section === "auto" ? normalizeNullableString(form.escalationRule) : undefined,
      safety_note: section === "auto" ? normalizeNullableString(form.safetyNote) : undefined,
      rule_enabled: rule?.enabled ?? true,
      default_rule: rule?.defaultRule ?? false,
    },
  };
}

function parseNullableInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableString(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function friendlyCategory(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Reply category";
}

function friendlyScope(value: string) {
  switch ((value || "").toLowerCase()) {
    case "variant":
      return "Variant rule";
    case "campaign":
      return "Campaign rule";
    default:
      return "General rule";
  }
}

function friendlyRuleAction(value: string) {
  const match = ACTION_OPTIONS.find((option) => option.value === value);
  return match?.label || "Prepare a reply draft";
}

function friendlyAutoReplyStatus(value: string) {
  switch ((value || "").toLowerCase()) {
    case "enabled":
      return "Enabled";
    case "prepared_only":
      return "Prepared only";
    default:
      return "Off";
  }
}

function autoReplyBadgeClass(status: string) {
  switch ((status || "").toLowerCase()) {
    case "enabled":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "prepared_only":
      return "border-warning/30 bg-warning/10 text-warning-foreground";
    default:
      return "border-success/30 bg-success/10 text-success";
  }
}
