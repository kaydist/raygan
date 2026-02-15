import { useQuery } from "@tanstack/react-query";
import type { SettingsResponse } from "@staq/shared";

import { settingsApi } from "../routes/settings";
import { queryKeys } from "./query-keys";

export function useSettings() {
  return useQuery<SettingsResponse>({
    queryKey: queryKeys.settings.get(),
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
