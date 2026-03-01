"use client";

import { useState } from "react";
import { Hammer, Radio } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useUIStore, useProjectStore } from "@/stores";
import { queryKeys } from "@/lib/api/queries";
import { buildsApi } from "@/lib/api/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/atoms";
import { EmptyState } from "@/components/molecules";
import { useBuilds, useBuildStatus } from "../hooks";
import { BuildHistory } from "./build-history";

export function BuildHistoryModal() {
  const { modals, closeModal } = useUIStore();
  const currentProject = useProjectStore((state) => state.currentProject);
  const projectId = currentProject?.uuid ?? "";
  const queryClient = useQueryClient();
  const isOpen = modals.buildHistory.isOpen;
  const modalData = modals.buildHistory.data as { tab?: string } | undefined;
  const defaultTab = modalData?.tab === "ota" ? "ota" : "builds";

  const [cancellingBuildId, setCancellingBuildId] = useState<string | null>(null);

  const { data, isLoading } = useBuilds(projectId);
  useBuildStatus(projectId);

  const cancelMutation = useMutation({
    mutationFn: (buildUuid: string) => buildsApi.cancel(projectId, buildUuid),
    onSuccess: () => {
      setCancellingBuildId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.list(projectId) });
    },
    onError: () => {
      setCancellingBuildId(null);
    },
  });

  const handleCancel = (buildUuid: string) => {
    setCancellingBuildId(buildUuid);
    cancelMutation.mutate(buildUuid);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => closeModal("buildHistory")}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Hammer className="h-4 w-4" />
            Build History
          </DialogTitle>
          <DialogDescription className="text-xs">
            Track your build and OTA update history.
          </DialogDescription>
        </DialogHeader>

        <Tabs key={defaultTab} defaultValue={defaultTab} className="flex flex-col">
          <div className="border-b border-border px-5">
            <TabsList className="h-9 w-full justify-start gap-4 rounded-none border-none bg-transparent p-0">
              <TabsTrigger
                value="builds"
                className="relative h-9 rounded-none border-none bg-transparent px-0 pb-2 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
              >
                <Hammer className="mr-1.5 h-3.5 w-3.5" />
                Builds
              </TabsTrigger>
              <TabsTrigger
                value="ota"
                className="relative h-9 rounded-none border-none bg-transparent px-0 pb-2 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
              >
                <Radio className="mr-1.5 h-3.5 w-3.5" />
                OTA Updates
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="builds" className="mt-0 p-4">
            <BuildHistory
              builds={data?.builds ?? []}
              onCancel={handleCancel}
              cancellingBuildId={cancellingBuildId}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="ota" className="mt-0 p-4">
            <EmptyState
              icon={Radio}
              title="OTA Updates"
              description="Coming Soon"
              className="py-10"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
