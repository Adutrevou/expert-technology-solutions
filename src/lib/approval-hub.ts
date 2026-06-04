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
};

export function buildApprovalHubItems(
  summary: LeadAgentSummary,
  conversations: ConversationRecord[] = [],
  requests: RequestHistoryRecord[] = [],
) {
  const items: ApprovalHubItem[] = [];

  for (const campaign of summary.campaigns) {
    const status = normalizeApprovalStatus(campaign.approvalStatus);
    if (status === "archived" || status === "draft") continue;

    items.push({
      key: `campaign:${campaign.id}`,
      id: campaign.id,
      kind: "campaign",
      status,
      title: `Campaign approval — ${campaign.name || "Campaign"}`,
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
      latestNote: "",
      actionable: true,
    });
  }

  for (const template of summary.outreachTemplates) {
    for (const variant of template.variants) {
      const status = normalizeApprovalStatus(variant.approvalStatus || variant.approvalDecisionStatus);
      if (status === "archived" || status === "draft") continue;

      items.push({
        key: `template:${variant.id}`,
        id: variant.id,
        kind: "template_variant",
        status,
        title: buildEmailTitle(template.campaignName, template.name, template.templateType, variant.variantLabel),
        typeLabel: template.templateType === "follow_up" ? "Follow-up" : "Email Template",
        shortContext: `This email will be used for the ${template.campaignName || "linked"} campaign.`,
        previewSummary: `${variant.subjectTemplate || "No subject line"}${template.name ? ` · ${template.name}` : ""}${variant.variantLabel ? ` · Variant ${variant.variantLabel}` : ""}`,
        reason: status === "pending"
          ? (variant.previousApprovalStatus === "approved"
            ? "This email was edited and needs approval again before launch."
            : "The email copy needs approval before launch.")
          : "Email approval history.",
        requestedBy: "Intergrai",
        createdAt: variant.latestQualityReview?.createdAt,
        previewHref: "/templates",
        previewLabel: "View full preview",
        latestNote: variant.approvalDecisionNote || "",
        actionable: true,
      });
    }
  }

  for (const sequence of summary.followupSequences) {
    const status = normalizeApprovalStatus(sequence.approvalStatus || sequence.approvalDecisionStatus);
    if (status === "archived" || status === "draft") continue;

    items.push({
      key: `sequence:${sequence.id}`,
      id: sequence.id,
      kind: "followup_sequence",
      status,
      title: `Approve follow-up email sequence for ${sequence.campaignName || "campaign"}`,
      typeLabel: "Follow-up",
      shortContext: `This follow-up sequence supports the ${sequence.campaignName || "linked"} campaign.`,
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
      title: `Image approval — ${asset.title || asset.templateName || "Email image"}`,
      typeLabel: "Image",
      shortContext: `Optional image for ${asset.campaignName || "the linked campaign"}${asset.templateName ? ` · ${asset.templateName}` : ""}.`,
      previewSummary: `${asset.altText || "Alt text required"} · ${friendlyPlacement(asset.placement)} · ${asset.fileUrl || "No image URL"}`,
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

  for (const approval of summary.pendingEnrichmentCreditApprovals) {
    items.push({
      key: `credit:${approval.queueItemId}`,
      id: approval.queueItemId,
      kind: "credit_approval",
      status: "pending",
      title: `Approve verification request for ${approval.companyName || "lead"}`,
      typeLabel: "Request",
      shortContext: `This request supports ${approval.campaignName || "the linked campaign"}.`,
      previewSummary: "Contact verification spend approval",
      reason: "Verification work needs approval before credit-backed enrichment continues.",
      requestedBy: "Intergrai",
      createdAt: approval.createdAt,
      previewHref: "/lead-agent",
      previewLabel: "View details",
      latestNote: "",
      actionable: true,
    });
  }

  for (const conversation of conversations) {
    const draft = conversation.latestReplyDraft;
    if (!draft) continue;

    const status = normalizeReplyDraftStatus(draft.status);
    if (status === "archived" || status === "draft") continue;

    items.push({
      key: `reply:${draft.id}`,
      id: draft.id,
      kind: "reply_draft",
      status,
      title: `Reply approval — ${conversation.companyName || conversation.contactName || "Conversation"}`,
      typeLabel: "Reply Draft",
      shortContext: `Reply draft for ${conversation.contactName || conversation.contactEmail || "this conversation"}.`,
      previewSummary: `${draft.draftSubject || "Reply draft"}${conversation.campaignName ? ` · ${conversation.campaignName}` : ""}`,
      reason: status === "pending"
        ? "Replies remain approval-gated so nothing sends automatically."
        : "Reply approval history.",
      requestedBy: "Lead Agent",
      createdAt: draft.createdAt,
      previewHref: "/conversations",
      previewLabel: "View full preview",
      latestNote: draft.approvalNote || "",
      actionable: true,
    });
  }

  for (const request of requests) {
    const status = String(request.clientVisibleStatus || "").toLowerCase();
    if (!ATTENTION_REQUEST_STATUSES.has(status)) continue;
    if (hasInternalVisibilityKeyword(request.title) || hasInternalVisibilityKeyword(request.message)) continue;

    items.push({
      key: `request:${request.id}`,
      id: request.id,
      kind: "request_notice",
      status: "pending",
      title: request.title || "Client request",
      typeLabel: "Request",
      shortContext: "This request may affect campaign or template decisions.",
      previewSummary: request.message || "Open request",
      reason: "This request needs review before related work can continue.",
      requestedBy: request.createdByName || "Expert",
      createdAt: request.createdAt,
      previewHref: "/requests",
      previewLabel: "Open request",
      latestNote: request.latestReply || "",
      actionable: false,
    });
  }

  return items
    .filter((item) => !hasInternalVisibilityKeyword(item.title))
    .filter((item) => item.status !== "archived" && item.status !== "draft")
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
  return items.filter((item) => item.status === "pending");
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
  const baseName = campaignName || templateName || "Campaign";
  const variant = variantLabel ? ` ${variantLabel}` : "";
  return `Approve ${typeLabel.toLowerCase()} for ${baseName}${variant ? ` — Variant ${variantLabel}` : ""}`;
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

export function findApprovalByEntity(approvals: ApprovalRecord[], entityType: string, entityId: string) {
  return approvals.find((approval) => approval.entityType === entityType && approval.entityId === entityId) || null;
}
