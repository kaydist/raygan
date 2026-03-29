"use client";

import { CheckCircle2, Package } from "lucide-react";
import type { BuildResponse } from "@raygan/shared";

import { cn } from "@/lib/utils";
import { Label } from "@/components/atoms";

interface StepSelectBuildProps {
  builds: BuildResponse[];
  selectedBuildUuid: string | null;
  onSelect: (buildUuid: string) => void;
}

export function StepSelectBuild({ builds, selectedBuildUuid, onSelect }: StepSelectBuildProps) {
  const productionBuilds = builds.filter(
    (b) => b.status === "completed" && b.profile === "production" && b.artifact_url,
  );

  if (productionBuilds.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Package className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-[13px] text-muted-foreground">
          No completed production builds available.
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          Build your app with the &quot;Production&quot; profile first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">Select a production build</Label>
      <div className="flex max-h-[240px] flex-col gap-1.5 overflow-y-auto">
        {productionBuilds.map((build) => {
          const selected = selectedBuildUuid === build.uuid;
          return (
            <button
              key={build.uuid}
              type="button"
              onClick={() => onSelect(build.uuid)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                selected
                  ? "border-foreground/20 bg-foreground/[0.03] ring-1 ring-foreground/10"
                  : "border-border/50 hover:border-border hover:bg-accent/30",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                  selected
                    ? "border-emerald-400/20 bg-emerald-400/10"
                    : "border-border bg-muted/50",
                )}
              >
                <CheckCircle2
                  className={cn(
                    "h-4 w-4",
                    selected ? "text-emerald-400" : "text-muted-foreground",
                  )}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium">
                  Production Build
                </span>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {build.app_version && <span>v{build.app_version}</span>}
                  {build.app_version && <span>·</span>}
                  <span>{new Date(build.created_on).toLocaleDateString()}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
