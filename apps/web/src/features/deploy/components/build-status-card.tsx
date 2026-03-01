"use client";

import {
  Download,
  ExternalLink,
  Loader2,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  Hammer,
  Server,
} from "lucide-react";
import type { BuildResponse, BuildStatus } from "@raygan/shared";

import { cn } from "@/lib/utils";
import {
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/atoms";

interface BuildStatusCardProps {
  build: BuildResponse;
  onCancel?: (buildUuid: string) => void;
  isCancelling?: boolean;
}

const STATUS_CONFIG: Record<
  BuildStatus,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    dotColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  queued: {
    label: "Queued",
    icon: Clock,
    color: "text-amber-400",
    dotColor: "bg-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/20",
  },
  provisioning: {
    label: "Provisioning",
    icon: Server,
    color: "text-blue-400",
    dotColor: "bg-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/20",
  },
  building: {
    label: "Building",
    icon: Hammer,
    color: "text-blue-400",
    dotColor: "bg-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-400",
    dotColor: "bg-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/20",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    color: "text-red-400",
    dotColor: "bg-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground/50",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
  },
};

function isActive(status: BuildStatus): boolean {
  return status === "queued" || status === "provisioning" || status === "building";
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

export function BuildStatusCard({ build, onCancel, isCancelling }: BuildStatusCardProps) {
  const config = STATUS_CONFIG[build.status];
  const StatusIcon = config.icon;
  const active = isActive(build.status);
  const duration =
    build.started_at && build.completed_at
      ? formatDuration(build.started_at, build.completed_at)
      : null;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-3 transition-all",
        active
          ? cn(config.borderColor, "bg-card")
          : "border-border/50 bg-card hover:border-border hover:bg-accent/30",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
          config.bgColor,
          config.borderColor,
        )}
      >
        <StatusIcon
          className={cn(
            "h-4 w-4",
            config.color,
            active && build.status !== "queued" && "animate-spin",
          )}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium capitalize text-foreground">
            {build.profile}
          </span>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none",
              config.bgColor,
              config.color,
            )}
          >
            <span
              className={cn(
                "h-1 w-1 rounded-full",
                config.dotColor,
                active && "animate-pulse",
              )}
            />
            {config.label}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span>{formatRelativeTime(build.created_on)}</span>
          {build.app_version && (
            <>
              <span>·</span>
              <span>v{build.app_version}</span>
            </>
          )}
          {duration && (
            <>
              <span>·</span>
              <span>{duration}</span>
            </>
          )}
        </div>

        {build.error_message && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-red-400">
            {build.error_message}
          </p>
        )}
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {build.artifact_url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <a href={build.artifact_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Download APK</TooltipContent>
            </Tooltip>
          )}
          {build.logs_url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <a href={build.logs_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">View Logs</TooltipContent>
            </Tooltip>
          )}
          {active && onCancel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-md p-0 text-red-400 hover:bg-red-400/10 hover:text-red-400"
                  onClick={() => onCancel(build.uuid)}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Cancel Build</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
