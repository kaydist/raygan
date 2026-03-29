"use client";

import * as React from "react";
import { Store, ChevronLeft, ChevronRight } from "lucide-react";
import type { BuildResponse, ReleaseTrack, StoreType } from "@raygan/shared";

import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from "@/components/atoms";
import { cn } from "@/lib/utils";
import { useStoreCredential, useStoreListing, useTriggerRelease, useStoreReleases } from "../../hooks";
import { StepSelectBuild } from "./step-select-build";
import { StepStoreCredentials } from "./step-store-credentials";
import { StepStoreListing, type StoreListingHandle } from "./step-store-listing";
import { StepSelectTrack } from "./step-select-track";
import { StepReleaseReview } from "./step-release-review";

type ReleaseStep = 1 | 2 | 3 | 4 | 5;

interface ReleaseWizardProps {
  projectId: string;
  projectName: string;
  builds: BuildResponse[];
  preSelectedBuildUuid?: string;
  onBack: () => void;
  onComplete: () => void;
}

export function ReleaseWizard({
  projectId,
  projectName,
  builds,
  preSelectedBuildUuid,
  onBack,
  onComplete,
}: ReleaseWizardProps) {
  const store: StoreType = "google_play";

  const [step, setStep] = React.useState<ReleaseStep>(preSelectedBuildUuid ? 2 : 1);
  const [selectedBuildUuid, setSelectedBuildUuid] = React.useState<string | null>(
    preSelectedBuildUuid || null,
  );
  const [track, setTrack] = React.useState<ReleaseTrack>("internal");
  const [listingSaved, setListingSaved] = React.useState(false);

  const listingRef = React.useRef<StoreListingHandle>(null);

  const { data: credential, isError: noCredential } = useStoreCredential(projectId, store);
  const { data: existingListing } = useStoreListing(projectId, store);
  const { data: releasesData } = useStoreReleases(projectId);
  const triggerRelease = useTriggerRelease(projectId);

  const hasCredential = !noCredential && credential?.is_encrypted;
  const hasListing = !!existingListing || listingSaved;
  const isFirstRelease = !releasesData || releasesData.releases.length === 0;

  const selectedBuild = builds.find((b) => b.uuid === selectedBuildUuid) || null;

  const canContinue = (): boolean => {
    switch (step) {
      case 1: return !!selectedBuildUuid;
      case 2: return !!hasCredential;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 3 && listingRef.current) {
      listingRef.current.save();
    }
    if (step < 5) {
      setStep((s) => (s + 1) as ReleaseStep);
    }
  };

  const handleBack = () => {
    if (step === 1 || (step === 2 && preSelectedBuildUuid)) {
      onBack();
    } else {
      setStep((s) => (s - 1) as ReleaseStep);
    }
  };

  const handleSubmit = () => {
    if (!selectedBuildUuid) return;

    triggerRelease.mutate(
      {
        build_uuid: selectedBuildUuid,
        store,
        track,
      },
      { onSuccess: onComplete },
    );
  };

  const stepTitles: Record<ReleaseStep, string> = {
    1: "Select Build",
    2: "Store Credentials",
    3: "Store Listing",
    4: "Release Track",
    5: "Review & Submit",
  };

  return (
    <>
      <DialogHeader className="px-5 pt-5 pb-0">
        <DialogTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4" />
          Release to Google Play
        </DialogTitle>
        <DialogDescription className="text-xs">
          Step {step} of 5: {stepTitles[step]}
        </DialogDescription>
      </DialogHeader>

      <div className="px-5 pt-3 pb-1">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-foreground" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto px-5 py-4">
        {step === 1 && (
          <StepSelectBuild
            builds={builds}
            selectedBuildUuid={selectedBuildUuid}
            onSelect={setSelectedBuildUuid}
          />
        )}
        {step === 2 && (
          <StepStoreCredentials projectId={projectId} store={store} />
        )}
        {step === 3 && (
          <StepStoreListing
            ref={listingRef}
            projectId={projectId}
            store={store}
            projectName={projectName}
            onSaved={() => setListingSaved(true)}
          />
        )}
        {step === 4 && (
          <StepSelectTrack
            track={track}
            onTrackChange={setTrack}
            isFirstRelease={isFirstRelease}
          />
        )}
        {step === 5 && (
          <StepReleaseReview
            build={selectedBuild}
            store={store}
            track={track}
            onSubmit={handleSubmit}
            isPending={triggerRelease.isPending}
            error={
              triggerRelease.isError
                ? (triggerRelease.error as Error)?.message || "Failed to submit"
                : null
            }
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/50 px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground"
          onClick={handleBack}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>

        {step < 5 && (
          <Button
            size="sm"
            className="gap-1"
            onClick={handleNext}
            disabled={!canContinue()}
          >
            Continue
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </>
  );
}
