import { Image as ImageIcon, Loader2, Cpu } from "lucide-react";
import type { BuildProfile } from "@raygan/shared";

import { Button, Separator, InlineBanner, KeyValue } from "@/components/atoms";
import type { AppInfo } from "./build-modal.types";

interface StepReviewProps {
  appInfo: AppInfo;
  profile: BuildProfile;
  onTrigger: () => void;
  isPending: boolean;
  error: string | null;
}

export function StepReview({
  appInfo,
  profile,
  onTrigger,
  isPending,
  error,
}: StepReviewProps) {
  const distribution = profile === "production" ? "store" : "internal";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border/50 p-4">
        <div className="flex items-center gap-3">
          {appInfo.iconPreview ? (
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border shadow-sm">
              <img
                src={appInfo.iconPreview}
                alt="App icon"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/50">
              <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[13px] font-medium">{appInfo.name}</span>
            <span className="text-[11px] text-muted-foreground">
              v{appInfo.version}
            </span>
          </div>
        </div>

        <Separator className="my-3" />

        <KeyValue
          variant="stacked"
          columns={2}
          items={[
            {
              label: "Package Name",
              value: <span className="font-mono">{appInfo.packageName}</span>,
            },
            {
              label: "Build Profile",
              value: <span className="capitalize">{profile}</span>,
            },
            {
              label: "Distribution",
              value: <span className="capitalize">{distribution}</span>,
            },
            { label: "Platform", value: "Android" },
          ]}
        />
      </div>

      <Button onClick={onTrigger} disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting Build...
          </>
        ) : (
          <>
            <Cpu className="mr-2 h-4 w-4" />
            Start Build
          </>
        )}
      </Button>

      {error && <InlineBanner variant="error" message={error} />}
    </div>
  );
}
