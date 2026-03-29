"use client";

import { Loader2, Rocket } from "lucide-react";
import type { BuildResponse, ReleaseTrack, StoreType } from "@raygan/shared";

import { Button, Separator, InlineBanner, KeyValue } from "@/components/atoms";

interface StepReleaseReviewProps {
  build: BuildResponse | null;
  store: StoreType;
  track: ReleaseTrack;
  onSubmit: () => void;
  isPending: boolean;
  error: string | null;
}

const TRACK_LABELS: Record<ReleaseTrack, string> = {
  internal: "Internal Testing",
  alpha: "Closed Testing (Alpha)",
  beta: "Open Testing (Beta)",
  production: "Production",
};

const STORE_LABELS: Record<StoreType, string> = {
  google_play: "Google Play",
  apple_app_store: "Apple App Store",
};

export function StepReleaseReview({
  build,
  store,
  track,
  onSubmit,
  isPending,
  error,
}: StepReleaseReviewProps) {
  if (!build) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border/50 p-4">
        <KeyValue
          variant="stacked"
          columns={2}
          items={[
            {
              label: "Build",
              value: (
                <span>
                  Production {build.app_version ? `v${build.app_version}` : ""}
                </span>
              ),
            },
            {
              label: "Store",
              value: STORE_LABELS[store],
            },
            {
              label: "Track",
              value: TRACK_LABELS[track],
            },
            {
              label: "Platform",
              value: "Android",
            },
          ]}
        />
      </div>

      <Button onClick={onSubmit} disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting to Store...
          </>
        ) : (
          <>
            <Rocket className="mr-2 h-4 w-4" />
            Submit to {STORE_LABELS[store]}
          </>
        )}
      </Button>

      {error && <InlineBanner variant="error" message={error} />}
    </div>
  );
}
