"use client";

import { cn } from "@/lib/utils";
import type { Platform } from "../types";

interface DeviceFrameProps {
  platform: Platform;
  children: React.ReactNode;
  className?: string;
}

const DEVICE_CONFIGS = {
  ios: {
    width: 375,
    height: 812,
    borderRadius: 44,
    notchWidth: 150,
    notchHeight: 30,
    homeIndicatorHeight: 5,
  },
  android: {
    width: 360,
    height: 780,
    borderRadius: 20,
    notchWidth: 0,
    notchHeight: 24,
    homeIndicatorHeight: 0,
  },
  web: {
    width: 1024,
    height: 768,
    borderRadius: 8,
    notchWidth: 0,
    notchHeight: 0,
    homeIndicatorHeight: 0,
  },
};

export function DeviceFrame({ platform, children, className }: DeviceFrameProps) {
  const config = DEVICE_CONFIGS[platform];
  const isPhone = platform === "ios" || platform === "android";

  if (platform === "web") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border bg-background shadow-lg",
          className
        )}
      >
        <div className="flex h-8 items-center gap-2 border-b border-border bg-muted/50 px-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 rounded bg-background/50 px-3 py-1 text-center text-xs text-muted-foreground">
            localhost:19006
          </div>
        </div>
        <div className="relative overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mx-auto bg-zinc-900 p-3 shadow-2xl",
        className
      )}
      style={{
        borderRadius: config.borderRadius + 8,
        maxWidth: config.width + 24,
      }}
    >
      <div className="absolute left-1/2 top-1 h-1 w-16 -translate-x-1/2 rounded-full bg-zinc-700" />

      {platform === "ios" && (
        <div
          className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-b-2xl bg-black"
          style={{
            width: config.notchWidth,
            height: config.notchHeight,
          }}
        >
          <div className="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-zinc-800" />
        </div>
      )}

      <div
        className="relative overflow-hidden bg-white"
        style={{
          borderRadius: config.borderRadius,
          aspectRatio: `${config.width} / ${config.height}`,
        }}
      >
        {platform === "android" && (
          <div
            className="absolute inset-x-0 top-0 z-10 bg-black/90"
            style={{ height: config.notchHeight }}
          >
            <div className="flex h-full items-center justify-end gap-1 px-2">
              <div className="h-2.5 w-2.5 rounded-sm bg-zinc-600" />
              <div className="h-2.5 w-4 rounded-sm bg-zinc-600" />
              <div className="h-2.5 w-2.5 rounded-sm bg-zinc-600" />
            </div>
          </div>
        )}

        <div className="h-full w-full">{children}</div>

        {platform === "ios" && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <div
              className="rounded-full bg-black/80"
              style={{
                width: 134,
                height: config.homeIndicatorHeight,
              }}
            />
          </div>
        )}
      </div>

      {isPhone && (
        <div className="mt-2 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>
      )}
    </div>
  );
}
