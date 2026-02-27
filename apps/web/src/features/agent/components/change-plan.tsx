"use client";

import { useState, useEffect } from "react";
import {
  FilePlus,
  FileEdit,
  FileX,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Loader2,
  Circle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Badge } from "@/components/atoms";
import type { AgentPlanState, ToolCallActivity } from "../types";

type FileStatus = "pending" | "in_progress" | "completed" | "error";

const ACTION_TO_TOOL: Record<string, string> = {
  create: "create_file",
  modify: "modify_file",
  delete: "delete_file",
};

interface ChangePlanProps {
  plan: AgentPlanState;
  toolCalls?: ToolCallActivity[];
  isStreaming?: boolean;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}

const ACTION_CONFIG = {
  create: {
    icon: FilePlus,
    label: "Create",
    badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  },
  modify: {
    icon: FileEdit,
    label: "Modify",
    badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  },
  delete: {
    icon: FileX,
    label: "Delete",
    badgeClass: "bg-red-500/15 text-red-600 border-red-500/20",
  },
} as const;

function getFileStatus(
  change: AgentPlanState["changes"][number],
  toolCalls?: ToolCallActivity[],
): FileStatus {
  if (!toolCalls || toolCalls.length === 0) return "pending";

  const toolName = ACTION_TO_TOOL[change.action];
  const match = toolCalls.find(
    (tc) =>
      tc.name === toolName &&
      (tc.input as { path?: string }).path === change.path,
  );

  if (!match) return "pending";
  if (match.is_error) return "error";
  if (match.result !== undefined) return "completed";
  return "in_progress";
}

function FileStatusIndicator({ status }: { status: FileStatus }) {
  if (status === "completed") {
    return <Check className="h-3 w-3 text-emerald-500 shrink-0" />;
  }
  if (status === "in_progress") {
    return <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />;
  }
  if (status === "error") {
    return <X className="h-3 w-3 text-red-400 shrink-0" />;
  }
  return <Circle className="h-2 w-2 text-muted-foreground/40 shrink-0" />;
}

function PlanChangeList({
  changes,
  toolCalls,
  showStatus,
}: {
  changes: AgentPlanState["changes"];
  toolCalls?: ToolCallActivity[];
  showStatus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {changes.map((change, index) => {
        const config = ACTION_CONFIG[change.action];
        const Icon = config.icon;
        const status = showStatus ? getFileStatus(change, toolCalls) : undefined;

        return (
          <div
            key={`${change.path}-${index}`}
            className={cn(
              "flex items-center gap-2 text-xs",
              status === "completed" && "opacity-60",
            )}
          >
            {showStatus && <FileStatusIndicator status={status!} />}
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-1 px-1.5 text-[10px] font-medium shrink-0",
                config.badgeClass,
              )}
            >
              <Icon className="h-2.5 w-2.5" />
              {config.label}
            </Badge>
            <span className="font-mono text-muted-foreground truncate">
              {change.path}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ChangePlan({
  plan,
  toolCalls,
  isStreaming,
  onApprove,
  onReject,
  disabled,
}: ChangePlanProps) {
  const isPending = plan.status === "pending";
  const isApproved = plan.status === "approved";
  const isRejected = plan.status === "rejected";
  const [manualToggle, setManualToggle] = useState<boolean | null>(null);

  const completedCount = isApproved
    ? plan.changes.filter(
        (c) => getFileStatus(c, toolCalls) === "completed",
      ).length
    : 0;
  const totalCount = plan.changes.length;
  const isExecuting = isApproved && isStreaming && completedCount < totalCount;
  const allDone = completedCount === totalCount && !isStreaming;

  const expanded = manualToggle !== null ? manualToggle : isExecuting;

  useEffect(() => {
    if (allDone && manualToggle === null) setManualToggle(false);
  }, [allDone, manualToggle]);

  if (isApproved || isRejected) {
    return (
      <div className="rounded-lg border border-border/50 bg-accent/20">
        <button
          onClick={() => setManualToggle(!expanded)}
          className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent/30 transition-colors rounded-lg"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <ListChecks className="h-3 w-3 text-muted-foreground/70" />
          <span className="flex-1 text-left text-muted-foreground truncate">
            {plan.summary}
          </span>
          <span className="shrink-0 flex items-center gap-1.5 text-[11px]">
            {isApproved && (
              <>
                {!allDone && isStreaming ? (
                  <>
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      {completedCount}/{totalCount}
                    </span>
                  </>
                ) : (
                  <>
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                    <span className="text-emerald-600">
                      {completedCount}/{totalCount} done
                    </span>
                  </>
                )}
              </>
            )}
            {isRejected && (
              <>
                <X className="h-2.5 w-2.5 text-red-400" />
                <span className="text-red-500">Rejected</span>
              </>
            )}
          </span>
        </button>

        {expanded && (
          <div className="border-t border-border/40 px-3 py-2.5  max-h-[250px] overflow-auto">
            <PlanChangeList
              changes={plan.changes}
              toolCalls={toolCalls}
              showStatus={isApproved}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <p className="text-[13px] font-medium text-foreground">{plan.summary}</p>

      <PlanChangeList changes={plan.changes} />

      {isPending && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={disabled}
            className="h-7 gap-1.5 text-xs"
          >
            <Check className="h-3 w-3" />
            Apply Changes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
            disabled={disabled}
            className="h-7 gap-1.5 text-xs"
          >
            <X className="h-3 w-3" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
