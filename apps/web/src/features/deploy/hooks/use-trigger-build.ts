"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TriggerBuildRequest } from "@raygan/shared";

import { buildsApi } from "@/lib/api/routes";
import { queryKeys } from "@/lib/api/queries";

export function useTriggerBuild(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TriggerBuildRequest) => buildsApi.trigger(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.list(projectId) });
    },
  });
}
