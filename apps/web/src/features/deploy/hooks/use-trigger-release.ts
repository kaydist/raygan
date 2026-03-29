"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateStoreReleaseRequest } from "@raygan/shared";

import { storeReleasesApi } from "@/lib/api/routes";
import { queryKeys } from "@/lib/api/queries";

export function useTriggerRelease(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStoreReleaseRequest) =>
      storeReleasesApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storeReleases.list(projectId) });
    },
  });
}
