import { useEffect, useState, useCallback } from "react";
import { generateCampaigns, type Campaign, type CampaignStatus } from "./demo-data";

const STORAGE_KEY = "apollo-campaigns-v1";

export type CampaignReviewStatus = "pending_review" | "approved" | "rejected";

export interface CustomCampaign extends Campaign {
  clientId: string;
  requestedBy: string; // "client" | "admin"
  requestedByEmail?: string;
  reviewStatus: CampaignReviewStatus;
  notes?: string;
  goal?: string;
}

interface State {
  custom: CustomCampaign[];
}

const EMPTY: State = { custom: [] };

function load(): State {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as State) };
  } catch {
    return EMPTY;
  }
}

function save(s: State) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const listeners = new Set<() => void>();
let current: State = EMPTY;
let initialized = false;

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    current = load();
    initialized = true;
  }
}

function emit(next: State) {
  current = next;
  save(next);
  listeners.forEach((fn) => fn());
}

export interface NewCampaignInput {
  clientId: string;
  name: string;
  targetIndustry: string;
  targetLocation: string;
  goal?: string;
  notes?: string;
  requestedBy: "client" | "admin";
  requestedByEmail?: string;
  // when admin creates directly, allow approving immediately
  autoApprove?: boolean;
}

export function useCampaigns(clientId: string) {
  ensureInit();
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const seed = generateCampaigns(clientId).map<CustomCampaign>((c) => ({
    ...c,
    clientId,
    requestedBy: "admin",
    reviewStatus: "approved",
  }));
  const customForClient = current.custom.filter((c) => c.clientId === clientId);
  const all = [...customForClient, ...seed];

  const addCampaign = useCallback((input: NewCampaignInput) => {
    const id = `camp-custom-${Date.now()}`;
    const approved = input.autoApprove ?? input.requestedBy === "admin";
    const tpl: CustomCampaign = {
      id,
      clientId: input.clientId,
      name: input.name,
      status: approved ? "active" : "draft",
      targetIndustry: input.targetIndustry,
      targetLocation: input.targetLocation,
      emailsSent: 0,
      openRate: 0,
      replyRate: 0,
      meetingsBooked: 0,
      leadsCount: 0,
      createdAt: new Date().toISOString(),
      requestedBy: input.requestedBy,
      requestedByEmail: input.requestedByEmail,
      reviewStatus: approved ? "approved" : "pending_review",
      notes: input.notes,
      goal: input.goal,
    };
    emit({ ...current, custom: [tpl, ...current.custom] });
    return tpl;
  }, []);

  const setReview = useCallback((id: string, reviewStatus: CampaignReviewStatus) => {
    emit({
      ...current,
      custom: current.custom.map((c) =>
        c.id === id
          ? {
              ...c,
              reviewStatus,
              status: reviewStatus === "approved" ? "active" : reviewStatus === "rejected" ? "paused" : c.status,
            }
          : c,
      ),
    });
  }, []);

  const setStatus = useCallback((id: string, status: CampaignStatus) => {
    emit({
      ...current,
      custom: current.custom.map((c) => (c.id === id ? { ...c, status } : c)),
    });
  }, []);

  const removeCampaign = useCallback((id: string) => {
    emit({ ...current, custom: current.custom.filter((c) => c.id !== id) });
  }, []);

  return { campaigns: all, addCampaign, setReview, setStatus, removeCampaign };
}
