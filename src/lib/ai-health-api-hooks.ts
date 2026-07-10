import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { getAiHealth } from "@/lib/ai-health-api";

const isBrowser = typeof window !== "undefined";

export function useAiHealthQuery() {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ["intergrai", "ai-health"],
    queryFn: getAiHealth,
    enabled: isBrowser && isAuthenticated,
    retry: 1,
    refetchInterval: 60_000,
  });
}
