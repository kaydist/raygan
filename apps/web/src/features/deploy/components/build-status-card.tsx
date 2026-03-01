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
} from "lucide-react";
import type { BuildResponse, BuildStatus } from "@raygan/shared";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  Badge,
  Button,
} from "@/components/atoms";

interface BuildStatusCardProps {
  build: BuildResponse;
  onCancel?: (buildUuid: string) => void;
  isCancelling?: boolean;
}

const STATUS_CONFIG: Record<
  BuildStatus,
  { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  queued: { label: "Queued", icon: Clock, variant: "secondary" },
  provisioning: { label: "Provisioning", icon: Loader2, variant: "secondary" },
  building: { label: "Building", icon: Loader2, variant: "default" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
  failed: { label: "Failed", icon: AlertCircle, variant: "destructive" },
  cancelled: { label: "Cancelled", icon: Ban, variant: "outline" },
};

function isActive(status: BuildStatus): boolean {
  return status === "queued" || status === "provisioning" || status === "building";
}

export function BuildStatusCard({ build, onCancel, isCancelling }: BuildStatusCardProps) {
  const config = STATUS_CONFIG[build.status];
  const StatusIcon = config.icon;
  const active = isActive(build.status);

  return (
    <Card className="p-0">
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <StatusIcon
            className={cn(
              "h-4 w-4",
              active && "animate-spin",
              build.status === "completed" && "text-emerald-500",
              build.status === "failed" && "text-destructive",
            )}
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize">
                {build.platform} &middot; {build.profile}
              </span>
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(build.created_on).toLocaleString()}
            </span>
            {build.error_message && (
              <span className="text-xs text-destructive">{build.error_message}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {build.artifact_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2"
              asChild
            >
              <a href={build.artifact_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5" />
                APK
              </a>
            </Button>
          )}
          {build.logs_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              asChild
            >
              <a href={build.logs_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          {active && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive hover:text-destructive"
              onClick={() => onCancel(build.uuid)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
