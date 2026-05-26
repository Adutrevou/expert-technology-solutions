import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLeadComment,
  createMission,
  createRequest,
  decideApproval,
  decideEnrichmentCreditApproval,
  getCampaigns,
  getDashboard,
  getLeadAgentSummary,
  getLeadActivity,
  getLeads,
  getOutreachRenderPreview,
  getRequestDetail,
  getRequests,
  getReports,
  startMailboxOAuth,
  updateLeadStatus,
  type LeadUserSummary,
  type LeadWorkflowStatus,
  type MailboxOAuthStartResponse,
  type MissionRecord,
  type RequestDetailRecord,
} from "@/lib/leads-api";
import { useApp } from "@/lib/app-state";

const isBrowser = typeof window !== "undefined";
const LEADS_QUERY_KEY = ["intergrai", "leads"] as const;
const REQUESTS_QUERY_KEY = ["intergrai", "requests"] as const;

export function useDashboardQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "dashboard"],
    queryFn: getDashboard,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useLeadsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: LEADS_QUERY_KEY,
    queryFn: getLeads,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useCampaignsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "campaigns"],
    queryFn: getCampaigns,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useReportsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "reports"],
    queryFn: getReports,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useRequestsQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: REQUESTS_QUERY_KEY,
    queryFn: getRequests,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useRequestDetailQuery(requestId?: string) {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "request-detail", requestId],
    queryFn: () => getRequestDetail(requestId || ""),
    enabled: isBrowser && isAuthenticated && Boolean(requestId),
    retry: 1,
  });
}

export function useLeadActivityQuery(leadId?: string) {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "lead-activity", leadId],
    queryFn: () => getLeadActivity(leadId || ""),
    enabled: isBrowser && isAuthenticated && Boolean(leadId),
    retry: 1,
  });
}

export function useLeadAgentSummaryQuery() {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "lead-agent"],
    queryFn: getLeadAgentSummary,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
  });
}

export function useOutreachRenderPreviewQuery(queueItemId?: string) {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "outreach-render-preview", queueItemId],
    queryFn: () => getOutreachRenderPreview(queueItemId || ""),
    enabled: isBrowser && isAuthenticated && Boolean(queueItemId),
    retry: 1,
  });
}

export function useUpdateLeadStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, status, user }: { leadId: string; status: LeadWorkflowStatus; user: LeadUserSummary }) =>
      updateLeadStatus(leadId, status, user),
    onSuccess: (_status, variables) => {
      void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-activity", variables.leadId] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useAddLeadCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, comment, user }: { leadId: string; comment: string; user: LeadUserSummary }) =>
      addLeadComment(leadId, comment, user),
    onSuccess: (_activity, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-activity", variables.leadId] });
      void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useCreateRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      category: string;
      title: string;
      message: string;
      created_by_name: string;
      created_by_email: string;
      created_by_role: string;
    }) => createRequest(input),
    onSuccess: (request: RequestDetailRecord) => {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_QUERY_KEY });
      if (request.id) {
        void queryClient.invalidateQueries({ queryKey: ["intergrai", "request-detail", request.id] });
      }
    },
  });
}

export function useCreateMissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      title: string;
      instruction: string;
      assigned_worker_type?: string;
      campaign_id?: string;
    }) => createMission(input),
    onSuccess: (mission: MissionRecord) => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
      if (mission.id) {
        void queryClient.invalidateQueries({ queryKey: ["intergrai", "mission", mission.id] });
      }
    },
  });
}

export function useStartMailboxOAuthMutation() {
  return useMutation<MailboxOAuthStartResponse, Error, { mailboxId: string }>({
    mutationFn: ({ mailboxId }) => startMailboxOAuth(mailboxId),
  });
}

export function useApprovalDecisionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { approvalId: string; decision: "approved" | "rejected"; decision_note?: string }) =>
      decideApproval(input.approvalId, {
        decision: input.decision,
        decision_note: input.decision_note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}

export function useEnrichmentCreditApprovalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { queueItemId: string; decision: "approved" | "rejected"; decision_note?: string }) =>
      decideEnrichmentCreditApproval(input.queueItemId, {
        decision: input.decision,
        decision_note: input.decision_note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "lead-agent"] });
      void queryClient.invalidateQueries({ queryKey: ["intergrai", "dashboard"] });
    },
  });
}
