"use client";

import * as React from "react";
import { Smartphone, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BuildProfile } from "@raygan/shared";

import { useUIStore, useProjectStore } from "@/stores";
import { buildsApi } from "@/lib/api/routes";
import { queryKeys } from "@/lib/api/queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  Label,
} from "@/components/atoms";
import { useBuilds, useBuildStatus } from "../hooks";
import { BuildHistory } from "./build-history";

export function BuildModal() {
  const { modals, closeModal } = useUIStore();
  const currentProject = useProjectStore((state) => state.currentProject);
  const projectId = currentProject?.uuid ?? "";

  const [profile, setProfile] = React.useState<BuildProfile>("preview");
  const [cancellingBuildId, setCancellingBuildId] = React.useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: buildsData, isLoading: isLoadingBuilds } = useBuilds(projectId);

  useBuildStatus(projectId);

  const triggerMutation = useMutation({
    mutationFn: () =>
      buildsApi.trigger(projectId, {
        platform: "android",
        profile,
        distribution: profile === "production" ? "store" : "internal",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.builds.list(projectId) });
    },
  });

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

  const isOpen = modals.deployProject.isOpen;
  const builds = buildsData?.builds ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={() => closeModal("deployProject")}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Build Android APK
          </DialogTitle>
          <DialogDescription>
            Build your app into an installable Android APK using Expo Application Services.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Build Profile</Label>
            <Select
              value={profile}
              onValueChange={(v) => setProfile(v as BuildProfile)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="preview">Preview</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {profile === "development" && "Debug build with dev tools enabled."}
              {profile === "preview" && "Internal testing APK, no signing required."}
              {profile === "production" && "Production-ready APK for store distribution."}
            </p>
          </div>

          <Button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending || !projectId}
            className="w-full"
          >
            {triggerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Build...
              </>
            ) : (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Start Build
              </>
            )}
          </Button>

          {triggerMutation.isError && (
            <p className="text-sm text-destructive">
              {(triggerMutation.error as Error)?.message || "Failed to start build"}
            </p>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Build History</h4>
            <BuildHistory
              builds={builds}
              onCancel={handleCancel}
              cancellingBuildId={cancellingBuildId}
              isLoading={isLoadingBuilds}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
