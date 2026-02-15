"use client";

import { Smartphone, Monitor } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms";
import type { Platform } from "../types";

interface DeviceSelectorProps {
  value: Platform;
  onChange: (platform: Platform) => void;
  className?: string;
  disabled?: boolean;
}

const platforms: { value: Platform; label: string; icon: typeof Smartphone }[] = [
  { value: "ios", label: "iOS", icon: Smartphone },
  { value: "android", label: "Android", icon: Smartphone },
  { value: "web", label: "Web", icon: Monitor },
];

export function DeviceSelector({
  value,
  onChange,
  className,
  disabled = false,
}: DeviceSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1 rounded-lg bg-muted p-1", className)}>
      {platforms.map((platform) => {
        const Icon = platform.icon;
        const isSelected = value === platform.value;

        return (
          <Button
            key={platform.value}
            variant={isSelected ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(platform.value)}
            disabled={disabled}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs",
              isSelected && "shadow-sm"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {platform.label}
          </Button>
        );
      })}
    </div>
  );
}
