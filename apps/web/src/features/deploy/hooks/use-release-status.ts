"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { socketClient } from "@/lib/api/socket-client";
import { queryKeys } from "@/lib/api/queries";

export function useReleaseStatus(projectId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const cleanup = socketClient.onReleaseStatus((event) => {
      if (event.project_id === projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.storeReleases.list(projectId) });
      }
    });

    return cleanup;
  }, [projectId, queryClient]);
}
