"use client";

import { useQuery } from "@tanstack/react-query";

import { buildsApi } from "@/lib/api/routes";
import { queryKeys } from "@/lib/api/queries";

export function useBuilds(projectId: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.builds.list(projectId),
    queryFn: () => buildsApi.list(projectId, page),
    enabled: !!projectId,
  });
}
