import * as React from "react";

import { cn } from "@/lib/utils";

interface PanelHeaderProps {
  title: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

export function PanelHeader({
  title,
  icon: Icon,
  actions,
  className,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-9 items-center justify-between border-b border-border bg-muted/30 px-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-xs font-medium">{title}</span>
      </div>
      {actions}
    </div>
  );
}
