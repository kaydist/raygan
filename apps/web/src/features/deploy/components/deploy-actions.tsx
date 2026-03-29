import type { BuildResponse } from "@raygan/shared";

import { Separator } from "@/components/atoms";
import { BuildHistory } from "./build-history";

interface DeployActionsProps {
  onBuildClick: () => void;
  onReleaseClick: (buildUuid?: string) => void;
  onExport: () => void;
  isExporting: boolean;
  builds: BuildResponse[];
  isLoadingBuilds: boolean;
  onCancelBuild: (buildUuid: string) => void;
  cancellingBuildId: string | null;
  hasCompletedProductionBuild: boolean;
}

export function DeployActions({
  onBuildClick,
  onReleaseClick,
  onExport,
  isExporting,
  builds,
  isLoadingBuilds,
  onCancelBuild,
  cancellingBuildId,
  hasCompletedProductionBuild,
}: DeployActionsProps) {
  return (
    <>
      <div className="px-6 pt-6 pb-5">
        <h3 className="text-[15px] font-semibold">Share with your audience</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Anyone with this link can instantly try your app
        </p>
      </div>

      <div className="flex flex-col px-6 pb-6">
        <button
          type="button"
          onClick={onBuildClick}
          className="flex items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-accent/40"
        >
          <span className="flex-1 text-[13px] font-medium text-foreground">
            Build APK/IPA
          </span>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
            EAS BUILD
          </span>
        </button>

        <Separator />

        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-accent/40 disabled:opacity-60"
        >
          <span className="flex-1 text-[13px] font-medium text-foreground">
            {isExporting ? "Exporting..." : "Export Project"}
          </span>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
            ZIP ARCHIVE
          </span>
        </button>

        <Separator />

        <button
          type="button"
          onClick={() => onReleaseClick()}
          disabled={!hasCompletedProductionBuild}
          className="flex items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-accent/40 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <span className="flex-1 text-[13px] font-medium text-foreground">
            Release to Store
          </span>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
            {hasCompletedProductionBuild ? "GOOGLE PLAY" : "BUILD FIRST"}
          </span>
        </button>

        <Separator />

        <button
          type="button"
          disabled
          className="flex items-center gap-3 rounded-lg px-1 py-3 text-left opacity-40"
        >
          <span className="flex-1 text-[13px] font-medium text-foreground">
            Push OTA Update
          </span>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
            COMING SOON
          </span>
        </button>
      </div>

      {builds.length > 0 && (
        <>
          <div className="relative px-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-[11px] font-medium text-muted-foreground">
              Recent Builds
            </span>
          </div>
          <div className="px-6 py-4">
            <BuildHistory
              builds={builds.slice(0, 3)}
              onCancel={onCancelBuild}
              onRelease={(buildUuid: string) => onReleaseClick(buildUuid)}
              cancellingBuildId={cancellingBuildId}
              isLoading={isLoadingBuilds}
            />
          </div>
        </>
      )}
    </>
  );
}
