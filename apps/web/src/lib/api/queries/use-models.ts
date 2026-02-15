import { useQuery } from "@tanstack/react-query";
import type { AiModelConfig } from "@staq/shared";

import { modelsApi } from "../routes/models";
import { queryKeys } from "./query-keys";

export function useModels() {
  return useQuery<AiModelConfig[]>({
    queryKey: queryKeys.models.list(),
    queryFn: () => modelsApi.list(),
  });
}

export function useModel(id: number) {
  return useQuery<AiModelConfig>({
    queryKey: queryKeys.models.detail(id),
    queryFn: () => modelsApi.get(id),
    enabled: !!id,
  });
}
