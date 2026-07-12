import { apiRequest, INTERGRAI_CLIENT_SLUG } from "@/lib/leads-api";

export interface AiHealthSummary {
  client_slug: string;
  checked_at: string;
  ollama: {
    configured: boolean;
    base_url_present: boolean;
    model: string | null;
    is_bulk_provider: boolean;
  };
  minimax: { configured: boolean; model: string | null };
  ai_decisions_enabled: boolean;
  ai_blocker: string | null;
  budget: {
    daily_call_cap: number | null;
    cycle_call_cap: number | null;
    cycle_priority_reserved_calls: number | null;
    decisions_today: number;
    task_caps: Record<string, { cap: number | null; used_today: number }>;
  };
  last_successful_decision: {
    at: string;
    task: string;
    provider: string;
    model: string;
    decision: string;
  } | null;
  last_failed_decision: {
    at: string;
    task: string;
    deterministic_fallback: boolean;
    blocked_reason: string | null;
  } | null;
  // Hybrid Mac Mini/VPS worker visibility - null until the worker-queue
  // migration/service is deployed on the backend (older backend responses
  // simply won't include this field).
  worker_status: {
    checked_at: string;
    mac_mini: {
      worker_id: string | null;
      online: boolean;
      last_heartbeat_at: string | null;
      active_job_count: number;
    };
    vps_fallback: {
      worker_id: string | null;
      online: boolean;
      last_heartbeat_at: string | null;
      active_job_count: number;
    };
    queue_depth: Array<{ job_type: string; status: string; count: number }>;
    completed_today: number;
    failed_today: number;
    avg_job_duration_seconds: Array<{ job_type: string; avg_seconds: string | number }>;
    last_error: { job_type: string; error: string; completed_at: string } | null;
  } | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function getAiHealth(): Promise<AiHealthSummary> {
  const value = await apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/ai-health`);
  return asRecord(value).health as AiHealthSummary;
}
