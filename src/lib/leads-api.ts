// If VITE_LEADS_API_BASE_URL is provided (e.g. the static VPS build sets it to
// https://api.intergrai.co.za), call the upstream directly. Otherwise route
// through the same-origin server proxy at `/api/leads` so the browser is
// never blocked by CORS on preview/published Lovable origins.
const ENV_BASE_URL = (import.meta.env.VITE_LEADS_API_BASE_URL || "").replace(/\/+$/, "");
export const LEADS_API_BASE_URL = ENV_BASE_URL || "/api/leads";
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
  const url = `${LEADS_API_BASE_URL}${path}`;
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

  return response.json() as Promise<T>;
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
