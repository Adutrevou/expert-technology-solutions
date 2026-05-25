// If VITE_LEADS_API_BASE_URL is provided (e.g. the static VPS build sets it to
// https://api.intergrai.co.za), call the upstream directly. Otherwise route
// through the same-origin server proxy at `/api/leads` so the browser is
// never blocked by CORS on preview/published Lovable origins.
const ENV_BASE_URL = String(import.meta.env.VITE_LEADS_API_BASE_URL || "").trim();
export const LEADS_API_BASE_URL = resolveApiBaseUrl(ENV_BASE_URL);
export const INTERGRAI_CLIENT_SLUG = "expert-technology-solutions";
const IS_DEV = Boolean(import.meta.env?.DEV);

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

async function apiGet<T>(path: string): Promise<T> {
  const url = buildApiUrl(path);
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
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

export function getDashboard() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/dashboard`).then(normalizeDashboardResponse);
}

export function getLeads() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/leads`).then(normalizeLeadsResponse);
}

export function getCampaigns() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/campaigns`).then(normalizeCampaignsResponse);
}

export function getReports() {
  return apiGet<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/reports`).then(normalizeReportsResponse);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function resolveApiBaseUrl(value: string): string {
  const trimmed = value.replace(/\/+$/, "");
  if (!trimmed) return "/api/leads";
  if (trimmed.startsWith("/")) return trimmed;

  try {
    return new URL(trimmed).toString().replace(/\/+$/, "");
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString().replace(/\/+$/, "");
    } catch {
      return trimmed;
    }
  }
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${LEADS_API_BASE_URL}${normalizedPath}`;
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

function normalizeCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Number.isNaN(Date.parse(trimmed)) ? undefined : trimmed;
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

function normalizeDashboardResponse(value: unknown): DashboardResponse {
  const record = asRecord(value);
  const campaignCounts = asRecord(record.campaign_counts);
  const leadCounts = asRecord(record.lead_counts);
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
    },
    recent_leads: asArray(record.recent_leads),
    pending_approvals: asArray(record.pending_approvals),
    recent_reports: asArray(record.recent_reports),
  };
}

function normalizeLeadsResponse(value: unknown): LeadsResponse {
  const record = asRecord(value);
  const leads = asArray(record.leads);
  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    client: normalizeClientSummary(record.client),
    count: normalizeCount(record.count) || leads.length,
    leads,
  };
}

function normalizeCampaignsResponse(value: unknown): CampaignsResponse {
  const record = asRecord(value);
  const campaigns = asArray(record.campaigns);
  return {
    ok: pickBoolean(record, ["ok"]) ?? true,
    client: normalizeClientSummary(record.client),
    count: normalizeCount(record.count) || campaigns.length,
    campaigns,
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
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
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
    createdAt: normalizeTimestamp(record.created_at ?? record.createdAt),
    updatedAt: normalizeTimestamp(record.updated_at ?? record.updatedAt),
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
