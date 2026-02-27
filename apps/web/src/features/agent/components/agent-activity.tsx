"use client";

import { useState } from "react";
import {
  FolderSearch,
  FileText,
  Search,
  FilePlus,
  FileEdit,
  FileX,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ToolCallActivity } from "../types";

interface AgentActivityProps {
  toolCalls: ToolCallActivity[];
  isStreaming?: boolean;
}

const TOOL_CONFIG: Record<
  string,
  { icon: React.ElementType; label: (input: Record<string, unknown>) => string }
> = {
  list_files: {
    icon: FolderSearch,
    label: () => "Exploring project files",
  },
  read_file: {
    icon: FileText,
    label: (input) => `Reading ${(input.path as string) || "file"}`,
  },
  search_code: {
    icon: Search,
    label: (input) => `Searching for "${(input.query as string) || "..."}"`,
  },
  propose_plan: {
    icon: ClipboardList,
    label: () => "Proposing change plan",
  },
  create_file: {
    icon: FilePlus,
    label: (input) => `Creating ${(input.path as string) || "file"}`,
  },
  modify_file: {
    icon: FileEdit,
    label: (input) => `Modifying ${(input.path as string) || "file"}`,
  },
  delete_file: {
    icon: FileX,
    label: (input) => `Deleting ${(input.path as string) || "file"}`,
  },
};

function ActivityItem({
  activity,
  isActive,
}: {
  activity: ToolCallActivity;
  isActive: boolean;
}) {
  const config = TOOL_CONFIG[activity.name];
  if (!config) return null;

  const Icon = config.icon;
  const label = config.label(activity.input);
  const isDone = activity.result !== undefined;
  const isError = activity.is_error;

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-0.5 text-xs",
        isActive && "text-foreground",
      )}
    >
      {isActive && !isDone ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
      ) : (
        <Icon
          className={cn(
            "h-3 w-3 shrink-0",
            isError
              ? "text-red-500"
              : isDone
                ? "text-muted-foreground/50"
                : "text-muted-foreground/70",
          )}
        />
      )}
      <span
        className={cn(
          "truncate",
          isError
            ? "text-red-500"
            : isActive && !isDone
              ? "text-foreground"
              : "text-muted-foreground/60",
        )}
      >
        {label}
      </span>
      {isDone && !isError && (
        <Check className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
      )}
      {isError && (
        <AlertCircle className="h-2.5 w-2.5 shrink-0 text-red-500" />
      )}
    </div>
  );
}

export function AgentActivity({ toolCalls, isStreaming }: AgentActivityProps) {
  const [expanded, setExpanded] = useState(false);

  if (toolCalls.length === 0) return null;

  const lastCall = toolCalls[toolCalls.length - 1]!;
  const activeCall = isStreaming && lastCall.result === undefined ? lastCall : null;
  const completedCalls = toolCalls.filter((tc) => tc.result !== undefined);
  const allDone = !activeCall && completedCalls.length === toolCalls.length;

  if (allDone && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 rounded-md border border-border/40 bg-accent/20 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-accent/40 transition-colors"
      >
        <ChevronRight className="h-3 w-3" />
        <span>{toolCalls.length} tool {toolCalls.length === 1 ? "call" : "calls"}</span>
        <Check className="h-2.5 w-2.5 text-emerald-500" />
      </button>
    );
  }

  if (allDone && expanded) {
    return (
      <div className="rounded-md border border-border/40 bg-accent/20 px-3 py-2">
        <button
          onClick={() => setExpanded(false)}
          className="flex w-full items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="h-3 w-3" />
          <span>{toolCalls.length} tool {toolCalls.length === 1 ? "call" : "calls"}</span>
        </button>
        <div className="mt-1.5 space-y-0.5">
          {toolCalls.map((tc) => (
            <ActivityItem key={tc.id} activity={tc} isActive={false} />
          ))}
        </div>
      </div>
    );
  }

  const previousCalls = toolCalls.slice(0, -1);
  const showPrevious = expanded || previousCalls.length <= 2;
  const hiddenPrevious = showPrevious ? [] : previousCalls.slice(0, -2);
  const visiblePrevious = showPrevious ? previousCalls : previousCalls.slice(-2);

  return (
    <div className="rounded-md border border-border/50 bg-accent/30 px-3 py-2 space-y-1">
      {previousCalls.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-2.5 w-2.5" />
          ) : (
            <ChevronRight className="h-2.5 w-2.5" />
          )}
          <span>{hiddenPrevious.length > 0 ? `${hiddenPrevious.length} more` : "Collapse"}</span>
        </button>
      )}

      {visiblePrevious.map((tc) => (
        <ActivityItem key={tc.id} activity={tc} isActive={false} />
      ))}

      {activeCall && (
        <ActivityItem activity={activeCall} isActive />
      )}
    </div>
  );
}
