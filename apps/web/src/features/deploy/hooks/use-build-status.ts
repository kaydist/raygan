"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUIStore } from "@/stores";
import { socketClient } from "@/lib/api/socket-client";
import { queryKeys } from "@/lib/api/queries";

export function useBuildStatus(projectId: string): void {
  const queryClient = useQueryClient();
  const openModal = useUIStore((s) => s.openModal);

  useEffect(() => {
    if (!projectId) return;

    const cleanup = socketClient.onBuildStatus((event) => {
      if (event.project_id !== projectId) return;

      queryClient.invalidateQueries({
        queryKey: queryKeys.builds.list(projectId),
      });

      if (event.status === "completed") {
        toast.success("Build completed successfully", {
          description: "Your production build is ready.",
          duration: 10_000,
          action: {
            label: "Publish",
            onClick: () =>
              openModal("deployProject", {
                view: "release",
                buildUuid: event.build_uuid,
              }),
          },
          cancel: {
            label: "Share",
            onClick: () => openModal("deployProject"),
          },
        });
      }

      if (event.status === "failed") {
        toast.error("Build failed", {
          description: event.error_message || "Something went wrong during the build.",
          duration: 10_000,
          action: {
            label: "View Details",
            onClick: () => openModal("deployProject"),
          },
        });
      }
    });

    return cleanup;
  }, [projectId, queryClient, openModal]);
}
