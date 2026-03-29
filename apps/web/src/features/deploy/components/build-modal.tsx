"use client";

import * as React from "react";
import { Smartphone, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BuildProfile, ProjectAppConfig } from "@raygan/shared";

import { useUIStore, useProjectStore, type DeployModalData } from "@/stores";
import { buildsApi, exportsApi } from "@/lib/api/routes";
import { queryKeys, useUpdateProject } from "@/lib/api/queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from "@/components/atoms";
import { cn, downloadBlob } from "@/lib/utils";
import { useBuilds, useBuildStatus, useReleaseStatus } from "../hooks";
import type { WizardStep, ModalView, AppInfo } from "./build-modal.types";
import { DeployActions } from "./deploy-actions";
import { PlatformPicker } from "./platform-picker";
import { StepIndicator } from "./step-indicator";
import { StepAppInfo } from "./step-app-info";
import { StepBuildConfig } from "./step-build-config";
import { StepReview } from "./step-review";
import { ReleaseWizard } from "./release";

export function BuildModal() {
  const { modals, closeModal } = useUIStore();
  const currentProject = useProjectStore((state) => state.currentProject);
  const projectId = currentProject?.uuid ?? "";

  const [view, setView] = React.useState<ModalView>("history");
  const [step, setStep] = React.useState<WizardStep>(1);
  const [appInfo, setAppInfo] = React.useState<AppInfo>({
    name: "",
    version: "1.0.0",
    packageName: "",
    iconPreview: null,
  });
  const [profile, setProfile] = React.useState<BuildProfile>("preview");
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof AppInfo, string>>
  >({});
  const [cancellingBuildId, setCancellingBuildId] = React.useState<
    string | null
  >(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [releasePreSelectedBuild, setReleasePreSelectedBuild] = React.useState<
    string | undefined
  >(undefined);

  const queryClient = useQueryClient();
  const updateProjectMutation = useUpdateProject();
  const isOpen = modals.deployProject.isOpen;

  const resetWizard = React.useCallback(() => {
    if (!currentProject) return;
    const appConfig = currentProject.settings?.app_config;
    setAppInfo({
      name: currentProject.name ?? "",
      version: appConfig?.version ?? "1.0.0",
      packageName: appConfig?.package_name ?? "",
      iconPreview: appConfig?.icon_url ?? null,
    });
    setProfile("preview");
    setErrors({});
    setStep(1);
  }, [currentProject]);

  React.useEffect(() => {
    if (isOpen) {
      const modalData = modals.deployProject.data as DeployModalData | undefined;
      if (modalData?.view === "release" && modalData?.buildUuid) {
        setReleasePreSelectedBuild(modalData.buildUuid);
        setView("release");
      } else {
        setView("history");
      }
      resetWizard();
    }
  }, [isOpen, resetWizard, modals.deployProject.data]);

  const { data: buildsData, isLoading: isLoadingBuilds } =
    useBuilds(projectId);
  useBuildStatus(projectId);
  useReleaseStatus(projectId);

  const triggerMutation = useMutation({
    mutationFn: () =>
      buildsApi.trigger(projectId, {
        platform: "android",
        profile,
        distribution: profile === "production" ? "store" : "internal",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.builds.list(projectId),
      });
      setView("history");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (buildUuid: string) => buildsApi.cancel(projectId, buildUuid),
    onSuccess: () => {
      setCancellingBuildId(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.builds.list(projectId),
      });
    },
    onError: () => {
      setCancellingBuildId(null);
    },
  });

  const handleCancel = (buildUuid: string) => {
    setCancellingBuildId(buildUuid);
    cancelMutation.mutate(buildUuid);
  };

  const handleExport = async () => {
    if (!currentProject) return;
    setIsExporting(true);
    try {
      const blob = await exportsApi.downloadProjectZip(currentProject.uuid);
      downloadBlob(blob, `${currentProject.slug}.zip`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const updateAppInfo = (field: keyof AppInfo, value: string | null) => {
    setAppInfo((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof AppInfo, string>> = {};
    if (!appInfo.name.trim()) newErrors.name = "App name is required";
    if (!appInfo.version.trim()) newErrors.version = "Version is required";
    if (!appInfo.packageName.trim())
      newErrors.packageName = "Package name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueStep1 = () => {
    if (!validateStep1() || !currentProject) return;

    const appConfigPayload: Partial<ProjectAppConfig> = {
      version: appInfo.version,
      package_name: appInfo.packageName,
      icon_url: appInfo.iconPreview,
    };

    updateProjectMutation.mutate(
      {
        uuid: currentProject.uuid,
        data: {
          name: appInfo.name,
          settings: {
            app_config: appConfigPayload as ProjectAppConfig,
          },
        },
      },
      { onSuccess: () => setStep(2) },
    );
  };

  const handleWizardBack = () => {
    if (step === 1) {
      setView("platform");
    } else {
      setStep((s) => (s - 1) as WizardStep);
    }
  };

  const builds = buildsData?.builds ?? [];
  const hasCompletedProductionBuild = builds.some(
    (b) => b.status === "completed" && b.profile === "production" && b.artifact_url,
  );

  if (view === "release") {
    return (
      <Dialog open={isOpen} onOpenChange={() => closeModal("deployProject")}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <ReleaseWizard
            projectId={projectId}
            projectName={currentProject?.name ?? ""}
            builds={builds}
            preSelectedBuildUuid={releasePreSelectedBuild}
            onBack={() => {
              setReleasePreSelectedBuild(undefined);
              setView("history");
            }}
            onComplete={() => {
              setReleasePreSelectedBuild(undefined);
              setView("history");
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (view === "history") {
    return (
      <Dialog open={isOpen} onOpenChange={() => closeModal("deployProject")}>
        <DialogContent className="max-w-[440px] gap-0 overflow-hidden p-0">
          <DeployActions
            onBuildClick={() => setView("platform")}
            onReleaseClick={(buildUuid) => {
              setReleasePreSelectedBuild(buildUuid);
              setView("release");
            }}
            onExport={handleExport}
            isExporting={isExporting}
            builds={builds}
            isLoadingBuilds={isLoadingBuilds}
            onCancelBuild={handleCancel}
            cancellingBuildId={cancellingBuildId}
            hasCompletedProductionBuild={hasCompletedProductionBuild}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (view === "platform") {
    return (
      <Dialog open={isOpen} onOpenChange={() => closeModal("deployProject")}>
        <DialogContent className="max-w-[400px] gap-0 overflow-hidden p-0">
          <PlatformPicker
            onSelectAndroid={() => {
              resetWizard();
              setView("wizard");
            }}
            onBack={() => setView("history")}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => closeModal("deployProject")}>
      <DialogContent
        className={cn("gap-0 p-0", step === 1 ? "max-w-xl" : "max-w-md")}
      >
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            Build Android APK
          </DialogTitle>
          <DialogDescription className="text-xs">
            Build your app into an installable Android APK using EAS.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-4 pb-1">
          <StepIndicator currentStep={step} />
        </div>

        <div className="px-5 py-4">
          {step === 1 && (
            <StepAppInfo
              appInfo={appInfo}
              onUpdate={updateAppInfo}
              errors={errors}
            />
          )}
          {step === 2 && (
            <StepBuildConfig profile={profile} onProfileChange={setProfile} />
          )}
          {step === 3 && (
            <StepReview
              appInfo={appInfo}
              profile={profile}
              onTrigger={() => triggerMutation.mutate()}
              isPending={triggerMutation.isPending}
              error={
                triggerMutation.isError
                  ? (triggerMutation.error as Error)?.message ||
                    "Failed to start build"
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
            onClick={handleWizardBack}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Button>

          {step < 3 && (
            <Button
              size="sm"
              className="gap-1"
              onClick={step === 1 ? handleContinueStep1 : () => setStep(3)}
              disabled={step === 1 && updateProjectMutation.isPending}
            >
              {step === 1 && updateProjectMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
