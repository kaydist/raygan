"use client";

import { Check, TestTube, Users, Globe, FlaskConical } from "lucide-react";
import type { ReleaseTrack } from "@raygan/shared";

import { cn } from "@/lib/utils";
import { Label, InlineBanner } from "@/components/atoms";

const TRACK_OPTIONS: {
  value: ReleaseTrack;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "internal",
    label: "Internal Testing",
    description: "Up to 100 testers. Recommended for first releases.",
    icon: TestTube,
  },
  {
    value: "alpha",
    label: "Closed Testing (Alpha)",
    description: "Limited group of testers you define.",
    icon: FlaskConical,
  },
  {
    value: "beta",
    label: "Open Testing (Beta)",
    description: "Anyone can join and test your app.",
    icon: Users,
  },
  {
    value: "production",
    label: "Production",
    description: "Available to all users on Google Play.",
    icon: Globe,
  },
];

interface StepSelectTrackProps {
  track: ReleaseTrack;
  onTrackChange: (track: ReleaseTrack) => void;
  isFirstRelease?: boolean;
}

export function StepSelectTrack({ track, onTrackChange, isFirstRelease }: StepSelectTrackProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">Release Track</Label>

      {isFirstRelease && track === "production" && (
        <InlineBanner
          variant="warning"
          message="First-time releases to production may be rejected by Google Play. Start with internal testing."
        />
      )}

      <div className="flex flex-col gap-1.5">
        {TRACK_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = track === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTrackChange(opt.value)}
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
                  {selected && <Check className="h-2.5 w-2.5 text-background" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
