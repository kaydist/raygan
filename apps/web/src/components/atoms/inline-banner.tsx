import type { LucideIcon } from "lucide-react";
import { AlertCircle, Info, CheckCircle2, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

const variants = {
  error: {
    container: "bg-red-500/15 border-red-500/30",
    text: "text-red-500",
    button: "bg-red-500 hover:bg-red-600",
    icon: AlertCircle,
  },
  warning: {
    container: "bg-amber-500/15 border-amber-500/30",
    text: "text-amber-500",
    button: "bg-amber-500 hover:bg-amber-600",
    icon: AlertTriangle,
  },
  info: {
    container: "bg-blue-500/15 border-blue-500/30",
    text: "text-blue-500",
    button: "bg-blue-500 hover:bg-blue-600",
    icon: Info,
  },
  success: {
    container: "bg-green-500/15 border-green-500/30",
    text: "text-green-500",
    button: "bg-green-500 hover:bg-green-600",
    icon: CheckCircle2,
  },
};

type BannerVariant = keyof typeof variants;

interface InlineBannerProps {
  variant?: BannerVariant;
  message: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function InlineBanner({
  variant = "info",
  message,
  icon,
  action,
  className,
}: InlineBannerProps) {
  const styles = variants[variant];
  const Icon = icon ?? styles.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
        styles.container,
        className,
      )}
    >
      <div className={cn("flex items-center gap-2", styles.text)}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[13px]">{message}</span>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "shrink-0 rounded-md px-3 py-1 text-[13px] font-medium text-white transition-colors",
            styles.button,
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
