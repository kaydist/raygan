"use client";

import {
  Clock,
  Upload,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Globe,
  AlertCircle,
} from "lucide-react";
import type { ReleaseStatus } from "@raygan/shared";

import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  ReleaseStatus,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    dotColor: string;
    bgColor: string;
  }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-amber-400",
    dotColor: "bg-amber-400",
    bgColor: "bg-amber-400/10",
  },
  submitting: {
    label: "Submitting",
    icon: Upload,
    color: "text-blue-400",
    dotColor: "bg-blue-400",
    bgColor: "bg-blue-400/10",
  },
  submitted: {
    label: "Submitted",
    icon: Send,
    color: "text-blue-400",
    dotColor: "bg-blue-400",
    bgColor: "bg-blue-400/10",
  },
  in_review: {
    label: "In Review",
    icon: Eye,
    color: "text-purple-400",
    dotColor: "bg-purple-400",
    bgColor: "bg-purple-400/10",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    color: "text-emerald-400",
    dotColor: "bg-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-red-400",
    dotColor: "bg-red-400",
    bgColor: "bg-red-400/10",
  },
  live: {
    label: "Live",
    icon: Globe,
    color: "text-emerald-400",
    dotColor: "bg-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    color: "text-red-400",
    dotColor: "bg-red-400",
    bgColor: "bg-red-400/10",
  },
};

interface ReleaseStatusBadgeProps {
  status: ReleaseStatus;
  className?: string;
}

export function ReleaseStatusBadge({ status, className }: ReleaseStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const isActive = status === "pending" || status === "submitting" || status === "submitted" || status === "in_review";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none",
        config.bgColor,
        config.color,
        className,
      )}
    >
      <span
        className={cn(
          "h-1 w-1 rounded-full",
          config.dotColor,
          isActive && "animate-pulse",
        )}
      />
      {config.label}
    </div>
  );
}
