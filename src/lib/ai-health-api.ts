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
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function getAiHealth(): Promise<AiHealthSummary> {
  const value = await apiRequest<unknown>(`/clients/${INTERGRAI_CLIENT_SLUG}/ai-health`);
  return asRecord(value).health as AiHealthSummary;
}
