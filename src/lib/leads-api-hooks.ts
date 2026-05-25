import { useQuery } from "@tanstack/react-query";
import { getCampaigns, getDashboard, getLeads, getReports } from "@/lib/leads-api";
import { useApp } from "@/lib/app-state";

const isBrowser = typeof window !== "undefined";

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
    queryKey: ["intergrai", "leads"],
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
