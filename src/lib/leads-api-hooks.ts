import { useQuery } from "@tanstack/react-query";
import { getCampaigns, getDashboard, getLeads, getReports, getRequestDetail, getRequests } from "@/lib/leads-api";

const isBrowser = typeof window !== "undefined";

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["intergrai", "dashboard"],
    queryFn: getDashboard,
    enabled: isBrowser,
    retry: 1,
  });
}

export function useLeadsQuery() {
  return useQuery({
    queryKey: ["intergrai", "leads"],
    queryFn: getLeads,
    enabled: isBrowser,
    retry: 1,
  });
}

export function useCampaignsQuery() {
  return useQuery({
    queryKey: ["intergrai", "campaigns"],
    queryFn: getCampaigns,
    enabled: isBrowser,
    retry: 1,
  });
}

export function useReportsQuery() {
  return useQuery({
    queryKey: ["intergrai", "reports"],
    queryFn: getReports,
    enabled: isBrowser,
    retry: 1,
  });
}

export function useRequestsQuery() {
  return useQuery({
    queryKey: ["intergrai", "requests"],
    queryFn: getRequests,
    enabled: isBrowser,
    retry: 1,
  });
}

export function useRequestDetailQuery(requestId: string | null) {
  return useQuery({
    queryKey: ["intergrai", "requests", requestId],
    queryFn: () => getRequestDetail(requestId!),
    enabled: isBrowser && Boolean(requestId),
    retry: 1,
  });
}
