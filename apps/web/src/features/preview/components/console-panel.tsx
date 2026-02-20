"use client";

import { useRef, useEffect } from "react";
import { Trash2, AlertCircle, AlertTriangle, Info, Terminal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, ScrollArea } from "@/components/atoms";
import type { ConsoleLog } from "../types";

interface ConsolePanelProps {
  logs: ConsoleLog[];
  onClear: () => void;
  className?: string;
  maxHeight?: number;
}

const LOG_ICONS = {
  log: Terminal,
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
};

const LOG_COLORS = {
  log: "text-foreground",
  info: "text-blue-500",
  warn: "text-amber-500",
  error: "text-red-500",
};

const LOG_BG_COLORS = {
  log: "",
  info: "bg-blue-500/5",
  warn: "bg-amber-500/5",
  error: "bg-red-500/5",
};

export function ConsolePanel({
  logs,
  onClear,
  className,
  maxHeight = 200,
}: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const formatMessage = (log: ConsoleLog): string => {
    if (log.payload && Array.isArray(log.payload) && log.payload.length > 0) {
      try {
        return log.payload
          .map((p) => (typeof p === "object" ? JSON.stringify(p) : String(p)))
          .join(" ");
      } catch {
        return log.message;
      }
    }
    return log.message;
  };

  return (
    <div className={cn("flex flex-col border-t border-border", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Console
          </span>
          {logs.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {logs.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={logs.length === 0}
          className="h-6 w-6 p-0"
          title="Clear console"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea
        ref={scrollRef}
        className="font-mono text-xs"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-muted-foreground">
            <span className="text-xs">No logs yet</span>
          </div>
        ) : (
          <div className="space-y-px p-1">
            {logs.map((log) => {
              const Icon = LOG_ICONS[log.type];
              return (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-2 rounded px-2 py-1",
                    LOG_BG_COLORS[log.type]
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 h-3 w-3 shrink-0", LOG_COLORS[log.type])}
                  />
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span
                    className={cn(
                      "flex-1 break-all",
                      LOG_COLORS[log.type]
                    )}
                  >
                    {formatMessage(log)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
