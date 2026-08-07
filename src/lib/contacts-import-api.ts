// API client for bulk contact CSV import (backend:
// feature/expert-ai-sequencing-upgrade). Mostly reuses apiRequest from
// leads-api.ts, EXCEPT the multipart file upload, which must not get the
// forced `Content-Type: application/json` apiRequest applies to every
// request with a body - the browser needs to set its own multipart
// boundary. That one call does its own minimal fetch instead.
import { apiRequest, INTERGRAI_CLIENT_SLUG, LEADS_API_BASE_URL } from "@/lib/leads-api";

// Must match leads-api.ts's private AUTH_TOKEN_STORAGE_KEY exactly - kept
// as a small, clearly-documented duplicate rather than exporting more
// internals of that file than necessary.
const AUTH_TOKEN_STORAGE_KEY = "ets-auth-token";

export interface RowResult {
  row_number: number;
  valid: boolean;
  action: "create" | "update" | "skip_duplicate_in_file" | "skip_suppressed" | "invalid";
  reason: string | null;
  existing_lead_id?: string;
}

export interface ImportPreviewResult {
  import_id: string;
  summary: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    duplicate_rows: number;
    suppressed_rows: number;
  };
  row_results: RowResult[];
}

export interface ImportRecord {
  id: string;
  status: "previewed" | "committed" | "failed";
  filename: string | null;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  suppressed_rows: number;
  contacts_created: number;
  contacts_updated: number;
  enrolled_count: number;
  sequence_id: string | null;
  committed_at: string | null;
  created_at: string;
}

export interface ContactRecord {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  title: string | null;
  linkedin_url: string | null;
  source: string | null;
  metadata?: {
    audience_type?: "existing_clients" | "quoted_clients";
    quote_status?: QuoteStatus;
  };
  updated_at: string;
}

export type ContactAudienceType = "existing_clients" | "quoted_clients";
export type QuoteStatus = "quoted" | "accepted" | "rejected" | "expired" | "follow_up_needed";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function previewContactImport(
  file: File,
  options?: { campaignId?: string; sequenceId?: string },
): Promise<ImportPreviewResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.campaignId) formData.append("campaign_id", options.campaignId);
  if (options?.sequenceId) formData.append("sequence_id", options.sequenceId);

  const token =
    typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null;
  const headers = new Headers({ Accept: "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(
    `${LEADS_API_BASE_URL}/clients/${INTERGRAI_CLIENT_SLUG}/contacts/import/preview`,
    {
      method: "POST",
      headers,
      body: formData,
    },
  );

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(
      (asRecord(parsed).error as string) || `Import preview failed (${response.status}).`,
    );
  }
  return parsed as ImportPreviewResult;
}

export async function commitContactImport(
  importId: string,
  sequenceId?: string,
  audienceType?: ContactAudienceType,
): Promise<ImportRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/contacts/import/commit`,
    {
      method: "POST",
      body: JSON.stringify({
        import_id: importId,
        sequence_id: sequenceId,
        audience_type: audienceType,
      }),
    },
  );
  return asRecord(value).import as ImportRecord;
}

export async function getContactImport(importId: string): Promise<ImportRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/contacts/imports/${encodeURIComponent(importId)}`,
  );
  return asRecord(value).import as ImportRecord;
}

export async function listContacts(filters?: {
  search?: string;
  source?: string;
  audienceType?: ContactAudienceType;
  limit?: number;
}): Promise<ContactRecord[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.audienceType) params.set("audience_type", filters.audienceType);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  const value = await apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/contacts${query}`);
  return asArray(asRecord(value).contacts) as ContactRecord[];
}

export async function updateContact(
  leadId: string,
  patch: Partial<
    Pick<
      ContactRecord,
      "company_name" | "contact_name" | "phone" | "website" | "title" | "linkedin_url"
    >
  > & { quote_status?: QuoteStatus },
): Promise<ContactRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/contacts/${encodeURIComponent(leadId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return asRecord(value).contact as ContactRecord;
}

export async function enrollContact(
  leadId: string,
  sequenceId: string,
  source?: string,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/contacts/${encodeURIComponent(leadId)}/enroll`,
    {
      method: "POST",
      body: JSON.stringify({ sequence_id: sequenceId, source }),
    },
  );
}
