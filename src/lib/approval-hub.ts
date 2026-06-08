import type {
  ApprovalRecord,
  ConversationRecord,
  LeadAgentSummary,
  ResponseRuleRecord,
  RequestHistoryRecord,
} from "@/lib/leads-api";

const INTERNAL_KEYWORD_PATTERN = /(^|[^a-z])(test|mock|placeholder|untitled|example|demo|qa)([^a-z]|$)/i;
const ATTENTION_REQUEST_STATUSES = new Set(["waiting_on_you", "under_review"]);

export type ApprovalHubItem = {
  key: string;
  id: string;
  approvalId?: string;
  conversationId?: string;
  kind: "campaign" | "template_variant" | "followup_sequence" | "reply_draft" | "credit_approval" | "approval_record" | "asset_approval" | "request_notice" | "response_rule";
  status: "pending" | "approved" | "changes_requested" | "archived" | "draft";
  title: string;
  typeLabel: string;
  shortContext: string;
  previewSummary: string;
  reason: string;
  requestedBy: string;
  createdAt?: string;
  previewHref: string;
  previewLabel: string;
  latestNote: string;
  actionable: boolean;
  companyName?: string;
  contactName?: string;
  campaignName?: string;
  providerLabel?: string;
  targetRole?: string;
  originalReplySummary?: string;
  generationReason?: string;
  trainingSummary?: string;
};

function normalizeApprovalKeyPart(value?: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupePendingCreditApprovals(approvals: LeadAgentSummary["pendingEnrichmentCreditApprovals"] = []) {
  const byKey = new Map<string, (typeof approvals)[number]>();

  for (const approval of approvals) {
    const company = normalizeApprovalKeyPart(approval.companyName);
    const campaign = normalizeApprovalKeyPart(approval.campaignName);
    const rawLead = normalizeApprovalKeyPart(approval.rawLeadId);
    const key = company && campaign
      ? `company:${company}|campaign:${campaign}`
      : rawLead
        ? `raw:${rawLead}`
        : `queue:${approval.queueItemId}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, approval);
      continue;
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime() || 0;
    const nextTime = new Date(approval.updatedAt || approval.createdAt || 0).getTime() || 0;
    if (nextTime >= existingTime) {
      byKey.set(key, approval);
    }
  }

  return [...byKey.values()].sort((left, right) => {
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime() || 0;
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime() || 0;
    return rightTime - leftTime;
  });
}

function formatApprovalContactValue(value?: string) {
  const text = String(value || "").trim();
  return text || "Decision-maker still being verified";
}

export function buildApprovalHubItems(
  summary: LeadAgentSummary,
  conversations: ConversationRecord[] = [],
  requests: RequestHistoryRecord[] = [],
) {
  const items: ApprovalHubItem[] = [];
  const approvalsByEntityKey = new Map<string, ApprovalRecord>();
  const campaignNameById = new Map(
    (summary.campaigns || []).map((campaign) => [campaign.id, campaign.name || "Campaign"] as const),
  );

  for (const approval of summary.approvals || []) {
    if (!approval.entityType || !approval.entityId) continue;
    const key = `${approval.entityType}:${approval.entityId}`;
    if (!approvalsByEntityKey.has(key)) {
      approvalsByEntityKey.set(key, approval);
    }
  }

  for (const campaign of summary.campaigns) {
    const status = normalizeApprovalStatus(campaign.approvalStatus);
    if (status === "archived" || status === "draft") continue;
    const approval = approvalsByEntityKey.get(`campaign:${campaign.id}`);

    items.push({
      key: `campaign:${campaign.id}`,
      id: campaign.id,
      kind: "campaign",
      status,
      title: approvalTitleFallback("campaign", { campaignName: campaign.name }),
      typeLabel: "Campaign",
      shortContext: `This campaign targets ${campaign.targetNiche || "your selected audience"} in ${campaign.targetLocation || "the selected market"}.`,
      previewSummary: campaign.objective || "Campaign direction and launch readiness review.",
      reason: status === "pending"
        ? "This campaign needs approval before launch planning continues."
        : "Campaign approval history.",
      requestedBy: "Intergrai",
      createdAt: campaign.updatedAt || campaign.createdAt,
      previewHref: "/campaigns",
      previewLabel: "Review campaign",
      latestNote: approval?.decisionNote || "",
      actionable: true,
    });
  }

  for (const template of summary.outreachTemplates) {
    for (const variant of template.variants) {
      const approval = approvalsByEntityKey.get(`outreach_template_variant:${variant.id}`);
      const campaignName = (template.campaignId ? campaignNameById.get(template.campaignId) : null) || template.campaignName;
      const status = normalizeApprovalStatus(approval?.decisionStatus || approval?.status || variant.approvalStatus || variant.approvalDecisionStatus);
      if (status === "archived" || status === "draft") continue;

      items.push({
        key: `template:${variant.id}`,
        id: variant.id,
        kind: "template_variant",
        status,
        title: approvalTitleFallback("template_variant", {
          campaignName,
          templateName: template.name,
          templateType: template.templateType,
          variantLabel: variant.variantLabel,
        }),
        typeLabel: template.templateType === "follow_up" ? "Follow-up" : "Email Template",
        shortContext: `This email will be used for the ${campaignName || "linked"} campaign.`,
        previewSummary: `${variant.subjectTemplate || "No subject line"}${template.name ? ` · ${template.name}` : ""}${variant.variantLabel ? ` · Variant ${variant.variantLabel}` : ""}`,
        reason: status === "pending"
          ? (variant.previousApprovalStatus === "approved"
            ? "This email was edited and needs approval again before launch."
            : "The email copy needs approval before launch.")
          : "Email approval history.",
        requestedBy: "Intergrai",
        createdAt: approval?.updatedAt || approval?.createdAt || variant.latestQualityReview?.createdAt,
        previewHref: "/templates",
        previewLabel: "View full preview",
        latestNote: approval?.decisionNote || variant.approvalDecisionNote || "",
        actionable: true,
      });
    }
  }

  for (const sequence of summary.followupSequences) {
    const campaignName = (sequence.campaignId ? campaignNameById.get(sequence.campaignId) : null) || sequence.campaignName;
    const status = normalizeApprovalStatus(sequence.approvalStatus || sequence.approvalDecisionStatus);
    if (status === "archived" || status === "draft") continue;

    items.push({
      key: `sequence:${sequence.id}`,
      id: sequence.id,
      kind: "followup_sequence",
      status,
      title: approvalTitleFallback("followup_sequence", { campaignName, sequenceName: sequence.name }),
      typeLabel: "Follow-up",
      shortContext: `This follow-up sequence supports the ${campaignName || "linked"} campaign.`,
      previewSummary: `${sequence.followupCount} follow-up step${sequence.followupCount === 1 ? "" : "s"}${sequence.name ? ` · ${sequence.name}` : ""}`,
      reason: status === "pending"
        ? "Follow-up timing and copy should be approved before launch."
        : "Follow-up approval history.",
      requestedBy: "Intergrai",
      createdAt: sequence.updatedAt,
      previewHref: "/templates",
      previewLabel: "View full preview",
      latestNote: sequence.approvalDecisionNote || "",
      actionable: true,
    });
  }

  for (const asset of summary.outreachAssets) {
    const status = normalizeApprovalStatus(asset.approvalStatus || asset.status);
    if (status === "archived" || status === "draft") continue;

    items.push({
      key: `asset:${asset.id}`,
      id: asset.id,
      approvalId: asset.approvalId,
      kind: "asset_approval",
      status,
      title: buildAssetApprovalTitle(asset),
      typeLabel: "Image",
      shortContext: `Optional image for ${asset.campaignName || "the linked campaign"}${asset.templateName ? ` · ${asset.templateName}` : ""}.`,
      previewSummary: buildAssetApprovalPreview(asset),
      reason: status === "pending"
        ? "Optional images require approval before they are linked into outreach emails."
        : "Image approval history.",
      requestedBy: asset.createdByName || "Intergrai",
      createdAt: asset.createdAt,
      previewHref: "/templates",
      previewLabel: "View full preview",
      latestNote: asset.approvalDecisionNote || "",
      actionable: Boolean(asset.approvalId),
    });
  }

  for (const rule of summary.responseRules) {
    if (!rule.requiresApproval) continue;
    const status = normalizeApprovalStatus(rule.status);
    if (status === "archived" || status === "draft") continue;

    items.push({
      key: `response-rule:${rule.id}`,
      id: rule.id,
      approvalId: rule.approvalId || undefined,
      kind: "response_rule",
      status,
      title: buildResponseRuleTitle(rule),
      typeLabel: friendlyRuleKind(rule.ruleKind),
      shortContext: `${rule.appliesToLabel}. When this type of reply is received: ${rule.categoryLabel || "Reply category"}.`,
      previewSummary: `${friendlyRuleAction(rule.actionType)} · ${friendlyAutoReplyStatus(rule.autoReplyStatus)}.`,
      reason: status === "pending"
        ? "This response rule changes how replies are handled and needs approval before it becomes active."
        : "Response rule approval history.",
      requestedBy: rule.updatedByName || rule.createdByName || "Intergrai",
      createdAt: rule.updatedAt || rule.createdAt,
      previewHref: "/responses-rules",
      previewLabel: "Review rule",
      latestNote: "",
      actionable: Boolean(rule.approvalId),
    });
  }

  for (const approval of dedupePendingCreditApprovals(summary.pendingEnrichmentCreditApprovals)) {
    const campaignName = approval.campaignName || "the linked campaign";
    const contactName = approval.contactName || approval.targetRole || "";
    const providerLabel = approval.providerLabel || (approval.apolloPlanned && approval.hunterPlanned ? "Apollo/Hunter" : approval.apolloPlanned ? "Apollo" : approval.hunterPlanned ? "Hunter" : "Apollo/Hunter");
    items.push({
      key: `credit:${approval.queueItemId}`,
      id: approval.queueItemId,
      kind: "credit_approval",
      status: "pending",
      title: `Approve contact verification — ${approval.companyName || "Lead"}`,
      typeLabel: "Contact verification",
      shortContext: `Use ${providerLabel} to verify a decision-maker for ${campaignName}.`,
      previewSummary: [
        `Company: ${approval.companyName || "Lead"}`,
        `Campaign: ${campaignName}`,
        `Target role: ${formatApprovalContactValue(approval.targetRole)}`,
        `Contact: ${formatApprovalContactValue(contactName)}`,
        `Provider: ${providerLabel}`,
      ].join(" · "),
      reason: "Verification work needs approval before credit-backed enrichment continues.",
      requestedBy: "Intergrai",
      createdAt: approval.createdAt,
      previewHref: "/lead-agent",
      previewLabel: "Review lead pipeline",
      latestNote: "",
      actionable: true,
      companyName: approval.companyName || "",
      contactName: approval.contactName || approval.targetRole || "",
      campaignName,
      providerLabel,
      targetRole: approval.targetRole || "",
    });
  }

  for (const conversation of conversations) {
    const draft = conversation.latestReplyDraft;
    if (!draft) continue;

    const status = normalizeReplyDraftStatus(draft.status);
    if (status === "archived" || status === "draft") continue;
    const latestInboundMessage = [...(conversation.messages || [])]
      .reverse()
      .find((message) => message.direction === "inbound") || null;
    const trainingSummary = (draft.trainingContextUsed || [])
      .map((entry) => String(entry.title || entry.category || entry.name || "").trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(" · ");
    const generatedReason = String(draft.metadata?.action_recommended || draft.metadata?.reply_category || "Generated from the latest inbound reply and reply rules.");

    items.push({
      key: `reply:${draft.id}`,
      id: draft.id,
      conversationId: conversation.id,
      kind: "reply_draft",
      status,
      title: `Approve reply draft — ${conversation.companyName || conversation.contactName || "Conversation"}`,
      typeLabel: "Reply draft",
      shortContext: "Review the draft, edit it if needed, and approve it to send immediately.",
      previewSummary: `${draft.draftSubject || "Reply draft"}${draft.draftBody ? ` · ${truncatePreview(draft.draftBody, 140)}` : ""}`,
      reason: status === "pending"
        ? "This reply was generated from an inbound message and still needs your approval before it can move forward."
        : "Reply approval history.",
      requestedBy: draft.createdBy?.name || draft.createdBy?.created_by_name || "Lead Agent",
      createdAt: draft.updatedAt || draft.createdAt || conversation.updatedAt,
      previewHref: `/conversations`,
      previewLabel: "Open conversation",
      latestNote: draft.approvalNote || "",
      actionable: true,
      companyName: conversation.companyName || "",
      contactName: conversation.contactName || conversation.contactEmail || "",
      campaignName: conversation.campaignName || "",
      originalReplySummary: latestInboundMessage
        ? `${latestInboundMessage.subject || "Inbound reply"} · ${truncatePreview(latestInboundMessage.bodyText || "", 150)}`
        : "Inbound reply received.",
      generationReason: generatedReason,
      trainingSummary: trainingSummary || "Reply rules and training notes",
    });
  }

  for (const request of requests) {
    const status = String(request.clientVisibleStatus || "").toLowerCase();
    if (!ATTENTION_REQUEST_STATUSES.has(status)) continue;
    if (hasInternalVisibilityKeyword(request.title) || hasInternalVisibilityKeyword(request.message)) continue;
  }

  return items
    .filter((item) => !hasInternalVisibilityKeyword(item.title))
    .filter((item) => item.status !== "draft")
    .sort((left, right) => {
      if (left.status !== right.status) {
        if (left.status === "pending") return -1;
        if (right.status === "pending") return 1;
        if (left.status === "changes_requested") return -1;
        if (right.status === "changes_requested") return 1;
      }

      const rightTime = new Date(right.createdAt || 0).getTime() || 0;
      const leftTime = new Date(left.createdAt || 0).getTime() || 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.title.localeCompare(right.title);
    });
}

export function getActionableApprovalItems(items: ApprovalHubItem[]) {
  return items.filter(actionableApprovalFilter);
}

export function normalizeApproval(value?: string) {
  return normalizeApprovalStatus(value);
}

export function actionableApprovalFilter(item: ApprovalHubItem) {
  return item.actionable && normalizeApprovalStatus(item.status) === "pending";
}

export function normalizeApprovalStatus(value?: string): "pending" | "approved" | "changes_requested" | "archived" | "draft" {
  switch ((value || "").toLowerCase()) {
    case "approved":
      return "approved";
    case "pending":
    case "pending_review":
    case "pending_client_approval":
    case "waiting_for_approval":
    case "pending_approval":
      return "pending";
    case "rejected":
    case "changes_requested":
    case "request_changes":
    case "declined":
      return "changes_requested";
    case "archived":
      return "archived";
    case "draft":
      return "draft";
    default:
      return "draft";
  }
}

function normalizeReplyDraftStatus(value?: string): "pending" | "approved" | "changes_requested" | "archived" | "draft" {
  switch ((value || "").toLowerCase()) {
    case "waiting_for_approval":
      return "pending";
    case "approved":
    case "sent":
      return "approved";
    case "changes_requested":
    case "rejected":
      return "changes_requested";
    case "archived":
      return "archived";
    default:
      return "draft";
  }
}

function buildEmailTitle(campaignName: string, templateName: string, templateType: string, variantLabel: string) {
  const typeLabel = friendlyTemplateType(templateType);
  const baseName = campaignName || "Campaign";
  const templateLabel = templateName || typeLabel;
  return `Email approval — ${baseName} — ${templateLabel}${variantLabel ? ` — Variant ${variantLabel}` : ""}`;
}

export function approvalTitleFallback(
  kind: ApprovalHubItem["kind"],
  context: {
    campaignName?: string;
    templateName?: string;
    templateType?: string;
    variantLabel?: string;
    sequenceName?: string;
    contactName?: string;
    companyName?: string;
    ruleName?: string;
  } = {},
) {
  switch (kind) {
    case "campaign":
      return `Campaign approval — ${context.campaignName || "Campaign"}`;
    case "template_variant":
      return buildEmailTitle(
        context.campaignName || "",
        context.templateName || "",
        context.templateType || "",
        context.variantLabel || "",
      );
    case "reply_draft":
      return `Reply approval — ${context.contactName || context.companyName || "Conversation"}`;
    case "asset_approval":
      return `Image approval — ${context.campaignName || "Campaign"} — ${context.templateName || "Email image"}`;
    case "response_rule":
      return `Rule approval — ${context.ruleName || "Rule"}`;
    case "followup_sequence":
      return `Follow-up approval — ${context.campaignName || "Campaign"}${context.sequenceName ? ` — ${context.sequenceName}` : ""}`;
    default:
      return "Approval item";
  }
}

function friendlyTemplateType(value: string) {
  switch ((value || "").toLowerCase()) {
    case "first_contact":
      return "First outreach email";
    case "follow_up":
      return "Follow-up email";
    case "reply":
      return "Reply template";
    case "variant":
      return "Email variant";
    default:
      return value
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || "Email";
  }
}

function friendlyPlacement(value: string) {
  switch ((value || "").toLowerCase()) {
    case "attachment_link":
      return "Attachment link";
    case "header":
      return "Header";
    case "footer":
      return "Footer";
    default:
      return value
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || "Inline";
  }
}

function buildAssetApprovalTitle(asset: {
  campaignName?: string;
  templateName?: string;
  title?: string;
}) {
  return [
    "Image approval",
    asset.campaignName || "Campaign",
    asset.templateName || asset.title || "Email image",
  ].join(" — ");
}

function buildAssetApprovalPreview(asset: {
  title?: string;
  altText?: string;
  placement?: string;
  approvalStatus?: string;
  status?: string;
}) {
  return [
    asset.title || "Optional image",
    friendlyPlacement(asset.placement || "inline"),
    asset.altText ? "Alt text ready" : "Alt text still needed",
    statusLabel(normalizeApprovalStatus(asset.approvalStatus || asset.status)),
  ].join(" · ");
}

function buildResponseRuleTitle(rule: ResponseRuleRecord) {
  if (rule.ruleKind === "manual_reply") {
    return `Manual reply approval — ${rule.name || rule.categoryLabel || "Manual reply"}`;
  }

  if (rule.ruleKind === "auto_reply") {
    return `Auto-reply rule approval — ${rule.name || rule.categoryLabel || "Auto-reply rule"}`;
  }

  return `Response rule approval — ${rule.name || rule.categoryLabel || "Response rule"}`;
}

function friendlyRuleKind(value: string) {
  switch ((value || "").toLowerCase()) {
    case "manual_reply":
      return "Manual Reply";
    case "auto_reply":
      return "Auto-Reply Rule";
    default:
      return "Response Rule";
  }
}

function friendlyRuleAction(value: string) {
  switch ((value || "").toLowerCase()) {
    case "prepare_reply_draft":
      return "Prepare a reply draft";
    case "prepare_manual_reply":
      return "Suggest a manual reply";
    case "pause_and_follow_up":
      return "Pause and follow up later";
    case "mark_not_interested":
      return "Mark as not interested";
    case "suppress_contact":
      return "Stop future contact";
    case "escalate_to_human":
      return "Escalate for human review";
    case "log_delivery_issue":
      return "Log a delivery issue";
    default:
      return "Prepare a reply draft";
  }
}

function friendlyAutoReplyStatus(value: string) {
  switch ((value || "").toLowerCase()) {
    case "enabled":
      return "Auto-reply enabled";
    case "prepared_only":
      return "Auto-reply prepared only";
    default:
      return "Auto-reply off";
  }
}

function hasInternalVisibilityKeyword(value?: string | null) {
  return INTERNAL_KEYWORD_PATTERN.test(String(value || ""));
}

function truncatePreview(value: string, limit: number) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

export function statusLabel(value: ApprovalHubItem["status"]) {
  switch (value) {
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes requested";
    case "archived":
      return "Archived";
    case "draft":
      return "Draft";
    default:
      return "Needs approval";
  }
}

export function friendlyApprovalStatus(value: ApprovalHubItem["status"]) {
  return statusLabel(value);
}

export function findApprovalByEntity(approvals: ApprovalRecord[], entityType: string, entityId: string) {
  return approvals.find((approval) => approval.entityType === entityType && approval.entityId === entityId) || null;
}
