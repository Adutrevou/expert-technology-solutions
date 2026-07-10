import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { getAiHealth } from "@/lib/ai-health-api";

const isBrowser = typeof window !== "undefined";

export function useAiHealthQuery() {
  // isInternalAdmin gate is intentional and load-bearing: this must never
  // fetch (or cache) provider/model/budget/cap internals for a client user,
  // even if a client user's browser somehow renders the AI Agent Status
  // component before the route-level redirect takes effect.
  const { isAuthenticated, isInternalAdmin } = useApp();
  return useQuery({
    queryKey: ["intergrai", "ai-health"],
    queryFn: getAiHealth,
    enabled: isBrowser && isAuthenticated && isInternalAdmin,
    retry: 1,
    refetchInterval: 60_000,
  });
}
