// Leads requests use the same-origin `/api` proxy in production so the
// browser never depends on a flaky public API host.
const ENV_BASE_URL = String(import.meta.env.VITE_LEADS_API_BASE_URL || "").trim();
export const LEADS_API_BASE_URL = resolveApiBaseUrl(ENV_BASE_URL);
export const INTERGRAI_CLIENT_SLUG = "expert-technology-solutions";
const IS_DEV = Boolean(import.meta.env?.DEV);
const AUTH_TOKEN_STORAGE_KEY = "ets-auth-token";

export interface ApiClientSummary {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  status?: string;
  client_agent_name?: string;
  created_at?: string;
}

export interface DashboardResponse {
  ok: boolean;
  client: ApiClientSummary;
  campaign_counts: {
    total: number;
    active: number;
    draft: number;
  };
  lead_counts: {
    total: number;
    hot: number;
    warm: number;
    review: number;
    not_qualified: number;
    enrichment_queue?: number;
    outreach_ready?: number;
    contacted?: number;
    emails_sent_today?: number;
    replies_received?: number;
    blocked_avoided?: number;
    company_found?: number;
    needs_review?: number;
  };
  recent_leads: unknown[];
  pending_approvals: unknown[];
  recent_reports: unknown[];
}

export interface CanonicalLeadCounts {
  allLeads: number;
  totalLeadsFound: number;
  companyFound: number;
  enrichmentQueue: number;
  outreachReady: number;
  contacted: number;
  repliesReceived: number;
  blockedAvoided: number;
  needsReview: number;
  emailsSentToday: number;
}

export interface LeadsResponse {
  ok: boolean;
  client: ApiClientSummary;
  count: number;
  records: unknown[];
  returnedCount: number;
  loadedCount: number;
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  counts: CanonicalLeadCounts;
  summary: Record<string, unknown>;
  leads: unknown[];
}

export interface CampaignsResponse {
  ok: boolean;
  client: ApiClientSummary;
  count: number;
  campaigns: CampaignRecord[];
}

export interface ReportsResponse {
  ok: boolean;
  client: ApiClientSummary;
  count: number;
  reports: unknown[];
}

export interface RequestsResponse {
  ok: boolean;
  client: ApiClientSummary;
  count: number;
  requests: unknown[];
}

export interface MissionRecord {
  id: string;
  title: string;
  instruction: string;
  status: string;
  priority: string;
  missionType: string;
  assignedWorkerType: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalRecord {
  id: string;
  entityType: string;
  entityId: string;
  approvalType: string;
  title: string;
  status: string;
  decisionStatus: string;
  decisionNote: string;
  requestedByName: string;
  decidedByName: string;
  decidedAt?: string;
  details: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnrichmentCreditApprovalRecord {
  queueItemId: string;
  approvalId: string;
  companyName: string;
  contactName: string;
  targetRole: string;
  providerLabel: string;
  rawLeadId: string;
  rawLeadStatus: string;
  campaignId: string;
  campaignName: string;
  queueStatus: string;
  creditApprovalStatus: string;
  providerStatus: string;
  apolloPlanned: boolean;
  hunterPlanned: boolean;
  approvalDetails: Record<string, unknown>;
  approvalMetadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnrichmentBudgetSummary {
  apolloMonthlyLimit: number;
  apolloUsed: number;
  apolloRemaining: number;
  hunterMonthlyLimit: number;
  hunterUsed: number;
  hunterRemaining: number;
}

export interface WeeklyReportRecord {
  id: string;
  title: string;
  status: string;
  summary: string;
  periodStart?: string;
  periodEnd?: string;
  payload: Record<string, unknown>;
  createdAt?: string;
}

export interface OutreachTemplateVariantRecord {
  id: string;
  variantLabel: string;
  status: string;
  approvalStatus: string;
  approvalId: string;
  approvalDecisionStatus: string;
  approvalDecisionNote: string;
  subjectTemplate: string;
  bodyTemplate: string;
  imageSettings: TemplateImageSettings;
  selectedImageAsset: OutreachAssetRecord | null;
  imageValidation: TemplateImageValidation;
  latestQualityReview: TemplateQualityReviewRecord | null;
  metadata: Record<string, unknown>;
  callToAction: string;
  signature: string;
  previousSubject: string;
  previousBody: string;
  previousApprovalStatus: string;
}

export interface OutreachTemplateRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  name: string;
  channel: string;
  templateType: string;
  status: string;
  approvalStatus: string;
  subjectTemplate: string;
  bodyTemplate: string;
  campaignImagesEnabled: boolean;
  metadata: Record<string, unknown>;
  variants: OutreachTemplateVariantRecord[];
}

export interface FollowupSequenceRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  name: string;
  status: string;
  approvalStatus: string;
  approvalId: string;
  approvalDecisionStatus: string;
  approvalDecisionNote: string;
  followupCount: number;
  metadata: Record<string, unknown>;
}

export interface OutreachQueueRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  status: string;
  approvalStatus: string;
  mailboxStatus: string;
  variantLabel: string;
  sequenceName: string;
  leadCompanyName: string;
  rawCompanyName: string;
  recipientEmail: string;
  recipientName: string;
  renderPreviewAvailable: boolean;
  blockers: OutreachBlockerRecord[];
  resolvedImage: ResolvedImagePreview | null;
  latestQualityReview: TemplateQualityReviewRecord | null;
  scheduledFor?: string;
}

export interface TemplateImageSettings {
  includeImage: boolean;
  assetId: string;
  placement: string;
  altText: string;
  fallbackText: string;
  maxWidth?: number | null;
  imagePurpose: string;
  approvalNotes: string;
  allowInEmailBody: boolean;
}

export interface TemplateImageValidation {
  valid: boolean;
  included: boolean;
  campaignImagesEnabled: boolean;
  blockers: OutreachBlockerRecord[];
  warnings: OutreachBlockerRecord[];
}

export interface OutreachAssetRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  templateVariantId: string;
  templateName: string;
  variantLabel: string;
  assetType: string;
  title: string;
  description: string;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSize?: number | null;
  altText: string;
  placement: string;
  status: string;
  visibility: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageMaxWidth?: number | null;
  imagePurpose: string;
  approvalNotes: string;
  allowInEmailBody: boolean;
  approvalId: string;
  approvalStatus: string;
  approvalDecisionNote: string;
  createdByName: string;
  approvedByName: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  metadata: Record<string, unknown>;
}

export interface ResolvedImagePreview {
  required: boolean;
  included: boolean;
  placement: string;
  altText: string;
  fallbackText: string;
  maxWidth?: number | null;
  blockers: OutreachBlockerRecord[];
  warnings: OutreachBlockerRecord[];
  asset: OutreachAssetRecord | null;
  campaignImagesEnabled: boolean;
}

export interface TemplateQualityReviewRecord {
  id: string;
  score: number;
  status: string;
  humanSoundingScore: number;
  specificityScore: number;
  salesClarityScore: number;
  ctaScore: number;
  riskFlags: Array<{ code: string; detail?: string }>;
  recommendations: string[];
  reviewedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationMessageRecord {
  id: string;
  conversationId: string;
  outreachQueueId: string;
  direction: string;
  provider: string;
  providerMessageId: string;
  subject: string;
  bodyText: string;
  fromEmail: string;
  toEmail: string;
  status: string;
  sentAt?: string;
  receivedAt?: string;
  createdAt?: string;
  metadata: Record<string, unknown>;
}

export interface ReplyDraftRecord {
  id: string;
  conversationId: string;
  inboundMessageId: string;
  draftSubject: string;
  draftBody: string;
  status: string;
  modelRouteUsed: string;
  approvalNote: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy: Record<string, unknown>;
  trainingContextUsed: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
}

export interface ConversationRecord {
  id: string;
  outreachQueueId: string;
  campaignId: string;
  campaignName: string;
  companyName: string;
  contactName: string;
  displayContactName?: string;
  contactEmail: string;
  status: string;
  replyStatus: string;
  latestSubject: string;
  latestSnippet: string;
  messageCount: number;
  previewOnly: boolean;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
  latestQualityReview: TemplateQualityReviewRecord | null;
  latestReplyDraft: ReplyDraftRecord | null;
  replyDrafts: ReplyDraftRecord[];
  messages: ConversationMessageRecord[];
}

export interface AgentTrainingEntryRecord {
  id: string;
  category: string;
  title: string;
  content: string;
  visibility: string;
  status: string;
  source: string;
  appliesTo: string;
  campaignId: string;
  campaignName: string;
  createdByName: string;
  createdByEmail: string;
  createdAt?: string;
  updatedAt?: string;
  metadata: Record<string, unknown>;
}

export interface TrainingClassificationSuggestion {
  category: string;
  appliesTo: string;
  confidence: number;
  reason: string;
}

export interface ResponseRuleCategoryRecord {
  key: string;
  label: string;
  description: string;
  triggerPhrases: string[];
  actionType: string;
  defaultSubject: string;
  defaultBody: string;
  requiresHumanReview: boolean;
  manualReplyRequired: boolean;
  draftReplyEnabled: boolean;
}

export interface ResponseRuleRecord {
  id: string;
  approvalId: string;
  campaignId: string;
  campaignName: string;
  campaignVariantId: string;
  templateName: string;
  variantLabel: string;
  ruleKey: string;
  ruleKind: string;
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  triggerType: string;
  triggerPhrases: string[];
  conditions: Record<string, unknown>;
  actionType: string;
  manualReplyRequired: boolean;
  draftReplyEnabled: boolean;
  autoReplyEnabled: boolean;
  autoReplyStatus: string;
  autoReplyDelayMinutes?: number | null;
  autoReplyWindowStart: string;
  autoReplyWindowEnd: string;
  autoReplyDurationDays?: number | null;
  maxAutoRepliesPerConversation: number;
  replyTemplateSubject: string;
  replyTemplateBody: string;
  enabled: boolean;
  defaultRule: boolean;
  requiresApproval: boolean;
  status: string;
  visibility: string;
  priority: number;
  scopeLevel: string;
  appliesToLabel: string;
  createdByName: string;
  updatedByName: string;
  approvedByName: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata: Record<string, unknown>;
}

export interface OutreachBlockerRecord {
  code: string;
  count?: number;
  message?: string;
}

export interface MailboxRecord {
  id: string;
  mailboxName: string;
  fromName: string;
  fromEmail: string;
  providerType: string;
  connectionStatus: string;
  sendingEnabled: boolean;
  dailySendLimit?: number | null;
  monthlySendLimit?: number | null;
  sentToday: number;
  sentThisMonth: number;
  lastHealthCheckAt?: string;
  lastError: string;
}

export interface MailboxConnectionCheck {
  providerType: string;
  configured: boolean;
  configurationMode: string;
  connected: boolean;
  connectionStatus: string;
  apiKeyConfigured?: boolean;
  oauthConfigured?: boolean;
  encryptionReady?: boolean;
  credentialsStored?: boolean;
  expectedMailbox?: string;
  signedInMailbox?: string;
  signedInUser?: string;
  senderStatus?: string;
  senderVerified?: boolean;
  defaultFromDomain?: string;
  checkedAt?: string;
  blockers: OutreachBlockerRecord[];
}

export interface MailboxOAuthStartResponse {
  mailboxId: string;
  mailboxName: string;
  providerType: string;
  connectionStatus: string;
  authUrl: string;
  expiresAt?: string;
  redirectUri: string;
  scopes: string[];
  sendingEnabled: boolean;
  note: string;
}

export interface MicrosoftReplySyncStatusRecord {
  mailboxId: string;
  mailboxName: string;
  mailboxEmail: string;
  providerType: string;
  connectionStatus: string;
  connected: boolean;
  configured: boolean;
  credentialsStored: boolean;
  signedInMailbox: string;
  signedInUser: string;
  blockers: OutreachBlockerRecord[];
}

export interface OutreachRenderPreview {
  dryRun: boolean;
  renderable: boolean;
  fromName: string;
  fromEmail: string;
  recipientName: string;
  recipientEmail: string;
  companyName: string;
  subject: string;
  body: string;
  htmlBody: string;
  image: ResolvedImagePreview | null;
  missingPlaceholders: string[];
  template: {
    name: string;
    type: string;
    variantLabel: string;
  };
  followupSequence: {
    name: string;
    followupCount: number;
  };
  metadata: {
    queueItemId: string;
    queueStatus: string;
    approvalStatus: string;
    mailboxStatus: string;
    providerType: string;
  };
}

export interface VerifiedContactPlanningRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  companyName: string;
  contactName: string;
  contactTitle: string;
  email: string;
  emailStatus: string;
  providerStatus: string;
  planningStatus: string;
  outreachQueueId: string;
  outreachQueueStatus: string;
  approvalStatus: string;
  mailboxStatus: string;
  variantLabel: string;
  sequenceName: string;
  blockers: OutreachBlockerRecord[];
  verifiedAt?: string;
  updatedAt?: string;
}

export interface LeadAgentClientFacingCounts {
  totalLeadsFound: number;
  qualifiedLeads: number;
  enrichmentQueue: number;
  outreachReady: number;
  outreachPrepared: number;
  contacted: number;
  emailsSent: number;
  emailsSentToday: number;
  repliesReceived: number;
  blockedAvoided: number;
  companyFound: number;
  needsReview: number;
  positiveReplies: number;
  meetingsQuoteRequests: number;
}

export interface LeadAgentAdminSummary {
  rawLeadsCount: number;
  enrichmentQueueCount: number;
  totalApprovalsCount: number;
  archivedMissionsCount: number;
  internalRequestsCount: number;
  testConversationsCount: number;
  enrichmentProviderStatusSummary: Array<{ status: string; count: number }>;
}

export interface CampaignLaunchStateRecord {
  campaignId: string;
  campaignName: string;
  campaignApprovalStatus: string;
  campaignStatusLabel: string;
  firstContactTemplateStatus: string;
  followupStatus: string;
  imageAssetStatus: string;
  launchState: string;
  sendableLeadsCount: number;
  preparedLeadsCount: number;
  queuedUnsentCount: number;
  sentCount: number;
  blockers: string[];
  nextAction: string;
  mailboxReady: boolean;
  sendingEnabled: boolean;
  limitsMatch: boolean;
  canSendNow: boolean;
}

export interface LeadAgentSummary {
  ok: boolean;
  client: ApiClientSummary;
  agent: {
    id: string;
    name: string;
    status: string;
    roleScope: string;
    lastHeartbeatAt?: string;
  } | null;
  activeMissions: MissionRecord[];
  openRequests: RequestHistoryRecord[];
  campaigns: CampaignRecord[];
  leadPipelineCounts: Array<{ stage: string; count: number }>;
  rawLeadsCount: number;
  rawLeadStatusCounts: Array<{ status: string; count: number }>;
  enrichmentQueueCount: number;
  enrichmentQueueStatusCounts: Array<{ status: string; count: number }>;
  enrichmentUsageSummary: {
    apolloAttempted: number;
    hunterAttempted: number;
    apolloUsed: number;
    hunterUsed: number;
  };
  enrichmentBudgetSummary: EnrichmentBudgetSummary;
  outreachTemplates: OutreachTemplateRecord[];
  followupSequences: FollowupSequenceRecord[];
  outreachQueueCount: number;
  outreachQueueStatusCounts: Array<{ status: string; count: number }>;
  outreachQueue: OutreachQueueRecord[];
  verifiedContactsCount: number;
  outreachPlannedCount: number;
  sendReadyCount: number;
  waitingForMailboxCount: number;
  outreachBlockers: OutreachBlockerRecord[];
  verifiedContactsWaitingForOutreach: VerifiedContactPlanningRecord[];
  mailboxStatus: string;
  mailboxConnected: boolean;
  sendingEnabled: boolean;
  sendReady: boolean;
  mailboxFromName: string;
  mailboxFromEmail: string;
  mailboxProviderType: string;
  mailboxDailySendLimit?: number | null;
  mailboxMonthlySendLimit?: number | null;
  mailboxSentToday: number;
  mailboxSentThisMonth: number;
  mailboxLastError: string;
  mailboxLastHealthCheckAt?: string;
  mailboxReadinessBlockers: OutreachBlockerRecord[];
  mailboxConnectionCheck: MailboxConnectionCheck | null;
  launchMode: string;
  launchReady: boolean;
  anyCampaignReady: boolean;
  campaignLaunchStates: CampaignLaunchStateRecord[];
  campaignsApprovedCount: number;
  campaignsWaitingApprovalCount: number;
  campaignsReadyToLaunchCount: number;
  campaignsLiveCount: number;
  templatesWaitingApprovalCount: number;
  followupsWaitingApprovalCount: number;
  unapprovedRequiredAssetsCount: number;
  renderPreviewAvailableCount: number;
  outreachAssets: OutreachAssetRecord[];
  responseRules: ResponseRuleRecord[];
  responseRuleCategories: ResponseRuleCategoryRecord[];
  responseRulesCount: number;
  approvedResponseRulesCount: number;
  autoReplyRulesConfiguredCount: number;
  autoReplyRulesEnabledCount: number;
  mailboxes: MailboxRecord[];
  approvalsWaiting: number;
  approvals: ApprovalRecord[];
  pendingEnrichmentCreditApprovals: EnrichmentCreditApprovalRecord[];
  clientFacingCounts: LeadAgentClientFacingCounts;
  currentCampaignFocus: string;
  expertLeadAgentState: string;
  expertLeadAgentStateLabel: string;
  newLeadsSourcedToday: number;
  repliesWaitingApproval: number;
  adminSummary: LeadAgentAdminSummary;
  latestQualificationActions: Array<{
    id: string;
    companyName: string;
    status: string;
    qualificationScore: number;
    qualificationNotes: string;
    modelRouteUsed: string;
    confidenceScore: number;
    escalationRequired: boolean;
    updatedAt?: string;
  }>;
  latestEnrichmentActions: Array<{
    id: string;
    rawLeadId: string;
    status: string;
    eligibilityStatus: string;
    budgetCheckStatus: string;
    apolloPlanned: boolean;
    hunterPlanned: boolean;
    creditApprovalStatus: string;
    providerStatus: string;
    providerError: string;
    enrichedContactName: string;
    enrichedContactTitle: string;
    enrichedEmail: string;
    enrichedEmailStatus: string;
    enrichedPhone: string;
    enrichedSource: string;
    enrichmentNotes: string;
    modelRouteUsed: string;
    confidenceScore: number;
    requiresApproval: boolean;
    lastProcessedAt?: string;
    updatedAt?: string;
  }>;
  latestWeeklyReport: WeeklyReportRecord | null;
  internalNotes: Array<{
    id: string;
    note: string;
    createdByName: string;
    createdByRole: string;
    createdAt?: string;
  }>;
}

export type LeadQualification = "review" | "warm" | "hot" | "not_qualified";
export type LeadWorkflowStatus =
  | "new"
  | "reviewed"
  | "contacted"
  | "interested"
  | "not_interested"
  | "follow_up"
  | "meeting_booked"
  | "converted"
  | "rejected";
export type CampaignLifecycleStatus = "active" | "paused" | "completed" | "draft";
export type CampaignApprovalStatus =
  | "pending"
  | "pending_client_approval"
  | "pending_review"
  | "pending_approval"
  | "waiting_for_approval"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "archived"
  | "draft"
  | "none";
export type RequestCategory =
  | "new_campaign"
  | "campaign_change"
  | "lead_question"
  | "outreach_draft"
  | "support_issue";
export type RequestVisibleStatus =
  | "submitted"
  | "under_review"
  | "in_progress"
  | "waiting_on_you"
  | "completed"
  | "rejected";

export interface LeadUserSummary {
  name: string;
  email: string;
  role: string;
}

export interface LeadActivityRecord {
  id: string;
  type: "status_change" | "comment" | "activity";
  status?: string;
  comment?: string;
  message: string;
  createdAt?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

export interface LeadRecord {
  id: string;
  name: string;
  displayContactName: string;
  company: string;
  title: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  domain: string;
  linkedinUrl: string;
  companyLinkedin: string;
  qualification: LeadQualification;
  rawStatus: string;
  status: string;
  displayStatus: string;
  canonicalStatus: string;
  clientStatusLabel: string;
  clientVisibleStatus: string;
  internalDisplayStatus: string;
  workflowStatus: string;
  campaignName: string;
  leadScore: number;
  matchReason: string;
  sourceUrl: string;
  sourceEvidence: string;
  sourceProvider: string;
  sourceType: string;
  decisionMakerPath: string[];
  enrichmentStatus: string;
  outreachStatus: string;
  replyDraftStatus: string;
  nextAction: string;
  manualReviewRequired: boolean;
  trueHumanReviewRequired: boolean;
  qualityReasons: string[];
  lastActivity?: string;
  createdAt?: string;
  foundAt?: string;
  lastUpdated?: string;
  isSendable: boolean;
  isContacted: boolean;
  isExcluded: boolean;
  isDuplicateSuppressed: boolean;
  isVisible: boolean;
  clientVisible: boolean;
}

export interface CampaignRecord {
  id: string;
  name: string;
  status: CampaignLifecycleStatus;
  approvalStatus: CampaignApprovalStatus;
  targetNiche: string;
  targetLocation: string;
  objective: string;
  targetDecisionMakers: string[];
  servicesOffers: string[];
  qualificationQuestions: string[];
  keySellingPoints: string[];
  callToAction: string;
  notes: string;
  imagesEnabled: boolean;
  hiddenFromClient: boolean;
  leadCount?: number;
  launchState: string;
  launchBlockers: string[];
  launchNextAction: string;
  firstContactTemplateStatus: string;
  followupStatus: string;
  imageAssetStatus: string;
  sendableLeadsCount: number;
  queuedUnsentCount: number;
  sentCount: number;
  sourcedLeads: number;
  qualifiedLeads: number;
  visibleLeads: number;
  outreachSent: number;
  replies: number;
  repliesWaitingApproval: number;
  nextAction: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PendingApprovalRecord {
  id: string;
  name: string;
  summary: string;
  status: CampaignApprovalStatus;
  createdAt?: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  summary: string;
  createdAt?: string;
}

export interface RequestReplyRecord {
  id: string;
  type: "message" | "reply" | "status_update" | "activity";
  message: string;
  createdAt?: string;
  authorName?: string;
  authorEmail?: string;
  authorRole?: string;
  status?: string;
}

export interface RequestHistoryRecord {
  id: string;
  category: string;
  title: string;
  message: string;
  clientVisibleStatus: string;
  createdAt?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByRole?: string;
  latestReply: string | null;
  latestReplyAt?: string;
}

export interface RequestDetailRecord extends RequestHistoryRecord {
  replies: RequestReplyRecord[];
}

// Exported (additive only - purely adding visibility, no behavior change) so
// the sequences/contacts-import/ai-health API modules can reuse the exact
// same fetch/auth/error-handling path instead of duplicating it.
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildApiUrl(path);
  const isMultipartBody = isFormDataBody(init.body);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: buildHeaders(init.headers, init.body !== undefined, isMultipartBody),
    });
  } catch (e: any) {
    const msg = `Leads API network error at ${url}: ${e?.message ?? String(e)}`;
    if (IS_DEV) console.error(msg, e);
    throw new Error(msg);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const raw = await response.text();
      detail = extractApiErrorMessage(raw) || raw.slice(0, 500);
    } catch {
      /* ignore */
    }
    const msg = detail || `Leads API request failed (${response.status}).`;
    if (IS_DEV) console.error(msg);
    throw new Error(msg);
  }

  let text = "";
  try {
    text = await response.text();
  } catch (e: any) {
    const msg = `Leads API unreadable response at ${url}: ${e?.message ?? String(e)}`;
    if (IS_DEV) console.error(msg, e);
    throw new Error(msg);
  }

  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch (e: any) {
    const snippet = text.slice(0, 500);
    const msg = `Leads API invalid JSON at ${url}${snippet ? ` — ${snippet}` : ""}`;
    if (IS_DEV) console.error(msg, e);
    throw new Error(msg);
  }
}

async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function getDashboard() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/dashboard`).then(normalizeDashboardResponse);
}

export function getLeads(options: {
  status?: string;
  campaign_id?: string;
  qualification?: string;
  industry?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.campaign_id) params.set("campaign_id", options.campaign_id);
  if (options.qualification) params.set("qualification", options.qualification);
  if (options.industry) params.set("industry", options.industry);
  if (options.search) params.set("search", options.search);
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/leads${suffix}`).then(normalizeLeadsResponse);
}

export function getCampaigns(options: { includeArchived?: boolean } = {}) {
  const params = new URLSearchParams();
  if (options.includeArchived) {
    params.set("include_archived", "1");
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/campaigns${suffix}`).then(normalizeCampaignsResponse);
}

export function getReports() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/reports`).then(normalizeReportsResponse);
}

export function getRequests() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/requests`).then(normalizeRequestsResponse);
}

export function getRequestDetail(requestId: string) {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/requests/${encodeURIComponent(requestId)}`).then(normalizeRequestDetail);
}

export function getLeadAgentSummary() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/lead-agent`).then(normalizeLeadAgentSummary);
}

export function getResponseRules() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/response-rules`).then((value) => {
    const record = asRecord(value);
    return {
      rules: asArray(record.response_rules).map((item, index) => normalizeResponseRule(item, index)),
      categories: asArray(record.response_rule_categories).map((item, index) => normalizeResponseRuleCategory(item, index)),
      responseRulesCount: normalizeCount(record.response_rules_count ?? record.responseRulesCount),
      approvedResponseRulesCount: normalizeCount(record.approved_response_rules_count ?? record.approvedResponseRulesCount),
      autoReplyRulesConfiguredCount: normalizeCount(record.auto_reply_rules_configured_count ?? record.autoReplyRulesConfiguredCount),
      autoReplyRulesEnabledCount: normalizeCount(record.auto_reply_rules_enabled_count ?? record.autoReplyRulesEnabledCount),
    };
  });
}

export function getOutreachRenderPreview(queueItemId: string) {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-queue/${encodeURIComponent(queueItemId)}/render-preview`).then(normalizeOutreachRenderPreviewResponse);
}

export function getConversations() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/conversations`).then((value) => {
    const record = asRecord(value);
    return asArray(record.conversations).map((item, index) => normalizeConversation(item, index));
  });
}

export function getConversationDetail(conversationId: string) {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/conversations/${encodeURIComponent(conversationId)}`).then((value) =>
    normalizeConversation(asRecord(asRecord(value).conversation))
  );
}

export function createReplyDraft(conversationId: string) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/conversations/${encodeURIComponent(conversationId)}/reply-drafts`, {
    method: "POST",
  }).then((value) => normalizeReplyDraft(asRecord(asRecord(value).reply_draft)));
}

export function updateReplyDraft(draftId: string, input: { status: string; approval_note?: string; draft_subject?: string; draft_body?: string }) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/reply-drafts/${encodeURIComponent(draftId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((value) => normalizeReplyDraft(asRecord(asRecord(value).reply_draft)));
}

export function createResponseRule(input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/response-rules`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeResponseRule(asRecord(asRecord(value).response_rule)));
}

export function updateResponseRule(ruleId: string, input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/response-rules/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((value) => normalizeResponseRule(asRecord(asRecord(value).response_rule)));
}

export function getAgentTraining() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/agent-training`).then((value) => {
    const record = asRecord(value);
    return asArray(record.entries).map((item, index) => normalizeAgentTrainingEntry(item, index));
  });
}

export function createAgentTrainingEntry(input: {
  category: string;
  title?: string;
  content: string;
  visibility?: string;
  status?: string;
  applies_to?: string;
}) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/agent-training`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeAgentTrainingEntry(asRecord(asRecord(value).entry)));
}

export function classifyAgentTrainingContent(content: string) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/agent-training/classify`, {
    method: "POST",
    body: JSON.stringify({ content }),
  }).then((value) => normalizeTrainingClassificationSuggestion(asRecord(asRecord(value).suggestion)));
}

export function updateAgentTrainingEntry(entryId: string, input: {
  category?: string;
  title?: string;
  content?: string;
  status?: string;
  visibility?: string;
  applies_to?: string;
}) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/agent-training/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((value) => normalizeAgentTrainingEntry(asRecord(asRecord(value).entry)));
}

export function createCampaign(input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/campaigns`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeCampaign(asRecord(asRecord(value).campaign)));
}

export function updateCampaign(campaignId: string, input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((value) => normalizeCampaign(asRecord(asRecord(value).campaign)));
}

export function archiveCampaign(campaignId: string) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/campaigns/${encodeURIComponent(campaignId)}/archive`, {
    method: "POST",
  }).then((value) => normalizeCampaign(asRecord(asRecord(value).campaign)));
}

export function startMailboxOAuth(mailboxId: string) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/mailboxes/${encodeURIComponent(mailboxId)}/oauth/google/start`, {
    method: "POST",
  }).then(normalizeMailboxOAuthStartResponse);
}

export function startMicrosoftReplySyncOAuth() {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/reply-sync/microsoft/start`, {
    method: "POST",
  }).then(normalizeMailboxOAuthStartResponse);
}

export function getMicrosoftReplySyncStatus() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/reply-sync/microsoft/status`).then(normalizeMicrosoftReplySyncStatus);
}

export function getEnrichmentApprovals() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/enrichment-approvals`).then((value) => {
    const record = asRecord(value);
    return asArray(record.enrichment_approvals).map((item, index) => normalizeEnrichmentCreditApproval(item, index));
  });
}

export function createMission(input: {
  title: string;
  instruction: string;
  assigned_worker_type?: string;
  campaign_id?: string;
}) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/missions`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeMission(asRecord(asRecord(value).mission)));
}

export function decideApproval(approvalId: string, input: { decision: "approved" | "rejected" | "changes_requested" | "request_changes" | "waiting_for_approval"; decision_note?: string }) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/approvals/${encodeURIComponent(approvalId)}/decision`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeApproval(asRecord(asRecord(value).approval)));
}

export function decideCampaignApproval(campaignId: string, input: { decision: "approved" | "rejected" | "changes_requested" | "request_changes" | "waiting_for_approval"; decision_note?: string }) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/campaigns/${encodeURIComponent(campaignId)}/approval`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeCampaign(asRecord(asRecord(value).campaign)));
}

export function decideTemplateVariantApproval(variantId: string, input: { decision: "approved" | "rejected" | "changes_requested" | "request_changes" | "waiting_for_approval"; decision_note?: string }) {
  const normalizedDecision = input.decision === "request_changes" ? "changes_requested" : input.decision;
  const action = normalizedDecision === "approved"
    ? "approve"
    : normalizedDecision === "changes_requested"
      ? "request-changes"
      : normalizedDecision === "waiting_for_approval"
        ? "unapprove"
        : "decline";
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-template-variants/${encodeURIComponent(variantId)}/${action}`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeApproval(asRecord(asRecord(value).approval)));
}

export function requestTemplateVariantChanges(variantId: string, input: { decision_note?: string }) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-template-variants/${encodeURIComponent(variantId)}/request-changes`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeApproval(asRecord(asRecord(value).approval)));
}

export function decideFollowupSequenceApproval(sequenceId: string, input: { decision: "approved" | "rejected" | "changes_requested" | "request_changes" | "waiting_for_approval"; decision_note?: string }) {
  const normalizedDecision = input.decision === "request_changes" ? "changes_requested" : input.decision;
  const action = normalizedDecision === "approved"
    ? "approve"
    : normalizedDecision === "changes_requested"
      ? "request-changes"
      : normalizedDecision === "waiting_for_approval"
        ? "unapprove"
        : "decline";
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/${action}`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeApproval(asRecord(asRecord(value).approval)));
}

export function requestFollowupSequenceChanges(sequenceId: string, input: { decision_note?: string }) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/request-changes`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeApproval(asRecord(asRecord(value).approval)));
}

export function decideEnrichmentCreditApproval(queueItemId: string, input: { decision: "approved" | "rejected"; decision_note?: string }) {
  const action = input.decision === "approved" ? "approve" : "decline";
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/enrichment-approvals/${encodeURIComponent(queueItemId)}/${action}`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeEnrichmentCreditApproval(asRecord(asRecord(value).enrichment_queue_item)));
}

export function createRequest(input: {
  category: string;
  title: string;
  message: string;
  created_by_name: string;
  created_by_email: string;
  created_by_role: string;
}) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/requests`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then(normalizeRequestDetail);
}

export function createOutreachAsset(input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-assets`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeOutreachAsset(asRecord(asRecord(value).outreach_asset)));
}

export function uploadOutreachAssetFile(formData: FormData) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-assets/upload`, {
    method: "POST",
    body: formData,
  }).then((value) => normalizeOutreachAsset(asRecord(asRecord(value).outreach_asset)));
}

export function updateOutreachAsset(assetId: string, input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-assets/${encodeURIComponent(assetId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((value) => normalizeOutreachAsset(asRecord(asRecord(value).outreach_asset)));
}

export function updateCampaignImageSettings(campaignId: string, input: { images_enabled: boolean }) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/campaigns/${encodeURIComponent(campaignId)}/image-settings`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((value) => normalizeCampaign(asRecord(asRecord(value).campaign)));
}

export function updateTemplateVariantImageSettings(variantId: string, input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-template-variants/${encodeURIComponent(variantId)}/image-settings`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((value) => normalizeOutreachTemplateVariant(asRecord(asRecord(value).template_variant)));
}

export function updateTemplateVariantContent(variantId: string, input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-template-variants/${encodeURIComponent(variantId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then((value) => normalizeOutreachTemplateVariant(asRecord(asRecord(value).template_variant)));
}

export function createOutreachTemplate(input: Record<string, unknown>) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-templates`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((value) => normalizeOutreachTemplateVariant(asRecord(asRecord(value).template_variant)));
}

export function archiveOutreachTemplateVariant(variantId: string) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/outreach-template-variants/${encodeURIComponent(variantId)}/archive`, {
    method: "POST",
  }).then((value) => normalizeOutreachTemplateVariant(asRecord(asRecord(value).template_variant)));
}

export function updateLeadStatus(leadId: string, status: LeadWorkflowStatus, user: LeadUserSummary) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/leads/${encodeURIComponent(leadId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      updated_by_name: user.name,
      updated_by_email: user.email,
    }),
  }).then((value) => normalizeLeadStatus(getActivityStatus(value)) || status);
}

export function addLeadComment(leadId: string, comment: string, user: LeadUserSummary) {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/leads/${encodeURIComponent(leadId)}/comments`, {
    method: "POST",
    body: JSON.stringify({
      comment,
      created_by_name: user.name,
      created_by_email: user.email,
      visibility: "client",
    }),
  }).then(normalizeLeadActivityRecord);
}

export function getLeadActivity(leadId: string) {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/leads/${encodeURIComponent(leadId)}/activity`).then(normalizeLeadActivityResponse);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeNullableRecord<T>(value: unknown, normalizer: (value: unknown) => T): T | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return normalizer(value);
}

function resolveApiBaseUrl(value: string): string {
  const trimmed = value.replace(/\/+$/, "");
  if (!trimmed) return "/api";
  if (trimmed.startsWith("/")) return trimmed;

  try {
    return new URL(trimmed).toString().replace(/\/+$/, "");
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString().replace(/\/+$/, "");
    } catch {
      return "/api";
    }
  }
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${LEADS_API_BASE_URL}${normalizedPath}`;
}

function buildHeaders(headers: HeadersInit | undefined, hasBody: boolean, isMultipartBody = false): Headers {
  const next = new Headers(headers);
  if (!next.has("Accept")) next.set("Accept", "application/json");
  if (hasBody && !isMultipartBody && !next.has("Content-Type")) next.set("Content-Type", "application/json");

  const authToken = getStoredAuthToken();
  if (authToken && !next.has("Authorization")) {
    next.set("Authorization", `Bearer ${authToken}`);
  }

  return next;
}

function isFormDataBody(body: RequestInit["body"]) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function pickStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeEmailLocalPart(value: unknown): string {
  const email = String(value || "").trim();
  if (!email || !email.includes("@")) {
    return "";
  }

  return email.split("@")[0].trim().toLowerCase();
}

function isGenericInboxEmail(value: unknown): boolean {
  const localPart = normalizeEmailLocalPart(value);
  return Boolean(localPart) && /^(info|sales|admin|support|hello|contact|enquiries?|enquiry|office|team|accounts|billing|finance|marketing|bookings?|careers?|jobs?|hr|help|mw\d+|no[-_.]?reply)$/i.test(localPart);
}

function formatReadableLocalPart(localPart: string): string {
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => (part.match(/^\d+$/) ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

function getPersonalDisplayNameFromEmail(email: unknown): string {
  const value = String(email || "").trim();
  if (!value || isGenericInboxEmail(value)) {
    return "";
  }

  const localPart = normalizeEmailLocalPart(value);
  return localPart ? formatReadableLocalPart(localPart) : "";
}

function isPlaceholderLeadLabel(value: unknown): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return [
    "",
    "-",
    "n/a",
    "na",
    "unknown",
    "unknown contact",
    "unknown title",
    "unnamed lead",
    "untitled",
    "tbd"
  ].includes(normalized);
}

function hasMaskedDisplayMarker(value: unknown): boolean {
  return /[*•·]{2,}/.test(String(value || ""));
}

function formatLeadDisplayName(record: Record<string, unknown>, fallbackCompany = ""): string {
  const company = pickString(record, ["company_name", "company", "lead_company_name", "raw_company_name"]) || fallbackCompany;
  const serverDisplayName = pickString(record, ["display_contact_name", "displayContactName"]) || "";
  const title = pickString(record, ["title", "contact_title", "lead_title", "enriched_contact_title", "job_title", "jobTitle", "role", "position"]) || "";
  const contactCandidates = [
    serverDisplayName,
    pickString(record, ["contact_name", "enriched_contact_name", "lead_contact_name", "raw_contact_name", "name", "full_name", "fullName"]) || ""
  ].filter((candidate) => Boolean(candidate) && !isPlaceholderLeadLabel(candidate) && !hasMaskedDisplayMarker(candidate));
  const contactName = contactCandidates[0] || "";
  const email = pickString(record, ["enriched_email", "lead_email", "email"]) || "";

  if (contactName && !isPlaceholderLeadLabel(contactName)) {
    return contactName;
  }

  if (title && !isPlaceholderLeadLabel(title) && !hasMaskedDisplayMarker(title)) {
    return title;
  }

  if (company) {
    return isGenericInboxEmail(email) ? `Generic inbox at ${company}` : "Decision-maker not verified yet";
  }

  return isGenericInboxEmail(email) ? "Generic inbox" : "Decision-maker not verified yet";
}

function normalizeStatusCounts(value: unknown): Array<{ status: string; count: number }> {
  if (asArray(value).length) {
    return asArray(value)
      .map((item) => {
        const record = asRecord(item);
        return {
          status: pickString(record, ["status", "label", "name", "stage"]) || "",
          count: normalizeCount(record.count ?? record.value ?? record.total),
        };
      })
      .filter((entry) => Boolean(entry.status));
  }

  return Object.entries(asRecord(value))
    .map(([status, count]) => ({
      status,
      count: normalizeCount(count),
    }))
    .filter((entry) => Boolean(entry.status));
}

function normalizeStageLabel(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function leadPipelineStageRank(value: string) {
  switch (normalizeStageLabel(value)) {
    case "found":
      return 0;
    case "qualified":
      return 1;
    case "prepared":
      return 2;
    case "contacted":
      return 3;
    case "interested":
      return 4;
    case "meetings / quotes":
    case "meetings quotes":
    case "meetings":
    case "quotes":
      return 5;
    default:
      return 99;
  }
}

function ensurePipelineStages(
  pipelineEntries: Array<{ stage: string; count: number }>,
  fallbackCounts: Record<"Found" | "Qualified" | "Prepared" | "Contacted" | "Interested" | "Meetings / Quotes", number>,
) {
  const byStage = new Map(pipelineEntries.map((entry) => [normalizeStageLabel(entry.stage), entry.count] as const));
  return [
    { stage: "Found", count: byStage.get("found") ?? fallbackCounts.Found },
    { stage: "Qualified", count: byStage.get("qualified") ?? fallbackCounts.Qualified },
    { stage: "Prepared", count: byStage.get("prepared") ?? fallbackCounts.Prepared },
    { stage: "Contacted", count: byStage.get("contacted") ?? fallbackCounts.Contacted },
    { stage: "Interested", count: byStage.get("interested") ?? fallbackCounts.Interested },
    { stage: "Meetings / Quotes", count: byStage.get("meetings / quotes") ?? byStage.get("meetings quotes") ?? byStage.get("meetings") ?? byStage.get("quotes") ?? fallbackCounts["Meetings / Quotes"] },
  ];
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Number.isNaN(Date.parse(trimmed)) ? undefined : trimmed;
}

function normalizeLeadStatus(value: unknown): LeadWorkflowStatus | undefined {
  if (typeof value !== "string") return undefined;

  switch (value.trim().toLowerCase()) {
    case "new":
    case "reviewed":
    case "contacted":
    case "interested":
    case "not_interested":
    case "follow_up":
    case "meeting_booked":
    case "converted":
    case "rejected":
      return value.trim().toLowerCase() as LeadWorkflowStatus;
    default:
      return undefined;
  }
}

function normalizeClientSummary(value: unknown): ApiClientSummary {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || INTERGRAI_CLIENT_SLUG,
    slug: pickString(record, ["slug"]) || INTERGRAI_CLIENT_SLUG,
    name: pickString(record, ["name", "client_name", "clientName"]) || "Expert Technology Solutions",
    domain: pickString(record, ["domain", "website", "url"]),
    status: pickString(record, ["status"]) || "unknown",
    client_agent_name: pickString(record, ["client_agent_name", "clientAgentName"]),
    created_at: normalizeTimestamp(record.created_at ?? record.createdAt),
  };
}

function normalizeCanonicalLeadCounts(value: unknown): CanonicalLeadCounts {
  const record = asRecord(value);
  return {
    allLeads: normalizeCount(record.all_leads ?? record.allLeads ?? record.total_leads_found ?? record.totalLeadsFound),
    totalLeadsFound: normalizeCount(record.total_leads_found ?? record.totalLeadsFound ?? record.all_leads ?? record.allLeads),
    companyFound: normalizeCount(record.company_found ?? record.companyFound),
    enrichmentQueue: normalizeCount(record.enrichment_queue ?? record.enrichmentQueue),
    outreachReady: normalizeCount(record.outreach_ready ?? record.outreachReady),
    contacted: normalizeCount(record.contacted),
    repliesReceived: normalizeCount(record.replies_received ?? record.repliesReceived),
    blockedAvoided: normalizeCount(record.blocked_avoided ?? record.blockedAvoided),
    needsReview: normalizeCount(record.needs_review ?? record.needsReview ?? record.manual_review ?? record.manualReview),
    emailsSentToday: normalizeCount(record.emails_sent_today ?? record.emailsSentToday),
  };
}

function buildZeroCanonicalLeadCounts(): CanonicalLeadCounts {
  return {
    allLeads: 0,
    totalLeadsFound: 0,
    companyFound: 0,
    enrichmentQueue: 0,
    outreachReady: 0,
    contacted: 0,
    repliesReceived: 0,
    blockedAvoided: 0,
    needsReview: 0,
    emailsSentToday: 0,
  };
}

function normalizeDashboardResponse(value: unknown): DashboardResponse {
  const record = asRecord(value);
  const campaignCounts = asRecord(record.campaign_counts);
  const leadCounts = asRecord(record.lead_counts);
  const normalizedCanonicalCounts = normalizeCanonicalLeadCounts(leadCounts);
  const normalizedCampaignActive = normalizeCount(campaignCounts.active);
  const normalizedCampaignDraft = normalizeCount(campaignCounts.draft);
  const normalizedCampaignTotal = normalizeCount(campaignCounts.total);
  const normalizedLeadHot = normalizeCount(leadCounts.hot);
  const normalizedLeadWarm = normalizeCount(leadCounts.warm);
  const normalizedLeadReview = normalizeCount(leadCounts.review);
  const normalizedLeadNotQualified = normalizeCount(leadCounts.not_qualified ?? leadCounts.notQualified);
  const normalizedLeadTotal = normalizeCount(leadCounts.total);

  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    client: normalizeClientSummary(record.client),
    campaign_counts: {
      total: normalizedCampaignTotal || normalizedCampaignActive + normalizedCampaignDraft,
      active: normalizedCampaignActive,
      draft: normalizedCampaignDraft,
    },
    lead_counts: {
      total: normalizedLeadTotal || normalizedLeadHot + normalizedLeadWarm + normalizedLeadReview + normalizedLeadNotQualified,
      hot: normalizedLeadHot,
      warm: normalizedLeadWarm,
      review: normalizedLeadReview,
      not_qualified: normalizedLeadNotQualified,
      enrichment_queue: normalizedCanonicalCounts.enrichmentQueue,
      outreach_ready: normalizedCanonicalCounts.outreachReady,
      contacted: normalizedCanonicalCounts.contacted,
      emails_sent_today: normalizedCanonicalCounts.emailsSentToday,
      replies_received: normalizedCanonicalCounts.repliesReceived,
      blocked_avoided: normalizedCanonicalCounts.blockedAvoided,
      company_found: normalizedCanonicalCounts.companyFound,
      needs_review: normalizedCanonicalCounts.needsReview,
    },
    recent_leads: asArray(record.recent_leads),
    pending_approvals: asArray(record.pending_approvals),
    recent_reports: asArray(record.recent_reports),
  };
}

export function normalizeLeadsApiResponse(value: unknown): LeadsResponse {
  if (Array.isArray(value)) {
    return {
      ok: true,
      client: normalizeClientSummary({}),
      count: value.length,
      records: value,
      returnedCount: value.length,
      loadedCount: value.length,
      totalCount: value.length,
      page: 1,
      limit: value.length,
      hasMore: false,
      counts: normalizeCanonicalLeadCounts({ all_leads: value.length, total_leads_found: value.length }),
      summary: {},
      leads: value,
    };
  }

  const record = asRecord(value);
  const nestedData = asRecord(record.data);
  const nestedRecords = asArray(nestedData.records);
  const nestedItems = asArray(nestedData.items);
  const nestedResults = asArray(nestedData.results);
  const nestedRows = asArray(nestedData.rows);
  const directLeads = asArray(record.leads);
  const directRecords = asArray(record.records);
  const directItems = asArray(record.items);
  const directResults = asArray(record.results);
  const directRows = asArray(record.rows);
  const nestedLeads = asArray(nestedData.leads);
  const nestedDataArray = asArray(record.data);
  const leads =
    directLeads.length ? directLeads :
    directRecords.length ? directRecords :
    directItems.length ? directItems :
    directResults.length ? directResults :
    directRows.length ? directRows :
    nestedLeads.length ? nestedLeads :
    nestedRecords.length ? nestedRecords :
    nestedItems.length ? nestedItems :
    nestedResults.length ? nestedResults :
    nestedRows.length ? nestedRows :
    nestedDataArray;
  const trueHumanReviewRequired =
    pickBoolean(record, ["true_human_review_required", "trueHumanReviewRequired"])
    ?? pickBoolean(nestedData, ["true_human_review_required", "trueHumanReviewRequired"])
    ?? false;
  const counts = normalizeCanonicalLeadCounts(record.counts ?? record.canonical_counts ?? nestedData.counts ?? nestedData.canonical_counts);
  const totalCount =
    normalizeCount(record.total_count ?? record.totalCount ?? nestedData.total_count ?? nestedData.totalCount ?? record.total)
    || normalizeCount(counts.allLeads || counts.totalLeadsFound)
    || normalizeCount(record.count ?? nestedData.count)
    || leads.length;
  const returnedCount =
    normalizeCount(record.returned_count ?? record.returnedCount ?? nestedData.returned_count ?? nestedData.returnedCount)
    || leads.length;
  const loadedCount =
    normalizeCount(record.loaded_count ?? record.loadedCount ?? nestedData.loaded_count ?? nestedData.loadedCount)
    || returnedCount
    || leads.length;
  const page =
    normalizeCount(record.page ?? nestedData.page)
    || 1;
  const limit =
    normalizeCount(record.limit ?? nestedData.limit)
    || leads.length
    || loadedCount
    || 0;
  const hasMore =
    pickBoolean(record, ["has_more", "hasMore"])
    ?? pickBoolean(nestedData, ["has_more", "hasMore"])
    ?? (loadedCount < totalCount);

  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    client: normalizeClientSummary(record.client ?? nestedData.client),
    count: normalizeCount(record.count ?? nestedData.count) || leads.length,
    records: leads,
    returnedCount,
    loadedCount,
    totalCount,
    page,
    limit,
    hasMore,
    counts: {
      ...buildZeroCanonicalLeadCounts(),
      ...counts,
      allLeads: counts.allLeads || counts.totalLeadsFound || totalCount,
      totalLeadsFound: counts.totalLeadsFound || counts.allLeads || totalCount,
    },
    summary: asRecord(record.summary ?? nestedData.summary),
    leads,
  };
}

function normalizeLeadsResponse(value: unknown): LeadsResponse {
  return normalizeLeadsApiResponse(value);
}

function normalizeCampaignsResponse(value: unknown): CampaignsResponse {
  const record = asRecord(value);
  const campaigns = asArray(record.campaigns).map((item, index) => normalizeCampaign(item, index));
  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    client: normalizeClientSummary(record.client),
    count: normalizeCount(record.count) || campaigns.length,
    campaigns,
  };
}

function normalizeLeadAgentSummary(value: unknown): LeadAgentSummary {
  const record = asRecord(value);
  const pipelineRecord = asRecord(record.lead_pipeline_counts);
  const rawLeadStatusRecord = asRecord(record.raw_leads_by_status);
  const enrichmentQueueStatusRecord = asRecord(record.enrichment_queue_by_status);
  const leadPipelineFromArray = asArray(record.lead_pipeline_counts)
    .map((item) => {
      const stageRecord = asRecord(item);
      return {
        stage: pickString(stageRecord, ["stage", "label", "name"]) || "",
        count: normalizeCount(stageRecord.count ?? stageRecord.value ?? stageRecord.total),
      };
    })
    .filter((item) => Boolean(item.stage));
  const pipelineEntries = (leadPipelineFromArray.length ? leadPipelineFromArray : Object.entries(pipelineRecord).map(([stage, count]) => ({
    stage,
    count: normalizeCount(count),
  }))).sort((a, b) => leadPipelineStageRank(a.stage) - leadPipelineStageRank(b.stage));
  const rawLeadStatusEntries = normalizeStatusCounts(record.raw_leads_by_status ?? rawLeadStatusRecord);
  const enrichmentQueueStatusEntries = normalizeStatusCounts(record.enrichment_queue_by_status ?? enrichmentQueueStatusRecord);
  const usageSummary = asRecord(record.enrichment_usage_summary);
  const budgetSummary = asRecord(record.enrichment_budget_summary);
  const clientFacingCounts = asRecord(record.client_facing_counts);
  const adminSummary = asRecord(record.admin_summary);
  const pipelineCount = (stageName: string) => pipelineEntries.find((entry) => normalizeStageLabel(entry.stage) === stageName)?.count ?? 0;
  const foundCount = normalizeCount(clientFacingCounts.total_leads_found ?? clientFacingCounts.totalLeadsFound) || pipelineCount("Found");
  const qualifiedCount = normalizeCount(clientFacingCounts.qualified_leads ?? clientFacingCounts.qualifiedLeads) || pipelineCount("Qualified");
  const enrichmentQueueCount = normalizeCount(clientFacingCounts.enrichment_queue ?? clientFacingCounts.enrichmentQueue);
  const outreachReadyCount = normalizeCount(clientFacingCounts.outreach_ready ?? clientFacingCounts.outreachReady ?? clientFacingCounts.outreach_prepared ?? clientFacingCounts.outreachPrepared) || pipelineCount("Prepared");
  const preparedCount = outreachReadyCount;
  const contactedCount = normalizeCount(clientFacingCounts.emails_sent_today ?? clientFacingCounts.emailsSentToday ?? clientFacingCounts.emails_sent ?? clientFacingCounts.emailsSent) || pipelineCount("Contacted");
  const repliesReceivedCount = normalizeCount(clientFacingCounts.replies_received ?? clientFacingCounts.repliesReceived);
  const blockedAvoidedCount = normalizeCount(clientFacingCounts.blocked_avoided ?? clientFacingCounts.blockedAvoided);
  const companyFoundCount = normalizeCount(clientFacingCounts.company_found ?? clientFacingCounts.companyFound);
  const interestedCount = normalizeCount(clientFacingCounts.positive_replies ?? clientFacingCounts.positiveReplies) || pipelineCount("Interested");
  const meetingsCount = normalizeCount(clientFacingCounts.meetings_quote_requests ?? clientFacingCounts.meetingsQuoteRequests) || pipelineCount("Meetings / Quotes");

  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    client: normalizeClientSummary(record.client),
    agent: normalizeAgentRecord(record.agent),
    activeMissions: asArray(record.active_missions).map((item, index) => normalizeMission(item, index)),
    openRequests: asArray(record.open_requests).map((item, index) => normalizeRequestHistory(item, index)),
    campaigns: asArray(record.campaigns).map((item, index) => normalizeCampaign(item, index)),
    leadPipelineCounts: ensurePipelineStages(pipelineEntries, {
      Found: foundCount,
      Qualified: qualifiedCount,
      Prepared: preparedCount,
      Contacted: contactedCount,
      Interested: interestedCount,
      "Meetings / Quotes": meetingsCount,
    }),
    rawLeadsCount: normalizeCount(record.raw_leads_count),
    rawLeadStatusCounts: rawLeadStatusEntries.sort((a, b) => a.status.localeCompare(b.status)),
    enrichmentQueueCount: normalizeCount(record.enrichment_queue_count),
    enrichmentQueueStatusCounts: enrichmentQueueStatusEntries.sort((a, b) => a.status.localeCompare(b.status)),
    enrichmentUsageSummary: {
      apolloAttempted: normalizeCount(usageSummary.apollo_attempted ?? usageSummary.apolloAttempted),
      hunterAttempted: normalizeCount(usageSummary.hunter_attempted ?? usageSummary.hunterAttempted),
      apolloUsed: normalizeCount(usageSummary.apollo_used ?? usageSummary.apolloUsed),
      hunterUsed: normalizeCount(usageSummary.hunter_used ?? usageSummary.hunterUsed),
    },
    enrichmentBudgetSummary: {
      apolloMonthlyLimit: normalizeCount(budgetSummary.apollo_monthly_limit ?? budgetSummary.apolloMonthlyLimit),
      apolloUsed: normalizeCount(budgetSummary.apollo_used ?? budgetSummary.apolloUsed),
      apolloRemaining: normalizeCount(budgetSummary.apollo_remaining ?? budgetSummary.apolloRemaining),
      hunterMonthlyLimit: normalizeCount(budgetSummary.hunter_monthly_limit ?? budgetSummary.hunterMonthlyLimit),
      hunterUsed: normalizeCount(budgetSummary.hunter_used ?? budgetSummary.hunterUsed),
      hunterRemaining: normalizeCount(budgetSummary.hunter_remaining ?? budgetSummary.hunterRemaining),
    },
    outreachTemplates: asArray(record.outreach_templates).map((item, index) => normalizeOutreachTemplate(item, index)),
    followupSequences: asArray(record.followup_sequences).map((item, index) => normalizeFollowupSequence(item, index)),
    outreachQueueCount: normalizeCount(record.outreach_queue_count),
    outreachQueueStatusCounts: Object.entries(asRecord(record.outreach_queue_by_status)).map(([status, count]) => ({
      status,
      count: normalizeCount(count),
    })).sort((a, b) => a.status.localeCompare(b.status)),
    outreachQueue: asArray(record.outreach_queue).map((item, index) => normalizeOutreachQueueItem(item, index)),
    verifiedContactsCount: normalizeCount(record.verified_contacts_count),
    outreachPlannedCount: normalizeCount(record.outreach_planned_count),
    sendReadyCount: normalizeCount(record.send_ready_count),
    waitingForMailboxCount: normalizeCount(record.waiting_for_mailbox_count),
    outreachBlockers: asArray(record.outreach_blockers).map((item, index) => normalizeOutreachBlocker(item, index)),
    verifiedContactsWaitingForOutreach: asArray(record.verified_contacts_waiting_for_outreach).map((item, index) =>
      normalizeVerifiedContactPlanning(item, index),
    ),
    mailboxStatus: pickString(record, ["mailbox_status", "mailboxStatus"]) || "disconnected",
    mailboxConnected: pickBoolean(record, ["mailbox_connected", "mailboxConnected"]) ?? false,
    sendingEnabled: pickBoolean(record, ["sending_enabled", "sendingEnabled"]) ?? false,
    sendReady: pickBoolean(record, ["send_ready", "sendReady"]) ?? false,
    mailboxFromName: pickString(record, ["mailbox_from_name", "mailboxFromName"]) || "",
    mailboxFromEmail: pickString(record, ["mailbox_from_email", "mailboxFromEmail"]) || "",
    mailboxProviderType: pickString(record, ["mailbox_provider_type", "mailboxProviderType"]) || "",
    mailboxDailySendLimit: pickNumber(record, ["mailbox_daily_send_limit", "mailboxDailySendLimit"]),
    mailboxMonthlySendLimit: pickNumber(record, ["mailbox_monthly_send_limit", "mailboxMonthlySendLimit"]),
    mailboxSentToday: normalizeCount(record.mailbox_sent_today ?? record.mailboxSentToday),
    mailboxSentThisMonth: normalizeCount(record.mailbox_sent_this_month ?? record.mailboxSentThisMonth),
    mailboxLastError: pickString(record, ["mailbox_last_error", "mailboxLastError"]) || "",
    mailboxLastHealthCheckAt: normalizeTimestamp(record.mailbox_last_health_check_at ?? record.mailboxLastHealthCheckAt),
    mailboxReadinessBlockers: asArray(record.mailbox_readiness_blockers).map((item, index) => normalizeOutreachBlocker(item, index)),
    mailboxConnectionCheck: normalizeMailboxConnectionCheck(record.mailbox_connection_check ?? record.mailboxConnectionCheck),
    launchMode: pickString(record, ["launch_mode", "launchMode"]) || "waiting_for_approval",
    launchReady: pickBoolean(record, ["launch_ready", "launchReady"]) ?? false,
    anyCampaignReady: pickBoolean(record, ["any_campaign_ready", "anyCampaignReady"]) ?? false,
    campaignLaunchStates: asArray(record.campaign_launch_states ?? record.campaignLaunchStates).map((item, index) =>
      normalizeCampaignLaunchState(item, index),
    ),
    campaignsApprovedCount: normalizeCount(record.campaigns_approved_count ?? record.campaignsApprovedCount),
    campaignsWaitingApprovalCount: normalizeCount(record.campaigns_waiting_approval_count ?? record.campaignsWaitingApprovalCount),
    campaignsReadyToLaunchCount: normalizeCount(record.campaigns_ready_to_launch_count ?? record.campaignsReadyToLaunchCount),
    campaignsLiveCount: normalizeCount(record.campaigns_live_count ?? record.campaignsLiveCount),
    templatesWaitingApprovalCount: normalizeCount(record.templates_waiting_approval_count ?? record.templatesWaitingApprovalCount),
    followupsWaitingApprovalCount: normalizeCount(record.followups_waiting_approval_count ?? record.followupsWaitingApprovalCount),
    unapprovedRequiredAssetsCount: normalizeCount(record.unapproved_required_assets_count ?? record.unapprovedRequiredAssetsCount),
    renderPreviewAvailableCount: normalizeCount(record.render_preview_available_count ?? record.renderPreviewAvailableCount),
    outreachAssets: asArray(record.outreach_assets).map((item) => normalizeOutreachAsset(item)),
    responseRules: asArray(record.response_rules ?? record.responseRules).map((item, index) => normalizeResponseRule(item, index)),
    responseRuleCategories: asArray(record.response_rule_categories ?? record.responseRuleCategories).map((item, index) => normalizeResponseRuleCategory(item, index)),
    responseRulesCount: normalizeCount(record.response_rules_count ?? record.responseRulesCount),
    approvedResponseRulesCount: normalizeCount(record.approved_response_rules_count ?? record.approvedResponseRulesCount),
    autoReplyRulesConfiguredCount: normalizeCount(record.auto_reply_rules_configured_count ?? record.autoReplyRulesConfiguredCount),
    autoReplyRulesEnabledCount: normalizeCount(record.auto_reply_rules_enabled_count ?? record.autoReplyRulesEnabledCount),
    mailboxes: asArray(record.mailboxes).map((item, index) => normalizeMailbox(item, index)),
    approvalsWaiting: normalizeCount(record.approvals_waiting),
    approvals: asArray(record.approvals).map((item, index) => normalizeApproval(item, index)),
    pendingEnrichmentCreditApprovals: asArray(record.pending_enrichment_credit_approvals).map((item, index) =>
      normalizeEnrichmentCreditApproval(item, index),
    ),
    clientFacingCounts: {
      totalLeadsFound: foundCount,
      qualifiedLeads: qualifiedCount,
      enrichmentQueue: enrichmentQueueCount || normalizeCount(record.enrichment_queue_count ?? record.enrichmentQueueCount),
      outreachReady: outreachReadyCount,
      outreachPrepared: preparedCount,
      contacted: normalizeCount(clientFacingCounts.contacted) || contactedCount,
      emailsSent: contactedCount,
      emailsSentToday: normalizeCount(clientFacingCounts.emails_sent_today ?? clientFacingCounts.emailsSentToday),
      repliesReceived: repliesReceivedCount,
      blockedAvoided: blockedAvoidedCount,
      companyFound: companyFoundCount,
      needsReview: normalizeCount(clientFacingCounts.needs_review ?? clientFacingCounts.needsReview ?? clientFacingCounts.manual_review ?? clientFacingCounts.manualReview),
      positiveReplies: interestedCount,
      meetingsQuoteRequests: meetingsCount,
    },
    currentCampaignFocus: pickString(record, ["current_campaign_focus", "currentCampaignFocus"]) || "",
    expertLeadAgentState: pickString(record, ["expert_lead_agent_state", "expertLeadAgentState"]) || "",
    expertLeadAgentStateLabel: pickString(record, ["expert_lead_agent_state_label", "expertLeadAgentStateLabel"]) || "",
    newLeadsSourcedToday: normalizeCount(record.new_leads_sourced_today ?? record.newLeadsSourcedToday),
    repliesWaitingApproval: normalizeCount(record.replies_waiting_approval ?? record.repliesWaitingApproval),
    adminSummary: {
      rawLeadsCount: normalizeCount(adminSummary.raw_leads_count ?? adminSummary.rawLeadsCount),
      enrichmentQueueCount: normalizeCount(adminSummary.enrichment_queue_count ?? adminSummary.enrichmentQueueCount),
      totalApprovalsCount: normalizeCount(adminSummary.total_approvals_count ?? adminSummary.totalApprovalsCount),
      archivedMissionsCount: normalizeCount(adminSummary.archived_missions_count ?? adminSummary.archivedMissionsCount),
      internalRequestsCount: normalizeCount(adminSummary.internal_requests_count ?? adminSummary.internalRequestsCount),
      testConversationsCount: normalizeCount(adminSummary.test_conversations_count ?? adminSummary.testConversationsCount),
      enrichmentProviderStatusSummary: normalizeStatusCounts(
        adminSummary.enrichment_provider_status_summary ?? adminSummary.enrichmentProviderStatusSummary,
      ).sort((a, b) => a.status.localeCompare(b.status)),
    },
    latestQualificationActions: asArray(record.latest_qualification_actions).map((item, index) =>
      normalizeQualificationAction(item, index),
    ),
    latestEnrichmentActions: asArray(record.latest_enrichment_actions).map((item, index) =>
      normalizeEnrichmentAction(item, index),
    ),
    latestWeeklyReport: normalizeWeeklyReport(record.latest_weekly_report),
    internalNotes: asArray(record.internal_notes).map((item, index) => normalizeInternalNote(item, index)),
  };
}

function normalizeReportsResponse(value: unknown): ReportsResponse {
  const record = asRecord(value);
  const reports = asArray(record.reports);
  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    client: normalizeClientSummary(record.client),
    count: normalizeCount(record.count) || reports.length,
    reports,
  };
}

function normalizeRequestsResponse(value: unknown): RequestsResponse {
  if (Array.isArray(value)) {
    return {
      ok: true,
      client: normalizeClientSummary({}),
      count: value.length,
      requests: value,
    };
  }

  const record = asRecord(value);
  const nestedData = asRecord(record.data);
  const requests =
    asArray(record.requests).length ? asArray(record.requests) :
    asArray(record.items).length ? asArray(record.items) :
    asArray(record.results).length ? asArray(record.results) :
    asArray(nestedData.requests).length ? asArray(nestedData.requests) :
    asArray(record.data);

  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    client: normalizeClientSummary(record.client ?? nestedData.client),
    count: normalizeCount(record.count) || requests.length,
    requests,
  };
}

function mapQualification(value?: string): LeadQualification {
  switch ((value || "").toLowerCase()) {
    case "hot":
    case "interested":
    case "meeting_booked":
      return "hot";
    case "warm":
    case "contacted":
    case "replied":
      return "warm";
    case "not_qualified":
    case "disqualified":
    case "unqualified":
      return "not_qualified";
    default:
      return "review";
  }
}

function mapCampaignStatus(value?: string): CampaignLifecycleStatus {
  const normalized = (value || "").toLowerCase();
  switch (normalized) {
    case "active":
    case "paused":
    case "completed":
    case "draft":
      return normalized as CampaignLifecycleStatus;
    default:
      return "draft";
  }
}

function mapApprovalStatus(value?: string): CampaignApprovalStatus {
  switch ((value || "").toLowerCase()) {
    case "pending":
    case "pending_review":
    case "pending_client_approval":
    case "pending_approval":
    case "waiting_for_approval":
      return "pending";
    case "approved":
      return "approved";
    case "changes_requested":
    case "request_changes":
    case "rejected":
      return "changes_requested";
    case "archived":
      return "archived";
    case "draft":
      return "draft";
    default:
      return "none";
  }
}

export function normalizeLead(value: unknown, index = 0): LeadRecord {
  const record = asRecord(value);
  const metadata = asRecord(record.metadata);
  const leadPipeline = asRecord(metadata.lead_pipeline);
  const sourceEvidence = asRecord(record.source_evidence ?? leadPipeline.source_evidence);
  const rawStatus = pickString(record, ["status"]) || "";
  const canonicalStatus =
    pickString(record, ["canonical_status", "canonicalStatus", "client_status_label", "clientStatusLabel"]) ||
    "";
  const clientVisibleStatus =
    pickString(record, ["client_visible_status", "clientVisibleStatus"]) ||
    rawStatus;
  const internalDisplayStatus =
    pickString(record, ["internal_display_status", "internalDisplayStatus"]) ||
    clientVisibleStatus;
  const workflowStatus =
    pickString(record, ["workflow_status", "workflowStatus", "lead_status", "leadStatus", "status"]) ||
    "";
  const displayStatus =
    canonicalStatus ||
    pickString(record, ["display_status", "displayStatus"]) ||
    rawStatus ||
    "";
  const normalizedStatus =
    normalizeLeadStatus(workflowStatus) ||
    normalizeLeadStatus(pickString(record, ["qualification"])) ||
    "new";
  const firstName = pickString(record, ["first_name", "firstName"]);
  const lastName = pickString(record, ["last_name", "lastName"]);
  const name =
    formatLeadDisplayName(record, pickString(record, ["company", "company_name", "companyName"]) || "") ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Decision-maker not verified yet";

  const location =
    pickString(record, ["location"]) ||
    [pickString(record, ["city"]), pickString(record, ["state"]), pickString(record, ["country"])]
      .filter(Boolean)
      .join(", ");
  const trueHumanReviewRequired =
    pickBoolean(record, ["true_human_review_required", "trueHumanReviewRequired", "manual_review_required", "manualReviewRequired"])
    ?? pickBoolean(leadPipeline, ["true_human_review_required", "trueHumanReviewRequired", "manual_review_required", "manualReviewRequired"])
    ?? pickBoolean(metadata, ["true_human_review_required", "trueHumanReviewRequired", "manual_review_required", "manualReviewRequired"])
    ?? false;

  return {
    id: pickString(record, ["id", "_id"]) || `lead-${index}`,
    name,
    company: pickString(record, ["company", "company_name", "companyName"]) || "",
    title: pickString(record, ["title", "job_title", "jobTitle", "role"]) || "",
    industry: pickString(record, ["industry", "target_niche", "targetNiche"]) || "",
    location: location || "",
    email: pickString(record, ["email"]) || "",
    phone: pickString(record, ["phone", "phone_number", "phoneNumber", "mobile"]) || "",
    website: pickString(record, ["website", "url"]) || "",
    domain: pickString(record, ["domain"]) || "",
    linkedinUrl: pickString(record, ["linkedin_url", "linkedinUrl"]) || "",
    companyLinkedin: pickString(record, ["company_linkedin", "companyLinkedin"]) || "",
    qualification: mapQualification(
      pickString(record, ["qualification"]) || workflowStatus || normalizedStatus,
    ),
    rawStatus,
    status: rawStatus || workflowStatus || normalizedStatus,
    displayStatus: displayStatus || workflowStatus || normalizedStatus,
    canonicalStatus: canonicalStatus || displayStatus || workflowStatus || normalizedStatus,
    clientStatusLabel: canonicalStatus || displayStatus || "",
    clientVisibleStatus,
    internalDisplayStatus,
    workflowStatus: workflowStatus || displayStatus || normalizedStatus,
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "Unassigned",
    leadScore: normalizeCount(record.lead_score ?? record.leadScore),
    matchReason: pickString(record, ["match_reason", "matchReason"]) || pickString(leadPipeline, ["match_reason", "matchReason"]) || "",
    sourceUrl: pickString(record, ["source_url", "sourceUrl"]) || pickString(sourceEvidence, ["source_url", "sourceUrl"]) || "",
    sourceEvidence:
      pickString(record, ["source_url", "sourceUrl"]) ||
      pickString(sourceEvidence, ["source_url", "sourceUrl"]) ||
      pickString(record, ["website"]) ||
      pickString(sourceEvidence, ["website"]) ||
      pickString(record, ["domain"]) ||
      pickString(sourceEvidence, ["domain"]) ||
      "",
    sourceProvider: pickString(record, ["source_provider", "sourceProvider"]) || pickString(record, ["source", "source_type", "sourceType"]) || "",
    sourceType: pickString(record, ["source_type", "sourceType"]) || pickString(record, ["source"]) || "",
    decisionMakerPath: pickStringArray(record, ["decision_maker_path", "decisionMakerPath"]).length
      ? pickStringArray(record, ["decision_maker_path", "decisionMakerPath"])
      : pickStringArray(leadPipeline, ["decision_maker_path", "decisionMakerPath"]),
    enrichmentStatus: pickString(record, ["enrichment_status", "enrichmentStatus"]) || "",
    outreachStatus: pickString(record, ["outreach_status", "outreachStatus"]) || "",
    replyDraftStatus: pickString(record, ["reply_draft_status", "replyDraftStatus"]) || "",
    nextAction: pickString(record, ["next_action", "nextAction"]) || pickString(leadPipeline, ["next_action", "nextAction"]) || "",
    displayContactName: formatLeadDisplayName(record, pickString(record, ["company", "company_name", "companyName"]) || ""),
    manualReviewRequired: trueHumanReviewRequired,
    trueHumanReviewRequired,
    qualityReasons: [
      ...asArray(record.quality_reasons ?? record.qualityReasons).map((item) => String(item || "")).filter(Boolean),
      ...asArray(record.quality_gate_blockers ?? record.qualityGateBlockers)
        .map((item) => {
          const blocker = asRecord(item);
          return String(blocker.message || blocker.code || item || "");
        })
        .filter(Boolean),
    ],
    lastActivity: normalizeTimestamp(record.last_activity ?? record.lastActivity ?? leadPipeline.last_activity ?? leadPipeline.lastActivity),
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    foundAt: normalizeTimestamp(record.found_at ?? record.foundAt ?? record.created_at ?? record.createdAt),
    lastUpdated: normalizeTimestamp(record.last_updated ?? record.lastUpdated ?? record.updated_at ?? record.updatedAt),
    isSendable: pickBoolean(record, ["is_sendable", "isSendable"]) ?? false,
    isContacted: pickBoolean(record, ["is_contacted", "isContacted"]) ?? false,
    isExcluded: pickBoolean(record, ["is_excluded", "isExcluded"]) ?? false,
    isDuplicateSuppressed: pickBoolean(record, ["is_duplicate_suppressed", "isDuplicateSuppressed"]) ?? false,
    isVisible: pickBoolean(record, ["is_visible", "isVisible"]) ?? true,
    clientVisible: pickBoolean(record, ["client_visible", "clientVisible"]) ?? true,
  };
}

export function buildFallbackLeadRecord(index = 0): LeadRecord {
  return {
    id: `lead-fallback-${index}`,
    name: "Decision-maker not verified yet",
    displayContactName: "Decision-maker not verified yet",
    company: "",
    title: "",
    industry: "",
    location: "",
    email: "",
    phone: "",
    website: "",
    domain: "",
    linkedinUrl: "",
    companyLinkedin: "",
    qualification: "review",
    rawStatus: "",
    status: "new",
    displayStatus: "new",
    canonicalStatus: "new",
    clientStatusLabel: "",
    clientVisibleStatus: "",
    internalDisplayStatus: "",
    workflowStatus: "new",
    campaignName: "Unassigned",
    leadScore: 0,
    matchReason: "",
    sourceUrl: "",
    sourceEvidence: "",
    sourceProvider: "",
    sourceType: "",
    decisionMakerPath: [],
    enrichmentStatus: "",
    outreachStatus: "",
    replyDraftStatus: "",
    nextAction: "",
    manualReviewRequired: false,
    trueHumanReviewRequired: false,
    qualityReasons: [],
    isSendable: false,
    isContacted: false,
    isExcluded: false,
    isDuplicateSuppressed: false,
    isVisible: true,
    clientVisible: true,
  };
}

export function normalizeCampaign(value: unknown, index = 0): CampaignRecord {
  const record = asRecord(value);
  const metadata = asRecord(record.metadata);
  return {
    id: pickString(record, ["id", "_id"]) || `campaign-${index}`,
    name: pickString(record, ["name"]) || "Untitled campaign",
    status: mapCampaignStatus(pickString(record, ["status"])),
    approvalStatus: mapApprovalStatus(pickString(record, ["approval_status", "approvalStatus"])),
    targetNiche: pickString(record, ["target_niche", "targetNiche"]) || "Not specified",
    targetLocation: pickString(record, ["target_location", "targetLocation"]) || "Not specified",
    objective: pickString(record, ["objective", "goal"]) || "No objective provided yet.",
    targetDecisionMakers: pickStringArray(metadata, ["target_decision_makers", "targetDecisionMakers"]),
    servicesOffers: pickStringArray(metadata, ["services_offers", "servicesOffers"]),
    qualificationQuestions: pickStringArray(metadata, ["qualification_questions", "qualificationQuestions"]),
    keySellingPoints: pickStringArray(metadata, ["key_selling_points", "keySellingPoints"]),
    callToAction: pickString(metadata, ["cta", "call_to_action", "callToAction"]) || "",
    notes: pickString(metadata, ["notes"]) || "",
    imagesEnabled: pickBoolean(record, ["images_enabled", "imagesEnabled"]) ?? false,
    hiddenFromClient: pickBoolean(metadata, ["hidden_from_client", "hiddenFromClient"]) ?? false,
    leadCount: pickNumber(record, ["lead_count", "leadCount"]),
    launchState: pickString(record, ["launch_state", "launchState"]) || "waiting_for_approval",
    launchBlockers: pickStringArray(record, ["launch_blockers", "launchBlockers"]),
    launchNextAction: pickString(record, ["launch_next_action", "launchNextAction"]) || "",
    firstContactTemplateStatus: pickString(record, ["first_contact_template_status", "firstContactTemplateStatus"]) || "Needs approval",
    followupStatus: pickString(record, ["followup_status", "followupStatus"]) || "Needs approval",
    imageAssetStatus: pickString(record, ["image_asset_status", "imageAssetStatus"]) || "Not required",
    sendableLeadsCount: normalizeCount(record.sendable_leads_count ?? record.sendableLeadsCount),
    queuedUnsentCount: normalizeCount(record.queued_unsent_count ?? record.queuedUnsentCount),
    sentCount: normalizeCount(record.sent_count ?? record.sentCount),
    sourcedLeads: normalizeCount(record.sourced_leads ?? record.sourcedLeads),
    qualifiedLeads: normalizeCount(record.qualified_leads ?? record.qualifiedLeads),
    visibleLeads: normalizeCount(record.visible_leads ?? record.visibleLeads),
    outreachSent: normalizeCount(record.outreach_sent ?? record.outreachSent),
    replies: normalizeCount(record.replies),
    repliesWaitingApproval: normalizeCount(record.replies_waiting_approval ?? record.repliesWaitingApproval),
    nextAction: pickString(record, ["next_action", "nextAction"]) || "",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
  };
}

function normalizeCampaignLaunchState(value: unknown, index = 0): CampaignLaunchStateRecord {
  const record = asRecord(value);
  return {
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || `campaign-launch-${index}`,
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "Campaign",
    campaignApprovalStatus: pickString(record, ["campaign_approval_status", "campaignApprovalStatus"]) || "waiting_for_approval",
    campaignStatusLabel: pickString(record, ["campaign_status_label", "campaignStatusLabel"]) || "Needs approval",
    firstContactTemplateStatus: pickString(record, ["first_contact_template_status", "firstContactTemplateStatus"]) || "Needs approval",
    followupStatus: pickString(record, ["followup_status", "followupStatus"]) || "Needs approval",
    imageAssetStatus: pickString(record, ["image_asset_status", "imageAssetStatus"]) || "Not required",
    launchState: pickString(record, ["launch_state", "launchState"]) || "waiting_for_approval",
    sendableLeadsCount: normalizeCount(record.sendable_leads_count ?? record.sendableLeadsCount),
    preparedLeadsCount: normalizeCount(record.prepared_leads_count ?? record.preparedLeadsCount),
    queuedUnsentCount: normalizeCount(record.queued_unsent_count ?? record.queuedUnsentCount),
    sentCount: normalizeCount(record.sent_count ?? record.sentCount),
    blockers: pickStringArray(record, ["blockers"]),
    nextAction: pickString(record, ["next_action", "nextAction"]) || "",
    mailboxReady: pickBoolean(record, ["mailbox_ready", "mailboxReady"]) ?? false,
    sendingEnabled: pickBoolean(record, ["sending_enabled", "sendingEnabled"]) ?? false,
    limitsMatch: pickBoolean(record, ["limits_match", "limitsMatch"]) ?? false,
    canSendNow: pickBoolean(record, ["can_send_now", "canSendNow"]) ?? false,
  };
}

export function normalizePendingApproval(value: unknown, index = 0): PendingApprovalRecord {
  const campaign = normalizeCampaign(value, index);
  return {
    id: campaign.id,
    name: campaign.name,
    summary: `${campaign.targetNiche} in ${campaign.targetLocation}`,
    status: campaign.approvalStatus,
    createdAt: campaign.createdAt,
  };
}

export function normalizeReport(value: unknown, index = 0): ReportRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `report-${index}`,
    title: pickString(record, ["title", "name"]) || "Performance report",
    summary:
      pickString(record, ["summary", "description"]) ||
      "A live report is available for this client.",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
  };
}

function normalizeWeeklyReport(value: unknown, index = 0): WeeklyReportRecord | null {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;

  return {
    id: pickString(record, ["id", "_id"]) || `weekly-report-${index}`,
    title: pickString(record, ["title"]) || "Weekly report",
    status: pickString(record, ["status"]) || "draft",
    summary: pickString(record, ["summary"]) || "No summary available.",
    periodStart: normalizeTimestamp(record.period_start ?? record.periodStart),
    periodEnd: normalizeTimestamp(record.period_end ?? record.periodEnd),
    payload: asRecord(record.report_payload ?? record.payload),
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
  };
}

function normalizeAgentRecord(value: unknown) {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;

  return {
    id: pickString(record, ["id", "_id"]) || "agent",
    name: pickString(record, ["name"]) || "Expert Lead Agent",
    status: pickString(record, ["status"]) || "unknown",
    roleScope: pickString(record, ["role_scope", "roleScope"]) || "client_operator",
    lastHeartbeatAt: normalizeTimestamp(record.last_heartbeat_at ?? record.lastHeartbeatAt),
  };
}

function normalizeMission(value: unknown, index = 0): MissionRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `mission-${index}`,
    title: pickString(record, ["title"]) || "Untitled mission",
    instruction: pickString(record, ["instruction", "message"]) || "",
    status: pickString(record, ["status"]) || "Queued",
    priority: pickString(record, ["priority"]) || "normal",
    missionType: pickString(record, ["mission_type", "missionType"]) || "instruction",
    assignedWorkerType: pickString(record, ["assigned_worker_type", "assignedWorkerType"]) || "Unassigned",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
  };
}

function normalizeApproval(value: unknown, index = 0): ApprovalRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `approval-${index}`,
    entityType: pickString(record, ["entity_type", "entityType"]) || "general",
    entityId: pickString(record, ["entity_id", "entityId"]) || "",
    approvalType: pickString(record, ["approval_type", "approvalType"]) || "general",
    title: pickString(record, ["title"]) || "Approval item",
    status: pickString(record, ["status"]) || "pending",
    decisionStatus: pickString(record, ["decision_status", "decisionStatus"]) || "pending",
    decisionNote: pickString(record, ["decision_note", "decisionNote"]) || "",
    requestedByName: pickString(record, ["requested_by_name", "requestedByName"]) || "",
    decidedByName: pickString(record, ["decided_by_name", "decidedByName"]) || "",
    decidedAt: normalizeTimestamp(record.decided_at ?? record.decidedAt),
    details: asRecord(record.details),
    metadata: asRecord(record.metadata),
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
  };
}

function normalizeTemplateImageSettings(value: unknown): TemplateImageSettings {
  const record = asRecord(value);
  return {
    includeImage: pickBoolean(record, ["include_image", "includeImage"]) ?? false,
    assetId: pickString(record, ["asset_id", "assetId"]) || "",
    placement: pickString(record, ["placement"]) || "inline",
    altText: pickString(record, ["alt_text", "altText"]) || "",
    fallbackText: pickString(record, ["fallback_text", "fallbackText"]) || "",
    maxWidth: pickNumber(record, ["max_width", "maxWidth"]),
    imagePurpose: pickString(record, ["image_purpose", "imagePurpose", "purpose"]) || "",
    approvalNotes: pickString(record, ["approval_notes", "approvalNotes"]) || "",
    allowInEmailBody: pickBoolean(record, ["allow_in_email_body", "allowInEmailBody"]) ?? true,
  };
}

function normalizeOutreachAsset(value: unknown): OutreachAssetRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || "",
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "Unassigned",
    templateVariantId: pickString(record, ["template_variant_id", "templateVariantId"]) || "",
    templateName: pickString(record, ["template_name", "templateName"]) || "",
    variantLabel: pickString(record, ["variant_label", "variantLabel"]) || "",
    assetType: pickString(record, ["asset_type", "assetType"]) || "image",
    title: pickString(record, ["title"]) || "Untitled asset",
    description: pickString(record, ["description"]) || "",
    fileUrl: pickString(record, ["file_url", "fileUrl"]) || "",
    originalFilename: pickString(record, ["original_filename", "originalFilename"]) || "",
    mimeType: pickString(record, ["mime_type", "mimeType"]) || "",
    fileSize: pickNumber(record, ["file_size", "fileSize"]),
    altText: pickString(record, ["alt_text", "altText"]) || "",
    placement: pickString(record, ["placement"]) || "inline",
    status: pickString(record, ["status"]) || "draft",
    visibility: pickString(record, ["visibility"]) || "client_visible",
    imageWidth: pickNumber(record, ["image_width", "imageWidth"]),
    imageHeight: pickNumber(record, ["image_height", "imageHeight"]),
    imageMaxWidth: pickNumber(record, ["image_max_width", "imageMaxWidth"]),
    imagePurpose: pickString(record, ["image_purpose", "imagePurpose"]) || "",
    approvalNotes: pickString(record, ["approval_notes", "approvalNotes"]) || "",
    allowInEmailBody: pickBoolean(record, ["allow_in_email_body", "allowInEmailBody"]) ?? true,
    approvalId: pickString(record, ["approval_id", "approvalId"]) || "",
    approvalStatus: pickString(record, ["approval_status", "approvalStatus"]) || "",
    approvalDecisionNote: pickString(record, ["approval_decision_note", "approvalDecisionNote"]) || "",
    createdByName: pickString(record, ["created_by_name", "createdByName"]) || "",
    approvedByName: pickString(record, ["approved_by_name", "approvedByName"]) || "",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
    approvedAt: normalizeTimestamp(record.approved_at ?? record.approvedAt),
    metadata: asRecord(record.metadata),
  };
}

function normalizeTemplateImageValidation(value: unknown): TemplateImageValidation {
  const record = asRecord(value);
  return {
    valid: pickBoolean(record, ["valid"]) ?? true,
    included: pickBoolean(record, ["included"]) ?? false,
    campaignImagesEnabled: pickBoolean(record, ["campaign_images_enabled", "campaignImagesEnabled"]) ?? false,
    blockers: asArray(record.blockers).map((item, index) => normalizeOutreachBlocker(item, index)),
    warnings: asArray(record.warnings).map((item, index) => normalizeOutreachBlocker(item, index)),
  };
}

function normalizeResolvedImagePreview(value: unknown): ResolvedImagePreview | null {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;

  return {
    required: pickBoolean(record, ["required"]) ?? false,
    included: pickBoolean(record, ["included"]) ?? false,
    placement: pickString(record, ["placement"]) || "inline",
    altText: pickString(record, ["alt_text", "altText"]) || "",
    fallbackText: pickString(record, ["fallback_text", "fallbackText"]) || "",
    maxWidth: pickNumber(record, ["max_width", "maxWidth"]),
    blockers: asArray(record.blockers).map((item, index) => normalizeOutreachBlocker(item, index)),
    warnings: asArray(record.warnings).map((item, index) => normalizeOutreachBlocker(item, index)),
    asset: record.asset ? normalizeOutreachAsset(record.asset) : null,
    campaignImagesEnabled: pickBoolean(record, ["campaign_images_enabled", "campaignImagesEnabled"]) ?? false,
  };
}

function normalizeOutreachTemplateVariant(value: unknown, index = 0): OutreachTemplateVariantRecord {
  const record = asRecord(value);
  const metadata = asRecord(record.metadata);
  return {
    id: pickString(record, ["id", "_id"]) || `template-variant-${index}`,
    variantLabel: pickString(record, ["variant_label", "variantLabel"]) || "",
    status: pickString(record, ["status"]) || "draft",
    approvalStatus: pickString(record, ["approval_status", "approvalStatus"]) || "pending",
    approvalId: pickString(record, ["approval_id", "approvalId"]) || "",
    approvalDecisionStatus: pickString(record, ["approval_decision_status", "approvalDecisionStatus"]) || "",
    approvalDecisionNote: pickString(record, ["approval_decision_note", "approvalDecisionNote"]) || "",
    subjectTemplate: pickString(record, ["subject_template", "subjectTemplate"]) || "",
    bodyTemplate: pickString(record, ["body_template", "bodyTemplate"]) || "",
    imageSettings: normalizeTemplateImageSettings(record.image_settings ?? record.imageSettings),
    selectedImageAsset: record.selected_image_asset || record.selectedImageAsset ? normalizeOutreachAsset(record.selected_image_asset ?? record.selectedImageAsset) : null,
    imageValidation: normalizeTemplateImageValidation(record.image_validation ?? record.imageValidation),
    latestQualityReview: normalizeTemplateQualityReview(record.latest_quality_review ?? record.latestQualityReview),
    metadata,
    callToAction: pickString(metadata, ["cta", "call_to_action", "callToAction"]) || "",
    signature: pickString(metadata, ["signature"]) || "",
    previousSubject: pickString(metadata, ["previous_subject", "previousSubject"]) || "",
    previousBody: pickString(metadata, ["previous_body", "previousBody"]) || "",
    previousApprovalStatus: pickString(metadata, ["previous_approval_status", "previousApprovalStatus"]) || "",
  };
}

function normalizeOutreachTemplate(value: unknown, index = 0): OutreachTemplateRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `template-${index}`,
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "Unassigned",
    name: pickString(record, ["name"]) || "Untitled template",
    channel: pickString(record, ["channel"]) || "email",
    templateType: pickString(record, ["template_type", "templateType"]) || "first_contact",
    status: pickString(record, ["status"]) || "draft",
    approvalStatus: pickString(record, ["approval_status", "approvalStatus"]) || "pending",
    subjectTemplate: pickString(record, ["subject_template", "subjectTemplate"]) || "",
    bodyTemplate: pickString(record, ["body_template", "bodyTemplate"]) || "",
    campaignImagesEnabled: pickBoolean(record, ["campaign_images_enabled", "campaignImagesEnabled"]) ?? false,
    metadata: asRecord(record.metadata),
    variants: asArray(record.variants).map((item, variantIndex) => normalizeOutreachTemplateVariant(item, variantIndex)),
  };
}

function normalizeFollowupSequence(value: unknown, index = 0): FollowupSequenceRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `followup-sequence-${index}`,
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "Unassigned",
    name: pickString(record, ["name"]) || "Untitled follow-up sequence",
    status: pickString(record, ["status"]) || "draft",
    approvalStatus: pickString(record, ["approval_status", "approvalStatus"]) || "pending",
    approvalId: pickString(record, ["approval_id", "approvalId"]) || "",
    approvalDecisionStatus: pickString(record, ["approval_decision_status", "approvalDecisionStatus"]) || "",
    approvalDecisionNote: pickString(record, ["approval_decision_note", "approvalDecisionNote"]) || "",
    followupCount: normalizeCount(record.followup_count ?? record.followupCount),
    metadata: asRecord(record.metadata),
  };
}

function normalizeOutreachQueueItem(value: unknown, index = 0): OutreachQueueRecord {
  const record = asRecord(value);
  const companyName = pickString(record, ["lead_company_name", "leadCompanyName", "raw_company_name", "rawCompanyName", "company_name", "companyName"]) || "";
  return {
    id: pickString(record, ["id", "_id"]) || `outreach-queue-${index}`,
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "Unassigned",
    status: pickString(record, ["status"]) || "planned",
    approvalStatus: pickString(record, ["approval_status", "approvalStatus"]) || "pending",
    mailboxStatus: pickString(record, ["mailbox_status", "mailboxStatus"]) || "waiting_for_mailbox",
    variantLabel: pickString(record, ["variant_label", "variantLabel"]) || "",
    sequenceName: pickString(record, ["sequence_name", "sequenceName"]) || "",
    leadCompanyName: companyName || "",
    rawCompanyName: pickString(record, ["raw_company_name", "rawCompanyName"]) || "",
    recipientEmail: pickString(record, ["recipient_email", "recipientEmail", "enriched_email", "enrichedEmail", "lead_email", "leadEmail"]) || "",
    recipientName: pickString(record, ["recipient_display_name", "recipientDisplayName", "recipient_name", "recipientName", "enriched_contact_name", "enrichedContactName", "lead_contact_name", "leadContactName"]) || formatLeadDisplayName(record, companyName),
    renderPreviewAvailable: pickBoolean(record, ["render_preview_available", "renderPreviewAvailable"]) ?? false,
    blockers: asArray(record.blockers).map((item, blockerIndex) => normalizeOutreachBlocker(item, blockerIndex)),
    resolvedImage: normalizeResolvedImagePreview(record.resolved_image ?? record.resolvedImage),
    latestQualityReview: normalizeTemplateQualityReview(record.latest_quality_review ?? record.latestQualityReview),
    scheduledFor: normalizeTimestamp(record.scheduled_for ?? record.scheduledFor),
  };
}

function normalizeTemplateQualityReview(value: unknown): TemplateQualityReviewRecord | null {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;

  return {
    id: pickString(record, ["id", "_id"]) || "",
    score: normalizeCount(record.score),
    status: pickString(record, ["status"]) || "needs_review",
    humanSoundingScore: normalizeCount(record.human_sounding_score ?? record.humanSoundingScore),
    specificityScore: normalizeCount(record.specificity_score ?? record.specificityScore),
    salesClarityScore: normalizeCount(record.sales_clarity_score ?? record.salesClarityScore),
    ctaScore: normalizeCount(record.cta_score ?? record.ctaScore),
    riskFlags: asArray(record.risk_flags ?? record.riskFlags).map((item) => {
      const risk = asRecord(item);
      return {
        code: pickString(risk, ["code"]) || "unknown",
        detail: pickString(risk, ["detail"]) || undefined,
      };
    }),
    recommendations: asArray(record.recommendations).map((item) => String(item || "")).filter(Boolean),
    reviewedBy: pickString(record, ["reviewed_by", "reviewedBy"]) || "",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
  };
}

function normalizeConversationMessage(value: unknown, index = 0): ConversationMessageRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `conversation-message-${index}`,
    conversationId: pickString(record, ["conversation_id", "conversationId"]) || "",
    outreachQueueId: pickString(record, ["outreach_queue_id", "outreachQueueId"]) || "",
    direction: pickString(record, ["direction"]) || "outbound",
    provider: pickString(record, ["provider"]) || "other",
    providerMessageId: pickString(record, ["provider_message_id", "providerMessageId"]) || "",
    subject: pickString(record, ["subject"]) || "",
    bodyText: pickString(record, ["body_text", "bodyText"]) || "",
    fromEmail: pickString(record, ["from_email", "fromEmail"]) || "",
    toEmail: pickString(record, ["to_email", "toEmail"]) || "",
    status: pickString(record, ["status"]) || "prepared",
    sentAt: normalizeTimestamp(record.sent_at ?? record.sentAt),
    receivedAt: normalizeTimestamp(record.received_at ?? record.receivedAt),
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    metadata: asRecord(record.metadata),
  };
}

function normalizeReplyDraft(value: unknown, index = 0): ReplyDraftRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `reply-draft-${index}`,
    conversationId: pickString(record, ["conversation_id", "conversationId"]) || "",
    inboundMessageId: pickString(record, ["inbound_message_id", "inboundMessageId"]) || "",
    draftSubject: pickString(record, ["draft_subject", "draftSubject"]) || "",
    draftBody: pickString(record, ["draft_body", "draftBody"]) || "",
    status: pickString(record, ["status"]) || "drafted",
    modelRouteUsed: pickString(record, ["model_route_used", "modelRouteUsed"]) || "",
    approvalNote: pickString(record, ["approval_note", "approvalNote"]) || "",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
    createdBy: asRecord(record.created_by ?? record.createdBy),
    trainingContextUsed: asArray(record.training_context_used ?? record.trainingContextUsed).map((item) => asRecord(item)),
    metadata: asRecord(record.metadata),
  };
}

function normalizeConversation(value: unknown, index = 0): ConversationRecord {
  const record = asRecord(value);
  const companyName = pickString(record, ["company_name", "companyName"]) || "";
  const displayContactName = pickString(record, ["display_contact_name", "displayContactName"]) || "";
  return {
    id: pickString(record, ["id", "_id"]) || `conversation-${index}`,
    outreachQueueId: pickString(record, ["outreach_queue_id", "outreachQueueId"]) || "",
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "",
    companyName,
    contactName: displayContactName || pickString(record, ["contact_name", "contactName", "contact_display_name", "contactDisplayName"]) || formatLeadDisplayName(record, companyName),
    displayContactName: displayContactName || undefined,
    contactEmail: pickString(record, ["contact_email", "contactEmail"]) || "",
    status: pickString(record, ["status"]) || "prepared",
    replyStatus: pickString(record, ["reply_status", "replyStatus"]) || "",
    latestSubject: pickString(record, ["latest_subject", "latestSubject"]) || "",
    latestSnippet: pickString(record, ["latest_snippet", "latestSnippet"]) || "",
    messageCount: normalizeCount(record.message_count ?? record.messageCount),
    previewOnly: pickBoolean(record, ["preview_only", "previewOnly"]) ?? false,
    lastMessageAt: normalizeTimestamp(record.last_message_at ?? record.lastMessageAt),
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
    latestQualityReview: normalizeTemplateQualityReview(record.latest_quality_review ?? record.latestQualityReview),
    latestReplyDraft: normalizeNullableRecord(record.latest_reply_draft ?? record.latestReplyDraft, normalizeReplyDraft),
    replyDrafts: asArray(record.reply_drafts ?? record.replyDrafts).map((item, draftIndex) => normalizeReplyDraft(item, draftIndex)),
    messages: asArray(record.messages).map((item, messageIndex) => normalizeConversationMessage(item, messageIndex)),
  };
}

function normalizeAgentTrainingEntry(value: unknown, index = 0): AgentTrainingEntryRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `training-entry-${index}`,
    category: pickString(record, ["category"]) || "client_preference",
    title: pickString(record, ["title"]) || "Training entry",
    content: pickString(record, ["content"]) || "",
    visibility: pickString(record, ["visibility"]) || "client_visible",
    status: pickString(record, ["status"]) || "active",
    source: pickString(record, ["source"]) || "manual",
    appliesTo: pickString(record, ["applies_to", "appliesTo"]) || "all",
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "",
    createdByName: pickString(record, ["created_by_name", "createdByName"]) || "",
    createdByEmail: pickString(record, ["created_by_email", "createdByEmail"]) || "",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
    metadata: asRecord(record.metadata),
  };
}

function normalizeTrainingClassificationSuggestion(value: unknown): TrainingClassificationSuggestion {
  const record = asRecord(value);
  return {
    category: pickString(record, ["category"]) || "client_preference",
    appliesTo: pickString(record, ["applies_to", "appliesTo"]) || "all",
    confidence: pickNumber(record, ["confidence"]) || 0,
    reason: pickString(record, ["reason"]) || "Please review this suggestion before saving.",
  };
}

function normalizeResponseRuleCategory(value: unknown, index = 0): ResponseRuleCategoryRecord {
  const record = asRecord(value);
  return {
    key: pickString(record, ["key"]) || `response-rule-category-${index}`,
    label: pickString(record, ["label"]) || "Reply category",
    description: pickString(record, ["description"]) || "",
    triggerPhrases: asArray(record.triggerPhrases ?? record.trigger_phrases).map((item) => String(item || "")).filter(Boolean),
    actionType: pickString(record, ["actionType", "action_type"]) || "prepare_reply_draft",
    defaultSubject: pickString(record, ["defaultSubject", "default_subject"]) || "",
    defaultBody: pickString(record, ["defaultBody", "default_body"]) || "",
    requiresHumanReview: pickBoolean(record, ["requiresHumanReview", "requires_human_review"]) ?? false,
    manualReplyRequired: pickBoolean(record, ["manualReplyRequired", "manual_reply_required"]) ?? true,
    draftReplyEnabled: pickBoolean(record, ["draftReplyEnabled", "draft_reply_enabled"]) ?? true,
  };
}

function normalizeResponseRule(value: unknown, index = 0): ResponseRuleRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `response-rule-${index}`,
    approvalId: pickString(record, ["approval_id", "approvalId"]) || "",
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "",
    campaignVariantId: pickString(record, ["campaign_variant_id", "campaignVariantId"]) || "",
    templateName: pickString(record, ["template_name", "templateName"]) || "",
    variantLabel: pickString(record, ["variant_label", "variantLabel"]) || "",
    ruleKey: pickString(record, ["rule_key", "ruleKey"]) || "",
    ruleKind: pickString(record, ["rule_kind", "ruleKind"]) || "response_rule",
    name: pickString(record, ["name"]) || "Response rule",
    description: pickString(record, ["description"]) || "",
    category: pickString(record, ["category"]) || "",
    categoryLabel: pickString(record, ["category_label", "categoryLabel"]) || "",
    triggerType: pickString(record, ["trigger_type", "triggerType"]) || "category_match",
    triggerPhrases: asArray(record.trigger_phrases ?? record.triggerPhrases).map((item) => String(item || "")).filter(Boolean),
    conditions: asRecord(record.conditions),
    actionType: pickString(record, ["action_type", "actionType"]) || "prepare_reply_draft",
    manualReplyRequired: pickBoolean(record, ["manual_reply_required", "manualReplyRequired"]) ?? true,
    draftReplyEnabled: pickBoolean(record, ["draft_reply_enabled", "draftReplyEnabled"]) ?? true,
    autoReplyEnabled: pickBoolean(record, ["auto_reply_enabled", "autoReplyEnabled"]) ?? false,
    autoReplyStatus: pickString(record, ["auto_reply_status", "autoReplyStatus"]) || "off",
    autoReplyDelayMinutes: pickNumber(record, ["auto_reply_delay_minutes", "autoReplyDelayMinutes"]),
    autoReplyWindowStart: pickString(record, ["auto_reply_window_start", "autoReplyWindowStart"]) || "",
    autoReplyWindowEnd: pickString(record, ["auto_reply_window_end", "autoReplyWindowEnd"]) || "",
    autoReplyDurationDays: pickNumber(record, ["auto_reply_duration_days", "autoReplyDurationDays"]),
    maxAutoRepliesPerConversation: normalizeCount(record.max_auto_replies_per_conversation ?? record.maxAutoRepliesPerConversation) || 1,
    replyTemplateSubject: pickString(record, ["reply_template_subject", "replyTemplateSubject"]) || "",
    replyTemplateBody: pickString(record, ["reply_template_body", "replyTemplateBody"]) || "",
    enabled: pickBoolean(record, ["rule_enabled", "enabled"]) ?? (pickBoolean(asRecord(record.metadata), ["rule_enabled", "ruleEnabled"]) ?? true),
    defaultRule: pickBoolean(record, ["default_rule", "defaultRule"]) ?? (pickBoolean(asRecord(record.metadata), ["default_rule", "defaultRule", "seeded_default"]) ?? false),
    requiresApproval: pickBoolean(record, ["requires_approval", "requiresApproval"]) ?? true,
    status: pickString(record, ["status"]) || "draft",
    visibility: pickString(record, ["visibility"]) || "client_visible",
    priority: normalizeCount(record.priority) || 100,
    scopeLevel: pickString(record, ["scope_level", "scopeLevel"]) || "general",
    appliesToLabel: pickString(record, ["applies_to_label", "appliesToLabel"]) || "All campaigns",
    createdByName: pickString(record, ["created_by_name", "createdByName"]) || "",
    updatedByName: pickString(record, ["updated_by_name", "updatedByName"]) || "",
    approvedByName: pickString(record, ["approved_by_name", "approvedByName"]) || "",
    approvedAt: normalizeTimestamp(record.approved_at ?? record.approvedAt),
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
    metadata: asRecord(record.metadata),
  };
}

function normalizeOutreachBlocker(value: unknown, index = 0): OutreachBlockerRecord {
  const record = asRecord(value);
  return {
    code: pickString(record, ["code"]) || `blocker-${index}`,
    count: pickNumber(record, ["count"]),
    message: pickString(record, ["message"]) || "",
  };
}

function normalizeMailbox(value: unknown, index = 0): MailboxRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `mailbox-${index}`,
    mailboxName: pickString(record, ["mailbox_name", "mailboxName"]) || "Untitled mailbox",
    fromName: pickString(record, ["from_name", "fromName"]) || "",
    fromEmail: pickString(record, ["from_email", "fromEmail"]) || "",
    providerType: pickString(record, ["provider_type", "providerType"]) || "other",
    connectionStatus: pickString(record, ["connection_status", "connectionStatus"]) || "not_connected",
    sendingEnabled: pickBoolean(record, ["sending_enabled", "sendingEnabled"]) ?? false,
    dailySendLimit: pickNumber(record, ["daily_send_limit", "dailySendLimit"]),
    monthlySendLimit: pickNumber(record, ["monthly_send_limit", "monthlySendLimit"]),
    sentToday: normalizeCount(record.sent_today ?? record.sentToday),
    sentThisMonth: normalizeCount(record.sent_this_month ?? record.sentThisMonth),
    lastHealthCheckAt: normalizeTimestamp(record.last_health_check_at ?? record.lastHealthCheckAt),
    lastError: pickString(record, ["last_error", "lastError"]) || "",
  };
}

function normalizeMailboxConnectionCheck(value: unknown): MailboxConnectionCheck | null {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;

  return {
    providerType: pickString(record, ["provider_type", "providerType"]) || "",
    configured: pickBoolean(record, ["configured"]) ?? false,
    configurationMode: pickString(record, ["configuration_mode", "configurationMode"]) || "",
    connected: pickBoolean(record, ["connected"]) ?? false,
    connectionStatus: pickString(record, ["connection_status", "connectionStatus"]) || "not_connected",
    apiKeyConfigured: pickBoolean(record, ["api_key_configured", "apiKeyConfigured"]) ?? undefined,
    oauthConfigured: pickBoolean(record, ["oauth_configured", "oauthConfigured"]) ?? undefined,
    encryptionReady: pickBoolean(record, ["encryption_ready", "encryptionReady"]) ?? undefined,
    credentialsStored: pickBoolean(record, ["credentials_stored", "credentialsStored"]) ?? undefined,
    expectedMailbox: pickString(record, ["expected_mailbox", "expectedMailbox"]) || "",
    signedInMailbox: pickString(record, ["signed_in_mailbox", "signedInMailbox"]) || "",
    signedInUser: pickString(record, ["signed_in_user", "signedInUser"]) || "",
    senderStatus: pickString(record, ["sender_status", "senderStatus"]) || "",
    senderVerified: pickBoolean(record, ["sender_verified", "senderVerified"]) ?? undefined,
    defaultFromDomain: pickString(record, ["default_from_domain", "defaultFromDomain"]) || "",
    checkedAt: normalizeTimestamp(record.checked_at ?? record.checkedAt),
    blockers: asArray(record.blockers).map((item, index) => normalizeOutreachBlocker(item, index)),
  };
}

function normalizeMicrosoftReplySyncStatus(value: unknown): MicrosoftReplySyncStatusRecord {
  const record = asRecord(value);
  const mailbox = asRecord(record.mailbox);
  const connectionCheck = normalizeMailboxConnectionCheck(record.connection_check ?? record.connectionCheck);
  const connectionCheckRecord = asRecord(connectionCheck);

  return {
    mailboxId: pickString(mailbox, ["id", "_id"]) || "",
    mailboxName: pickString(mailbox, ["mailbox_name", "mailboxName"]) || "Microsoft reply sync mailbox",
    mailboxEmail: pickString(mailbox, ["from_email", "fromEmail"]) || (connectionCheck?.expectedMailbox ?? ""),
    providerType: pickString(record, ["provider_type", "providerType"]) || pickString(mailbox, ["provider_type", "providerType"]) || "microsoft",
    connectionStatus: pickString(record, ["connection_status", "connectionStatus"]) || connectionCheck?.connectionStatus || "not_connected",
    connected: pickBoolean(connectionCheckRecord, ["connected"]) ?? false,
    configured: pickBoolean(connectionCheckRecord, ["oauthConfigured"]) ?? false,
    credentialsStored: pickBoolean(connectionCheckRecord, ["credentialsStored"]) ?? false,
    signedInMailbox: connectionCheck?.signedInMailbox || "",
    signedInUser: connectionCheck?.signedInUser || "",
    blockers: connectionCheck?.blockers || [],
  };
}

function normalizeMailboxOAuthStartResponse(value: unknown): MailboxOAuthStartResponse {
  const record = asRecord(value);
  return {
    mailboxId: pickString(record, ["mailbox_id", "mailboxId"]) || "",
    mailboxName: pickString(record, ["mailbox_name", "mailboxName"]) || "Untitled mailbox",
    providerType: pickString(record, ["provider_type", "providerType"]) || "google_workspace",
    connectionStatus: pickString(record, ["connection_status", "connectionStatus"]) || "pending",
    authUrl: pickString(record, ["auth_url", "authUrl"]) || "",
    expiresAt: normalizeTimestamp(record.expires_at ?? record.expiresAt),
    redirectUri: pickString(record, ["redirect_uri", "redirectUri"]) || "",
    scopes: asArray(record.scopes).map((item) => String(item || "")).filter(Boolean),
    sendingEnabled: pickBoolean(record, ["sending_enabled", "sendingEnabled"]) ?? false,
    note: pickString(record, ["note", "message"]) || "",
  };
}

function normalizeOutreachRenderPreview(value: unknown): OutreachRenderPreview {
  const record = asRecord(value);
  const template = asRecord(record.template);
  const followupSequence = asRecord(record.followup_sequence ?? record.followupSequence);
  const metadata = asRecord(record.metadata);

  return {
    dryRun: pickBoolean(record, ["dry_run", "dryRun"]) ?? true,
    renderable: pickBoolean(record, ["renderable"]) ?? false,
    fromName: pickString(record, ["from_name", "fromName"]) || "",
    fromEmail: pickString(record, ["from_email", "fromEmail"]) || "",
    recipientName: pickString(record, ["recipient_name", "recipientName"]) || "",
    recipientEmail: pickString(record, ["recipient_email", "recipientEmail"]) || "",
    companyName: pickString(record, ["company_name", "companyName"]) || "",
    subject: pickString(record, ["subject"]) || "",
    body: pickString(record, ["body"]) || "",
    htmlBody: pickString(record, ["html_body", "htmlBody"]) || "",
    image: normalizeResolvedImagePreview(record.image),
    missingPlaceholders: asArray(record.missing_placeholders).map((item) => String(item || "")).filter(Boolean),
    template: {
      name: pickString(template, ["name"]) || "",
      type: pickString(template, ["type"]) || "",
      variantLabel: pickString(template, ["variant_label", "variantLabel"]) || "",
    },
    followupSequence: {
      name: pickString(followupSequence, ["name"]) || "",
      followupCount: normalizeCount(followupSequence.followup_count ?? followupSequence.followupCount),
    },
    metadata: {
      queueItemId: pickString(metadata, ["queue_item_id", "queueItemId"]) || "",
      queueStatus: pickString(metadata, ["queue_status", "queueStatus"]) || "",
      approvalStatus: pickString(metadata, ["approval_status", "approvalStatus"]) || "",
      mailboxStatus: pickString(metadata, ["mailbox_status", "mailboxStatus"]) || "",
      providerType: pickString(metadata, ["provider_type", "providerType"]) || "",
    },
  };
}

function normalizeOutreachRenderPreviewResponse(value: unknown) {
  const record = asRecord(value);
  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    queueItemId: pickString(record, ["queue_item_id", "queueItemId"]) || "",
    renderPreviewAvailable: pickBoolean(record, ["render_preview_available", "renderPreviewAvailable"]) ?? false,
    preview: normalizeOutreachRenderPreview(record.preview),
    readiness: {
      sendReady: pickBoolean(asRecord(record.readiness), ["send_ready", "sendReady"]) ?? false,
      sendAllowed: pickBoolean(asRecord(record.readiness), ["send_allowed", "sendAllowed"]) ?? false,
      blockers: asArray(asRecord(record.readiness).blockers).map((item, index) => normalizeOutreachBlocker(item, index)),
    },
  };
}

function normalizeVerifiedContactPlanning(value: unknown, index = 0): VerifiedContactPlanningRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `verified-contact-${index}`,
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "Unassigned",
    companyName: pickString(record, ["company_name", "companyName"]) || "Unnamed company",
    contactName: pickString(record, ["contact_name", "contactName"]) || "",
    contactTitle: pickString(record, ["contact_title", "contactTitle"]) || "",
    email: pickString(record, ["email", "enriched_email", "enrichedEmail"]) || "",
    emailStatus: pickString(record, ["email_status", "emailStatus", "enriched_email_status", "enrichedEmailStatus"]) || "",
    providerStatus: pickString(record, ["provider_status", "providerStatus"]) || "",
    planningStatus: pickString(record, ["planning_status", "planningStatus"]) || "blocked",
    outreachQueueId: pickString(record, ["outreach_queue_id", "outreachQueueId"]) || "",
    outreachQueueStatus: pickString(record, ["outreach_queue_status", "outreachQueueStatus"]) || "",
    approvalStatus: pickString(record, ["approval_status", "approvalStatus"]) || "pending",
    mailboxStatus: pickString(record, ["mailbox_status", "mailboxStatus"]) || "not_connected",
    variantLabel: pickString(record, ["variant_label", "variantLabel"]) || "",
    sequenceName: pickString(record, ["sequence_name", "sequenceName"]) || "",
    blockers: asArray(record.blockers).map((item, blockerIndex) => normalizeOutreachBlocker(item, blockerIndex)),
    verifiedAt: normalizeTimestamp(record.verified_at ?? record.verifiedAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
  };
}

function normalizeEnrichmentCreditApproval(value: unknown, index = 0): EnrichmentCreditApprovalRecord {
  const record = asRecord(value);
  const approvalDetails = asRecord(record.approval_details ?? record.approvalDetails ?? record.details);
  const approvalMetadata = asRecord(record.approval_metadata ?? record.approvalMetadata ?? record.metadata);
  return {
    queueItemId: pickString(record, ["queue_item_id", "queueItemId", "id"]) || `queue-item-${index}`,
    approvalId: pickString(record, ["approval_id", "approvalId"]) || "",
    companyName: pickString(record, ["company_name", "companyName"]) || "Unnamed raw lead",
    contactName:
      pickString(record, ["contact_name", "contactName", "raw_contact_name", "rawContactName"]) ||
      pickString(approvalDetails, ["contact_name", "contactName"]) ||
      "",
    targetRole:
      pickString(record, ["target_role", "targetRole", "raw_contact_title", "rawContactTitle"]) ||
      pickString(approvalDetails, ["target_role", "targetRole"]) ||
      "",
    providerLabel:
      pickString(record, ["provider_label", "providerLabel"]) ||
      pickString(approvalDetails, ["provider", "provider_label", "providerLabel"]) ||
      "",
    rawLeadId: pickString(record, ["raw_lead_id", "rawLeadId"]) || "",
    rawLeadStatus: pickString(record, ["raw_lead_status", "rawLeadStatus"]) || "",
    campaignId: pickString(record, ["campaign_id", "campaignId"]) || "",
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "",
    queueStatus: pickString(record, ["queue_status", "queueStatus", "status"]) || "",
    creditApprovalStatus: pickString(record, ["credit_approval_status", "creditApprovalStatus"]) || "",
    providerStatus: pickString(record, ["provider_status", "providerStatus"]) || "",
    apolloPlanned: pickBoolean(record, ["apollo_planned", "apolloPlanned"]) ?? false,
    hunterPlanned: pickBoolean(record, ["hunter_planned", "hunterPlanned"]) ?? false,
    approvalDetails,
    approvalMetadata,
    createdAt: normalizeTimestamp(record.approval_created_at ?? record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.approval_updated_at ?? record.updated_at ?? record.updatedAt),
  };
}

function normalizeInternalNote(value: unknown, index = 0) {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `internal-note-${index}`,
    note: pickString(record, ["note", "message"]) || "",
    createdByName: pickString(record, ["created_by_name", "createdByName"]) || "",
    createdByRole: pickString(record, ["created_by_role", "createdByRole"]) || "",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
  };
}

function normalizeQualificationAction(value: unknown, index = 0) {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `qualification-action-${index}`,
    companyName: pickString(record, ["company_name", "companyName"]) || "Unnamed raw lead",
    status: pickString(record, ["status"]) || "unknown",
    qualificationScore: normalizeCount(record.qualification_score ?? record.qualificationScore),
    qualificationNotes: pickString(record, ["qualification_notes", "qualificationNotes"]) || "",
    modelRouteUsed: pickString(record, ["model_route_used", "modelRouteUsed"]) || "",
    confidenceScore: normalizeCount(record.confidence_score ?? record.confidenceScore),
    escalationRequired: pickBoolean(record, ["escalation_required", "escalationRequired"]) ?? false,
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
  };
}

function normalizeEnrichmentAction(value: unknown, index = 0) {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `enrichment-action-${index}`,
    rawLeadId: pickString(record, ["raw_lead_id", "rawLeadId"]) || "",
    status: pickString(record, ["status"]) || "unknown",
    eligibilityStatus: pickString(record, ["eligibility_status", "eligibilityStatus"]) || "",
    budgetCheckStatus: pickString(record, ["budget_check_status", "budgetCheckStatus"]) || "",
    apolloPlanned: pickBoolean(record, ["apollo_planned", "apolloPlanned"]) ?? false,
    hunterPlanned: pickBoolean(record, ["hunter_planned", "hunterPlanned"]) ?? false,
    creditApprovalStatus: pickString(record, ["credit_approval_status", "creditApprovalStatus"]) || "",
    providerStatus: pickString(record, ["provider_status", "providerStatus"]) || "",
    providerError: pickString(record, ["provider_error", "providerError"]) || "",
    enrichedContactName: pickString(record, ["enriched_contact_name", "enrichedContactName"]) || "",
    enrichedContactTitle: pickString(record, ["enriched_contact_title", "enrichedContactTitle"]) || "",
    enrichedEmail: pickString(record, ["enriched_email", "enrichedEmail"]) || "",
    enrichedEmailStatus: pickString(record, ["enriched_email_status", "enrichedEmailStatus"]) || "",
    enrichedPhone: pickString(record, ["enriched_phone", "enrichedPhone"]) || "",
    enrichedSource: pickString(record, ["enriched_source", "enrichedSource"]) || "",
    enrichmentNotes: pickString(record, ["enrichment_notes", "enrichmentNotes"]) || "",
    modelRouteUsed: pickString(record, ["enrichment_model_route_used", "enrichmentModelRouteUsed"]) || "",
    confidenceScore: normalizeCount(record.enrichment_confidence_score ?? record.enrichmentConfidenceScore),
    requiresApproval: pickBoolean(record, ["requires_approval", "requiresApproval"]) ?? false,
    lastProcessedAt: normalizeTimestamp(record.last_processed_at ?? record.lastProcessedAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
  };
}

export function normalizeRequestHistory(value: unknown, index = 0): RequestHistoryRecord {
  const record = asRecord(value);
  const replies = normalizeRequestReplies(
    record.replies ?? record.client_visible_replies ?? record.clientVisibleReplies ?? record.timeline ?? record.updates,
  );
  const latestReplyRecord = replies.length ? replies[replies.length - 1] : null;

  return {
    id: pickString(record, ["id", "_id", "request_id", "requestId"]) || `request-${index}`,
    category: normalizeRequestCategory(
      pickString(record, ["category", "request_category", "requestCategory", "type"]),
    ),
    title: pickString(record, ["title", "subject", "name"]) || "Untitled request",
    message: pickString(record, ["message", "details", "body", "description"]) || "",
    clientVisibleStatus: normalizeRequestVisibleStatus(
      pickString(record, ["client_visible_status", "clientVisibleStatus", "status"]),
    ),
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt ?? record.timestamp),
    createdByName: getRequestAuthor(record).name,
    createdByEmail: getRequestAuthor(record).email,
    createdByRole: getRequestAuthor(record).role,
    latestReply:
      pickString(record, [
        "latest_client_visible_reply",
        "latestClientVisibleReply",
        "latest_reply",
        "latestReply",
        "reply_preview",
        "replyPreview",
      ]) ||
      latestReplyRecord?.message ||
      null,
    latestReplyAt:
      normalizeTimestamp(
        record.latest_reply_at ?? record.latestReplyAt ?? record.last_reply_at ?? record.lastReplyAt,
      ) || latestReplyRecord?.createdAt,
  };
}

export function normalizeRequestDetail(value: unknown, index = 0): RequestDetailRecord {
  const record = asRecord(value);
  const nested =
    asRecord(record.request).id || asRecord(record.request)._id ? asRecord(record.request) :
    asRecord(asRecord(record.data).request).id || asRecord(asRecord(record.data).request)._id ? asRecord(asRecord(record.data).request) :
    asRecord(record.data).id || asRecord(record.data)._id ? asRecord(record.data) :
    record;
  const base = normalizeRequestHistory(nested, index);
  const replies = normalizeRequestReplies(
    nested.replies ??
      nested.client_visible_replies ??
      nested.clientVisibleReplies ??
      nested.timeline ??
      nested.updates ??
      record.replies ??
      record.client_visible_replies ??
      record.clientVisibleReplies ??
      asRecord(record.data).replies,
  );

  return {
    ...base,
    replies,
  };
}

export function normalizeRequestReply(value: unknown, index = 0): RequestReplyRecord {
  const record = asRecord(value);
  const metadata = asRecord(record.metadata);
  const explicitType = pickString(record, ["type", "event_type", "eventType", "kind"]);
  const status = normalizeRequestVisibleStatus(
    pickString(record, ["status", "client_visible_status", "clientVisibleStatus", "to_status", "toStatus"]) ||
      pickString(metadata, ["status", "client_visible_status", "clientVisibleStatus", "to_status", "toStatus"]),
  );
  const message =
    pickString(record, ["message", "body", "reply", "comment", "details", "description", "summary"]) ||
    pickString(metadata, ["message", "body", "reply"]) ||
    (status ? `Status updated to ${formatRequestLabel(status)}.` : "Request updated.");
  const author = getRequestAuthor(record);

  return {
    id: pickString(record, ["id", "_id", "reply_id", "replyId"]) || `request-reply-${index}`,
    type: normalizeRequestReplyType(explicitType, Boolean(status), message),
    message,
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt ?? record.timestamp),
    authorName: author.name,
    authorEmail: author.email,
    authorRole: author.role,
    status,
  };
}

export function normalizeRequestReplies(value: unknown): RequestReplyRecord[] {
  return asArray(value)
    .filter(isClientVisibleRequestReplyValue)
    .map((item, index) => normalizeRequestReply(item, index))
    .filter((reply) => isClientVisibleRequestReply(reply));
}

function normalizeLeadActivityResponse(value: unknown): LeadActivityRecord[] {
  if (Array.isArray(value)) {
    return value.map(normalizeLeadActivityRecord).filter(Boolean);
  }

  const record = asRecord(value);
  const activity = asArray(record.activity ?? record.activities ?? record.history ?? record.comments);
  return activity.map(normalizeLeadActivityRecord).filter(Boolean);
}

function normalizeLeadActivityRecord(value: unknown, index = 0): LeadActivityRecord {
  const record = asRecord(value);
  const metadata = asRecord(record.metadata);
  const explicitType = pickString(record, ["type", "activity_type", "activityType", "event_type", "eventType", "kind"]);
  const description = pickString(record, ["description", "message", "summary"]);
  const comment =
    pickString(record, ["comment", "note", "body", "text", "message"]) ||
    (explicitType === "comment_added" ? description : undefined);
  const status = getActivityStatus(record);
  const type = normalizeActivityType(explicitType, Boolean(comment), Boolean(status));
  const userRecord = asRecord(record.user ?? record.actor ?? record.created_by ?? record.createdBy ?? record.updated_by ?? record.updatedBy);
  const userName =
    pickString(userRecord, ["name", "full_name", "fullName"]) ||
    pickString(record, ["user_name", "userName", "author_name", "authorName", "created_by_name", "updated_by_name"]);
  const userEmail =
    pickString(userRecord, ["email"]) ||
    pickString(record, ["user_email", "userEmail", "author_email", "authorEmail", "created_by_email", "updated_by_email"]);
  const userRole =
    pickString(userRecord, ["role"]) ||
    pickString(record, ["user_role", "userRole", "author_role", "authorRole"]);

  return {
    id: pickString(record, ["id", "_id"]) || `activity-${index}`,
    type,
    status,
    comment,
    message:
      description ||
      (type === "status_change" && status ? `Status updated to ${formatLeadStatus(status)}.` : "") ||
      pickString(metadata, ["message"]) ||
      comment ||
      "Lead activity updated.",
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt ?? record.timestamp),
    userName,
    userEmail,
    userRole,
  };
}

function getRequestAuthor(record: Record<string, unknown>) {
  const userRecord = asRecord(record.user ?? record.actor ?? record.author ?? record.created_by ?? record.createdBy);
  return {
    name:
      pickString(userRecord, ["name", "full_name", "fullName"]) ||
      pickString(record, ["created_by_name", "createdByName", "author_name", "authorName"]),
    email:
      pickString(userRecord, ["email"]) ||
      pickString(record, ["created_by_email", "createdByEmail", "author_email", "authorEmail"]),
    role:
      pickString(userRecord, ["role"]) ||
      pickString(record, ["created_by_role", "createdByRole", "author_role", "authorRole"]),
  };
}

function normalizeRequestCategory(value?: string) {
  switch ((value || "").trim().toLowerCase()) {
    case "new_campaign":
    case "campaign_change":
    case "lead_question":
    case "outreach_draft":
    case "support_issue":
      return value!.trim().toLowerCase();
    default:
      return (value || "support_issue").trim() || "support_issue";
  }
}

function normalizeRequestVisibleStatus(value?: string) {
  switch ((value || "").trim().toLowerCase()) {
    case "submitted":
    case "under_review":
    case "in_progress":
    case "waiting_on_you":
    case "completed":
    case "rejected":
      return value!.trim().toLowerCase();
    default:
      return (value || "submitted").trim() || "submitted";
  }
}

function normalizeRequestReplyType(value: string | undefined, hasStatus: boolean, message: string): RequestReplyRecord["type"] {
  switch ((value || "").toLowerCase()) {
    case "message":
      return "message";
    case "reply":
    case "comment":
      return "reply";
    case "status":
    case "status_update":
    case "status_changed":
      return "status_update";
    default:
      if (hasStatus) return "status_update";
      return message ? "reply" : "activity";
  }
}

function isClientVisibleRequestReply(reply: RequestReplyRecord) {
  return Boolean(reply.message || reply.status);
}

function isClientVisibleRequestReplyValue(value: unknown) {
  const record = asRecord(value);
  const visibility = pickString(record, ["visibility", "reply_visibility", "replyVisibility", "audience"]);
  const clientVisible = pickBoolean(record, ["client_visible", "clientVisible", "is_client_visible", "isClientVisible"]);
  const internalOnly = pickBoolean(record, ["internal", "is_internal", "isInternal", "private", "is_private", "isPrivate"]);

  if (internalOnly === true) return false;
  if (clientVisible === false) return false;
  if (visibility && ["internal", "private", "staff", "admin"].includes(visibility.toLowerCase())) return false;
  return true;
}

function formatRequestLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function getActivityStatus(value: unknown) {
  const record = asRecord(value);
  const metadata = asRecord(record.metadata);
  const nextStatus = pickString(record, ["status", "lead_status", "leadStatus", "to_status", "toStatus", "next_status", "nextStatus"]);
  return nextStatus || pickString(metadata, ["to_status", "toStatus", "status"]) || pickString(asRecord(record.status_change), ["status", "to_status", "toStatus"]);
}

function normalizeActivityType(value: string | undefined, hasComment: boolean, hasStatus: boolean): LeadActivityRecord["type"] {
  switch ((value || "").toLowerCase()) {
    case "comment":
    case "note":
    case "comment_added":
      return "comment";
    case "status":
    case "status_change":
    case "lead_status_updated":
    case "status_changed":
      return "status_change";
    default:
      if (hasComment && !hasStatus) return "comment";
      if (hasStatus) return "status_change";
      return "activity";
  }
}

function formatLeadStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStoredAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function extractApiErrorMessage(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";

  try {
    const payload = JSON.parse(trimmed);
    const record = asRecord(payload);
    return (
      pickString(record, ["error", "message"]) ||
      pickString(asRecord(record.errors), ["error", "message"]) ||
      trimmed.slice(0, 500)
    );
  } catch {
    return trimmed.slice(0, 500);
  }
}
