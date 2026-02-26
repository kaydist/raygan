"use client";

import { useState } from "react";
import { Check, Circle, Loader2, ChevronRight, FileCode } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentTask } from "../types";

interface TaskProgressProps {
  tasks: AgentTask[];
  completedCount: number;
  totalCount: number;
}

function TaskStatusIcon({ status }: { status: AgentTask["status"] }) {
  switch (status) {
    case "completed":
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
        </div>
      );
    case "in_progress":
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      );
    case "pending":
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Circle className="h-3.5 w-3.5 text-muted-foreground/30" strokeWidth={2} />
        </div>
      );
  }
}

function TaskItem({ task }: { task: AgentTask }) {
  const [expanded, setExpanded] = useState(false);
  const hasFiles = task.files.length > 0;
  const isClickable = hasFiles;

  return (
    <li className="group">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all duration-200",
          isClickable && "hover:bg-accent cursor-pointer",
          !isClickable && "cursor-default"
        )}
        onClick={() => isClickable && setExpanded((prev) => !prev)}
      >
        <TaskStatusIcon status={task.status} />
        <span
          className={cn(
            "flex-1 text-[13px] leading-snug transition-colors duration-200",
            task.status === "completed" && "text-muted-foreground line-through decoration-muted-foreground/40",
            task.status === "in_progress" && "font-medium text-foreground",
            task.status === "pending" && "text-muted-foreground/70"
          )}
        >
          {task.name}
        </span>
        {isClickable && (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all duration-200",
              expanded && "rotate-90 text-muted-foreground/60",
              "opacity-0 group-hover:opacity-100",
              expanded && "opacity-100"
            )}
          />
        )}
      </button>

      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-[30px] mt-0.5 mb-1 space-y-px rounded-md bg-accent/50 px-2.5 py-1.5">
            {task.files.map((file, index) => (
              <div
                key={`${file.filename}-${index}`}
                className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground"
              >
                <FileCode className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                <span className="font-mono truncate">{file.filename}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

export function TaskProgress({ tasks, completedCount, totalCount }: TaskProgressProps) {
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div
        className={cn(
          "h-[3px] transition-all duration-500 ease-out",
          allDone ? "bg-emerald-500/80" : "bg-primary/60"
        )}
        style={{ width: `${progress}%` }}
      />

      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {allDone ? "Completed" : "Progress"}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              allDone
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      <ul className="px-2 pb-2">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
    </div>
  );
}
