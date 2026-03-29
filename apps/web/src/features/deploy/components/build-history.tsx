"use client";

import { Package } from "lucide-react";
import type { BuildResponse } from "@raygan/shared";

import { ScrollArea, Skeleton } from "@/components/atoms";
import { EmptyState } from "@/components/molecules";
import { BuildStatusCard } from "./build-status-card";

interface BuildHistoryProps {
  builds: BuildResponse[];
  onCancel?: (buildUuid: string) => void;
  onRelease?: (buildUuid: string) => void;
  cancellingBuildId?: string | null;
  isLoading?: boolean;
}

function BuildHistorySkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BuildHistory({
  builds,
  onCancel,
  onRelease,
  cancellingBuildId,
  isLoading,
}: BuildHistoryProps) {
  if (isLoading) {
    return <BuildHistorySkeleton />;
  }

  if (builds.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No builds yet"
        description="Create your first build to get started."
        className="py-10"
      />
    );
  }

  return (
    <ScrollArea className="max-h-[min(380px,50vh)]">
      <div className="flex flex-col gap-1.5 pr-3">
        {builds.map((build) => (
          <BuildStatusCard
            key={build.uuid}
            build={build}
            onCancel={onCancel}
            onRelease={onRelease}
            isCancelling={cancellingBuildId === build.uuid}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
