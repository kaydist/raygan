import { useQuery } from "@tanstack/react-query";

import { healthApi, HealthCheckResponse } from "../routes/health";
import { queryKeys } from "./query-keys";

export function useHealthCheck() {
  return useQuery<HealthCheckResponse>({
    queryKey: queryKeys.health.check(),
    queryFn: () => healthApi.check(),
    refetchInterval: 30000, // 30 seconds
  });
}
