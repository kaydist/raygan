"use client";

import { useQuery } from "@tanstack/react-query";

import { storeReleasesApi } from "@/lib/api/routes";
import { queryKeys } from "@/lib/api/queries";

export function useStoreReleases(projectId: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.storeReleases.list(projectId),
    queryFn: () => storeReleasesApi.list(projectId, page),
    enabled: !!projectId,
  });
}

export function useStoreRelease(projectId: string, releaseId: string) {
  return useQuery({
    queryKey: queryKeys.storeReleases.detail(projectId, releaseId),
    queryFn: () => storeReleasesApi.get(projectId, releaseId),
    enabled: !!projectId && !!releaseId,
  });
}
