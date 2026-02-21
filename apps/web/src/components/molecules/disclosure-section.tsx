"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface DisclosureSectionProps {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
  className?: string;
}

export function DisclosureSection({
  title,
  defaultOpen = false,
  count,
  children,
  className,
}: DisclosureSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border-b border-border/50", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/30"
      >
        <ChevronRight
          className={cn(
            "h-2.5 w-2.5 transition-transform duration-150",
            isOpen && "rotate-90"
          )}
        />
        <span className="flex-1 text-left">{title}</span>
        {count != null && (
          <span className="text-[9px] font-medium text-muted-foreground/60">
            {count}
          </span>
        )}
      </button>
      {isOpen && <div className="pb-1">{children}</div>}
    </div>
  );
}
