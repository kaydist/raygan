import { Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  className?: string;
  orientation?: "vertical" | "horizontal";
}

export function ResizeHandle({
  className,
  orientation = "vertical",
}: ResizeHandleProps) {
  const isVertical = orientation === "vertical";

  return (
    <Separator
      className={cn(
        "group relative flex items-center justify-center bg-border transition-colors hover:bg-primary/20 data-[resize-handle-active]:bg-primary/40",
        isVertical ? "w-1" : "h-1",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary/50 group-data-[resize-handle-active]:bg-primary",
          isVertical ? "h-8 w-0.5" : "h-0.5 w-8"
        )}
      />
    </Separator>
  );
}
