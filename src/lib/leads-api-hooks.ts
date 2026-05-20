import { useQuery } from "@tanstack/react-query";
import { getCampaigns, getDashboard, getLeads } from "@/lib/leads-api";

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
