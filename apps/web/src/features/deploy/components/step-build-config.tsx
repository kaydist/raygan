import { Check, Bug, Eye, Rocket } from "lucide-react";
import type { BuildProfile } from "@raygan/shared";

import { cn } from "@/lib/utils";
import { Label } from "@/components/atoms";

const PROFILE_OPTIONS: {
  value: BuildProfile;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "development",
    label: "Development",
    description: "Debug build with dev tools enabled",
    icon: Bug,
  },
  {
    value: "preview",
    label: "Preview",
    description: "Internal testing APK for sharing with testers",
    icon: Eye,
  },
  {
    value: "production",
    label: "Production",
    description: "Production-ready APK for Play Store",
    icon: Rocket,
  },
];

interface StepBuildConfigProps {
  profile: BuildProfile;
  onProfileChange: (p: BuildProfile) => void;
}

export function StepBuildConfig({
  profile,
  onProfileChange,
}: StepBuildConfigProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">Build Profile</Label>
      <div className="flex flex-col gap-1.5">
        {PROFILE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = profile === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onProfileChange(opt.value)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                selected
                  ? "border-foreground/20 bg-foreground/[0.03] ring-1 ring-foreground/10"
                  : "border-border/50 hover:border-border hover:bg-accent/30",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  selected
                    ? "border-foreground/10 bg-foreground/5 text-foreground"
                    : "border-border bg-muted/50 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className={cn(
                    "text-[13px] font-medium",
                    selected ? "text-foreground" : "text-foreground/80",
                  )}
                >
                  {opt.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {opt.description}
                </span>
              </div>
              <div className="ml-auto shrink-0">
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                    selected
                      ? "border-foreground bg-foreground"
                      : "border-muted-foreground/30",
                  )}
                >
                  {selected && (
                    <Check className="h-2.5 w-2.5 text-background" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
