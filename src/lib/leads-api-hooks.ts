import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLeadComment,
  getCampaigns,
  getDashboard,
  getLeadActivity,
  getLeads,
  getReports,
  updateLeadStatus,
  type LeadUserSummary,
  type LeadWorkflowStatus,
} from "@/lib/leads-api";
import { useApp } from "@/lib/app-state";

const isBrowser = typeof window !== "undefined";
const LEADS_QUERY_KEY = ["intergrai", "leads"] as const;

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

export function useLeadActivityQuery(leadId?: string) {
  const { isAuthenticated } = useApp();

  return useQuery({
    queryKey: ["intergrai", "lead-activity", leadId],
    queryFn: () => getLeadActivity(leadId || ""),
    enabled: isBrowser && isAuthenticated && Boolean(leadId),
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
