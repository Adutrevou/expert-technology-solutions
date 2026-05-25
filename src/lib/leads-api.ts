// Default to the public Intergrai API directly so the client preview does not
// rely on internal same-origin routes.
const ENV_BASE_URL = (import.meta.env.VITE_LEADS_API_BASE_URL || "").replace(/\/+$/, "");
export const LEADS_API_BASE_URL = ENV_BASE_URL || "https://api.intergrai.co.za";
export const INTERGRAI_CLIENT_SLUG = "expert-technology-solutions";
const IS_DEV = Boolean(import.meta.env?.DEV);
export const REQUEST_CATEGORIES = [
  "new_campaign",
  "campaign_change",
  "lead_question",
  "outreach_draft",
  "support_issue",
] as const;
export const CLIENT_VISIBLE_REQUEST_STATUSES = [
  "submitted",
  "under_review",
  "in_progress",
  "waiting_on_you",
  "completed",
  "rejected",
] as const;

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
  };
  recent_leads: unknown[];
  pending_approvals: unknown[];
  recent_reports: unknown[];
}

export interface LeadsResponse {
  ok: boolean;
  client: ApiClientSummary;
  count: number;
  leads: unknown[];
}

export interface CampaignsResponse {
  ok: boolean;
  client: ApiClientSummary;
  count: number;
  campaigns: unknown[];
}

export interface ReportsResponse {
  ok: boolean;
  client: ApiClientSummary;
  count: number;
  reports: unknown[];
}

export type LeadQualification = "review" | "warm" | "hot" | "not_qualified";
export type CampaignLifecycleStatus = "active" | "paused" | "completed" | "draft";
export type CampaignApprovalStatus = "pending" | "approved" | "rejected" | "none";
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];
export type ClientVisibleRequestStatus = (typeof CLIENT_VISIBLE_REQUEST_STATUSES)[number];

export interface LeadRecord {
  id: string;
  name: string;
  company: string;
  title: string;
  industry: string;
  location: string;
  email: string;
  qualification: LeadQualification;
  campaignName: string;
  createdAt?: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  status: CampaignLifecycleStatus;
  approvalStatus: CampaignApprovalStatus;
  targetNiche: string;
  targetLocation: string;
  objective: string;
  leadCount?: number;
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

export interface AgentRequestRecord {
  id: string;
  category: RequestCategory;
  title: string;
  message: string;
  status: ClientVisibleRequestStatus;
  createdAt?: string;
  updatedAt?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByRole?: string;
  latestReply?: string;
  relatedLeadId?: string;
  relatedCampaignId?: string;
  replies: AgentRequestReplyRecord[];
}

export interface AgentRequestReplyRecord {
  id: string;
  message: string;
  createdAt?: string;
  authorName?: string;
  authorRole?: string;
}

export interface RequestsResponse {
  ok: boolean;
  client: ApiClientSummary;
  count: number;
  requests: unknown[];
}

export interface RequestDetailResponse {
  ok: boolean;
  client: ApiClientSummary;
  request: unknown;
}

export interface CreateRequestInput {
  category: RequestCategory;
  title?: string;
  message: string;
  related_lead_id?: string | null;
  related_campaign_id?: string | null;
  created_by_name: string;
  created_by_email: string;
  created_by_role: string;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${LEADS_API_BASE_URL}${path}`;
  let response: Response;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (e: any) {
    const msg = `Leads API network error at ${url}: ${e?.message ?? String(e)}`;
    if (IS_DEV) console.error(msg, e);
    throw new Error(msg);
  }

  if (!response.ok) {
    let detail = "";
    try { detail = (await response.text()).slice(0, 500); } catch { /* ignore */ }
    const msg = `Leads API ${response.status} at ${url}${detail ? ` — ${detail}` : ""}`;
    if (IS_DEV) console.error(msg);
    throw new Error(msg);
  }

  return response.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getDashboard() {
  return apiGet<DashboardResponse>(`/clients/${INTERGRAI_CLIENT_SLUG}/dashboard`);
}

export function getLeads() {
  return apiGet<LeadsResponse>(`/clients/${INTERGRAI_CLIENT_SLUG}/leads`);
}

export function getCampaigns() {
  return apiGet<CampaignsResponse>(`/clients/${INTERGRAI_CLIENT_SLUG}/campaigns`);
}

export function getReports() {
  return apiGet<ReportsResponse>(`/clients/${INTERGRAI_CLIENT_SLUG}/reports`);
}

export function getRequests() {
  return apiGet<RequestsResponse>(`/clients/${INTERGRAI_CLIENT_SLUG}/requests`);
}

export function getRequestDetail(requestId: string) {
  return apiGet<RequestDetailResponse>(`/clients/${INTERGRAI_CLIENT_SLUG}/requests/${requestId}`);
}

export function createRequest(input: CreateRequestInput) {
  return apiPost<RequestDetailResponse>(`/clients/${INTERGRAI_CLIENT_SLUG}/requests`, input);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
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
  }
  return undefined;
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
      return "pending";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      return "none";
  }
}

function mapRequestCategory(value?: string): RequestCategory {
  switch ((value || "").toLowerCase()) {
    case "new_campaign":
    case "campaign_change":
    case "lead_question":
    case "outreach_draft":
    case "support_issue":
      return value!.toLowerCase() as RequestCategory;
    default:
      return "lead_question";
  }
}

function mapRequestStatus(value?: string): ClientVisibleRequestStatus {
  switch ((value || "").toLowerCase()) {
    case "submitted":
    case "under_review":
    case "in_progress":
    case "waiting_on_you":
    case "completed":
    case "rejected":
      return value!.toLowerCase() as ClientVisibleRequestStatus;
    default:
      return "submitted";
  }
}

export function normalizeLead(value: unknown, index = 0): LeadRecord {
  const record = asRecord(value);
  const firstName = pickString(record, ["first_name", "firstName"]);
  const lastName = pickString(record, ["last_name", "lastName"]);
  const name =
    pickString(record, ["name", "full_name", "fullName", "contact_name", "contactName"]) ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Unnamed lead";

  const location =
    pickString(record, ["location"]) ||
    [pickString(record, ["city"]), pickString(record, ["state"]), pickString(record, ["country"])]
      .filter(Boolean)
      .join(", ");

  return {
    id: pickString(record, ["id", "_id"]) || `lead-${index}`,
    name,
    company: pickString(record, ["company", "company_name", "companyName"]) || "Unknown company",
    title: pickString(record, ["title", "job_title", "jobTitle", "role"]) || "Unknown title",
    industry: pickString(record, ["industry", "target_niche", "targetNiche"]) || "Unknown industry",
    location: location || "Unknown location",
    email: pickString(record, ["email"]) || "",
    qualification: mapQualification(
      pickString(record, ["qualification", "status", "lead_status", "leadStatus"]),
    ),
    campaignName: pickString(record, ["campaign_name", "campaignName"]) || "Unassigned",
    createdAt: pickString(record, ["created_at", "createdAt"]),
  };
}

export function normalizeCampaign(value: unknown, index = 0): CampaignRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `campaign-${index}`,
    name: pickString(record, ["name"]) || "Untitled campaign",
    status: mapCampaignStatus(pickString(record, ["status"])),
    approvalStatus: mapApprovalStatus(pickString(record, ["approval_status", "approvalStatus"])),
    targetNiche: pickString(record, ["target_niche", "targetNiche"]) || "Not specified",
    targetLocation: pickString(record, ["target_location", "targetLocation"]) || "Not specified",
    objective: pickString(record, ["objective", "goal"]) || "No objective provided yet.",
    leadCount: pickNumber(record, ["lead_count", "leadCount"]),
    createdAt: pickString(record, ["created_at", "createdAt"]),
    updatedAt: pickString(record, ["updated_at", "updatedAt"]),
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

export function normalizeRequestReply(value: unknown, index = 0): AgentRequestReplyRecord {
  const record = asRecord(value);
  return {
    id: pickString(record, ["id", "_id"]) || `reply-${index}`,
    message:
      pickString(record, ["message", "body", "content", "reply_text", "replyText"]) ||
      "No reply message available.",
    createdAt: pickString(record, ["created_at", "createdAt"]),
    authorName: pickString(record, ["author_name", "authorName", "created_by_name", "createdByName"]),
    authorRole: pickString(record, ["author_role", "authorRole", "created_by_role", "createdByRole"]),
  };
}

function collectReplyCandidates(record: Record<string, unknown>) {
  const candidateKeys = [
    "replies",
    "reply_history",
    "client_visible_replies",
    "client_visible_updates",
    "updates",
    "messages",
    "public_updates",
    "timeline",
    "acknowledgements",
  ] as const;

  const items: unknown[] = [];
  for (const key of candidateKeys) {
    const value = record[key];
    if (Array.isArray(value)) items.push(...value);
  }

  const latestReply = record.latest_reply;
  if (Array.isArray(latestReply)) items.push(...latestReply);
  else if (latestReply) items.push(latestReply);

  const acknowledgement =
    record.acknowledgement || record.acknowledgment || record.auto_acknowledgement || record.auto_acknowledgment;
  if (Array.isArray(acknowledgement)) items.push(...acknowledgement);
  else if (acknowledgement) items.push(acknowledgement);

  return items;
}

export function normalizeRequest(value: unknown, index = 0): AgentRequestRecord {
  const record = asRecord(value);
  const replies = collectReplyCandidates(record)
    .map((reply, replyIndex) => normalizeRequestReply(reply, replyIndex))
    .filter((reply, replyIndex, collection) => {
      const key = `${reply.id}:${reply.message}:${reply.createdAt || ""}`;
      return collection.findIndex((candidate) => `${candidate.id}:${candidate.message}:${candidate.createdAt || ""}` === key) === replyIndex;
    });
  const latestReplyRecord = replies[0];
  const category = mapRequestCategory(pickString(record, ["category", "request_type", "requestType"]));
  const message =
    pickString(record, ["message", "details", "description", "body", "content"]) ||
    "No request details provided.";

  return {
    id: pickString(record, ["id", "_id", "request_id", "requestId"]) || `request-${index}`,
    category,
    title:
      pickString(record, ["title", "subject", "request_title", "requestTitle"]) ||
      message.slice(0, 72).trim() ||
      category.replace(/_/g, " "),
    message,
    status: mapRequestStatus(pickString(record, ["client_visible_status", "status", "clientStatus"])),
    createdAt: pickString(record, ["created_at", "createdAt"]),
    updatedAt: pickString(record, ["updated_at", "updatedAt"]),
    createdByName: pickString(record, ["created_by_name", "createdByName"]),
    createdByEmail: pickString(record, ["created_by_email", "createdByEmail"]),
    createdByRole: pickString(record, ["created_by_role", "createdByRole"]),
    latestReply: latestReplyRecord?.message || pickString(record, ["latest_reply_text", "latestReplyText"]),
    relatedLeadId: pickString(record, ["related_lead_id", "relatedLeadId", "lead_id", "leadId"]),
    relatedCampaignId: pickString(record, ["related_campaign_id", "relatedCampaignId", "campaign_id", "campaignId"]),
    replies,
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
    createdAt: pickString(record, ["created_at", "createdAt"]),
  };
}
