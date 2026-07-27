// API client for the Expert AI sequencing upgrade (backend:
// feature/expert-ai-sequencing-upgrade). Reuses the exact same
// fetch/auth/base-URL path as leads-api.ts (apiRequest, INTERGRAI_CLIENT_SLUG)
// so it behaves identically for auth, error surfacing, and network handling -
// no separate client logic to drift out of sync.
import { apiRequest, INTERGRAI_CLIENT_SLUG } from "@/lib/leads-api";

export type SequenceStatus = "draft" | "active" | "paused" | "archived";
export type SendingMode = "dry_run" | "queue_for_approval" | "auto_send_if_policy_allows";
export type EnrollmentStatus =
  | "pending"
  | "active"
  | "waiting"
  | "queued"
  | "sent"
  | "replied"
  | "bounced"
  | "unsubscribed"
  | "paused"
  | "completed"
  | "failed"
  | "disqualified";
export type EnrollmentSource =
  | "ai_discovery"
  | "manual_upload"
  | "imported_csv"
  | "existing_lead"
  | "bitrix_manual";

export interface SequenceRecord {
  id: string;
  name: string;
  status: SequenceStatus;
  approval_status: string;
  sending_mode: SendingMode;
  daily_send_cap: number | null;
  timezone: string;
  business_days_only: boolean;
  stop_on_reply: boolean;
  stop_on_bounce: boolean;
  stop_on_disqualified: boolean;
  campaign_id: string | null;
  campaign_name?: string | null;
  campaign_contact_count?: number;
  enrolled_count?: number;
  already_enrolled_count?: number;
  launch_due_count?: number;
  launch_processed_count?: number;
  launch_queued_count?: number;
  live_sending_enabled?: boolean;
  metadata?: Record<string, unknown>;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SequenceStepRecord {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  send_weekday: number | null;
  send_week_of_month: number | null;
  send_month: number | null;
  subject_template: string | null;
  body_template: string;
  signature: string | null;
  image_asset_id: string | null;
  template_variables: Record<string, unknown>;
  ai_personalization_enabled: boolean;
  status: "active" | "inactive";
}

export interface EnrollmentRecord {
  id: string;
  sequence_id: string;
  lead_id: string | null;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  location?: string;
  title?: string;
  domain?: string;
  linkedin_url?: string;
  lead_source?: string;
  qualification?: string;
  lead_score?: number | null;
  metadata?: Record<string, unknown>;
  current_step: number;
  status: EnrollmentStatus;
  last_sent_at: string | null;
  next_due_at: string | null;
  error_reason: string | null;
  source: EnrollmentSource;
  send_attempts: number;
  replies: number;
  bounces: number;
  conversation_id?: string | null;
  reply_status?: string | null;
  conversation_status?: string | null;
  reply_subject?: string | null;
  reply_preview?: string | null;
  replied_at?: string | null;
}

export interface SequenceMetrics {
  total_enrolled: number;
  active: number;
  pending: number;
  waiting: number;
  queued: number;
  sent: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  completed: number;
  failed: number;
  disqualified: number;
  paused: number;
  reply_rate: number;
  bounce_rate: number;
  step_level: Array<{
    step_number: number;
    enrollments: number;
    send_attempts: number;
    replies: number;
    bounces: number;
  }>;
  opens: number | null;
  clicks: number | null;
  last_run_at: string | null;
  next_due_count: number;
}

export type SequenceTestRunStatus =
  | "preview_ready"
  | "sending"
  | "partially_sent"
  | "sent"
  | "failed";
export type SequenceTestRunMode = "preview" | "single_step" | "full_sequence";

export interface SequenceTestMessageRecord {
  id: string;
  run_id: string;
  recipient_name: string;
  recipient_company: string | null;
  recipient_email: string;
  step_id: string | null;
  step_number: number;
  subject: string;
  body: string;
  signature: string | null;
  image_asset_id: string | null;
  image_url: string | null;
  image_alt_text: string | null;
  status: "preview" | "sending" | "sent" | "failed";
  provider_message_id: string | null;
  error: string | null;
  sent_at: string | null;
}

export interface SequenceTestRunRecord {
  id: string;
  sequence_id: string;
  campaign_id: string | null;
  name: string;
  sequence_name: string;
  campaign_name: string | null;
  status: SequenceTestRunStatus;
  mode: SequenceTestRunMode;
  recipient_count: number;
  total_messages: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
  recipients?: Array<{
    name: string;
    email: string;
    total_messages: number;
    sent_count: number;
    failed_count: number;
  }>;
  messages?: SequenceTestMessageRecord[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// GET /clients/:slug/followup-sequences already exists on the backend
// (pre-dates this upgrade) - reused as-is for listing, rather than adding a
// duplicate list endpoint.
export async function listSequences(): Promise<SequenceRecord[]> {
  const value = await apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences`);
  return asArray(asRecord(value).followup_sequences) as SequenceRecord[];
}

export async function getSequence(
  sequenceId: string,
): Promise<{ sequence: SequenceRecord; steps: SequenceStepRecord[] }> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}`,
  );
  const record = asRecord(value);
  return {
    sequence: record.followup_sequence as SequenceRecord,
    steps: asArray(record.steps) as SequenceStepRecord[],
  };
}

export async function createSequence(input: {
  name: string;
  campaign_id?: string;
  sending_mode?: SendingMode;
}): Promise<SequenceRecord> {
  const value = await apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return asRecord(value).followup_sequence as SequenceRecord;
}

export async function updateSequence(
  sequenceId: string,
  patch: Partial<
    Pick<
      SequenceRecord,
      | "name"
      | "status"
      | "sending_mode"
      | "daily_send_cap"
      | "timezone"
      | "business_days_only"
      | "stop_on_reply"
      | "stop_on_bounce"
      | "stop_on_disqualified"
      | "campaign_id"
    >
  >,
): Promise<SequenceRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return asRecord(value).followup_sequence as SequenceRecord;
}

export async function archiveSequence(sequenceId: string): Promise<SequenceRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/archive`,
    { method: "POST" },
  );
  return asRecord(value).followup_sequence as SequenceRecord;
}

export async function pauseSequence(sequenceId: string): Promise<SequenceRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/pause`,
    { method: "POST" },
  );
  return asRecord(value).followup_sequence as SequenceRecord;
}

export async function resumeSequence(sequenceId: string): Promise<SequenceRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/resume`,
    { method: "POST" },
  );
  return asRecord(value).followup_sequence as SequenceRecord;
}

export async function startLiveSequence(sequenceId: string): Promise<SequenceRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/go-live`,
    { method: "POST" },
  );
  return asRecord(value).followup_sequence as SequenceRecord;
}

export async function createSequenceStep(
  sequenceId: string,
  input: {
    step_number: number;
    send_weekday: number;
    send_week_of_month: number;
    send_month?: number | null;
    subject_template?: string | null;
    body_template: string;
    signature?: string | null;
    image_asset_id?: string | null;
    ai_personalization_enabled?: boolean;
  },
): Promise<SequenceStepRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/steps`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return asRecord(value).step as SequenceStepRecord;
}

export async function updateSequenceStep(
  sequenceId: string,
  stepId: string,
  patch: Partial<
    Pick<
      SequenceStepRecord,
      | "send_weekday"
      | "send_week_of_month"
      | "send_month"
      | "subject_template"
      | "body_template"
      | "signature"
      | "image_asset_id"
      | "ai_personalization_enabled"
      | "status"
    >
  >,
): Promise<SequenceStepRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/steps/${encodeURIComponent(stepId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return asRecord(value).step as SequenceStepRecord;
}

export async function deleteSequenceStep(sequenceId: string, stepId: string): Promise<void> {
  await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/steps/${encodeURIComponent(stepId)}`,
    { method: "DELETE" },
  );
}

export async function enrollLeadsInSequence(
  sequenceId: string,
  leadIds: string[],
  source?: EnrollmentSource,
): Promise<EnrollmentRecord[]> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/enroll`,
    {
      method: "POST",
      body: JSON.stringify({ lead_ids: leadIds, source }),
    },
  );
  return asArray(asRecord(value).enrollments) as EnrollmentRecord[];
}

export async function listEnrollments(
  sequenceId: string,
  status?: EnrollmentStatus,
): Promise<EnrollmentRecord[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/enrollments${query}`,
  );
  return asArray(asRecord(value).enrollments) as EnrollmentRecord[];
}

export async function disqualifyEnrollment(
  sequenceId: string,
  enrollmentId: string,
  reason?: string,
): Promise<EnrollmentRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/enrollments/${encodeURIComponent(enrollmentId)}/disqualify`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
  return asRecord(value).enrollment as EnrollmentRecord;
}

export async function getSequenceMetrics(sequenceId: string): Promise<SequenceMetrics> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/metrics`,
  );
  return asRecord(value).metrics as SequenceMetrics;
}

export interface EngineDryRunResult {
  sequence_id: string;
  dry_run: true;
  due_count: number;
  would_process: Array<{ enrollment_id: string; lead_id: string | null; current_step: number }>;
}

export async function dryRunSequenceEngine(sequenceId: string): Promise<EngineDryRunResult> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/sequence-runner/dry-run`,
    {
      method: "POST",
      body: JSON.stringify({ sequence_id: sequenceId }),
    },
  );
  return value as EngineDryRunResult;
}

// Admin-only on the backend (intergrai_admin role) - the button that calls
// this is hidden/disabled for non-admins, but the backend enforces it
// regardless. Still never a live send - every queued row is dry_run: true.
export async function runSequenceOnce(sequenceId: string, maxSends?: number): Promise<unknown> {
  return apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/sequence-runner/run-once`, {
    method: "POST",
    body: JSON.stringify({ sequence_id: sequenceId, max_sends: maxSends }),
  });
}

export async function listSequenceTestRuns(): Promise<SequenceTestRunRecord[]> {
  const value = await apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/sequence-test-runs`);
  return asArray(asRecord(value).test_runs) as SequenceTestRunRecord[];
}

export async function getSequenceTestRun(runId: string): Promise<SequenceTestRunRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/sequence-test-runs/${encodeURIComponent(runId)}`,
  );
  return asRecord(value).test_run as SequenceTestRunRecord;
}

export async function deleteSequenceTestRun(runId: string): Promise<void> {
  await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/sequence-test-runs/${encodeURIComponent(runId)}`,
    { method: "DELETE" },
  );
}

export async function createSequenceTestRun(
  sequenceId: string,
  recipients: Array<{ name: string; company: string; email: string }>,
): Promise<SequenceTestRunRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/followup-sequences/${encodeURIComponent(sequenceId)}/test-runs`,
    { method: "POST", body: JSON.stringify({ recipients }) },
  );
  return asRecord(value).test_run as SequenceTestRunRecord;
}

export async function sendSequenceTestRun(
  runId: string,
  input: { mode: "single_step"; step_number: number } | { mode: "full_sequence" },
): Promise<SequenceTestRunRecord> {
  const value = await apiRequest<unknown>(
    `/clients/${INTERGRAI_CLIENT_SLUG}/sequence-test-runs/${encodeURIComponent(runId)}/send`,
    {
      method: "POST",
      body: JSON.stringify({ ...input, confirm_test_send: true }),
    },
  );
  return asRecord(value).test_run as SequenceTestRunRecord;
}
