"use client";

import { Package } from "lucide-react";
import type { BuildResponse } from "@raygan/shared";

import { BuildStatusCard } from "./build-status-card";

interface BuildHistoryProps {
  builds: BuildResponse[];
  onCancel?: (buildUuid: string) => void;
  cancellingBuildId?: string | null;
  isLoading?: boolean;
}

export function BuildHistory({
  builds,
  onCancel,
  cancellingBuildId,
  isLoading,
}: BuildHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading builds...
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <Package className="h-8 w-8" />
        <p className="text-sm">No builds yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {builds.map((build) => (
        <BuildStatusCard
          key={build.uuid}
          build={build}
          onCancel={onCancel}
          isCancelling={cancellingBuildId === build.uuid}
        />
      ))}
    </div>
  );
}
