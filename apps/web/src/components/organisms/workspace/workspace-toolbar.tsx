"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Share2,
  ChevronDown,
  MessageSquare,
  Blocks,
  Code,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore, useProjectStore } from "@/stores";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms";

interface WorkspaceToolbarProps {
  className?: string;
  isConnected?: boolean;
  isSyncing?: boolean;
}

export function WorkspaceToolbar({
  className,
  isConnected = false,
  isSyncing = false,
}: WorkspaceToolbarProps) {
  const router = useRouter();
  const { activeMode, setActiveMode, openModal, setBottomPanelOpen } =
    useUIStore();
  const currentProject = useProjectStore((state) => state.currentProject);

  return (
    <div
      className={cn(
        "flex h-12 items-center justify-between border-b border-border bg-background p-2",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-muted-foreground"
          onClick={() => router.push("/dashboard/drafts")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm">Drafts</span>
        </Button>
        <span className="text-muted-foreground">/</span>
        <button
          onClick={() => {
            setBottomPanelOpen(true);
            openModal("projectConfig");
          }}
          className="max-w-[150px] truncate text-sm font-medium hover:text-primary transition-colors"
        >
          {currentProject?.name ?? currentProject?.uuid}
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
        <Button
          variant={activeMode === "agent" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1.5 rounded-md px-3"
          onClick={() => setActiveMode("agent")}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Agent
        </Button>
        <Button
          variant={activeMode === "builder" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1.5 rounded-md px-3"
          onClick={() => setActiveMode("builder")}
        >
          <Blocks className="h-3.5 w-3.5" />
          Builder
        </Button>
        <Button
          variant={activeMode === "code-editor" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1.5 rounded-md px-3"
          onClick={() => setActiveMode("code-editor")}
        >
          <Code className="h-3.5 w-3.5" />
          Code
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isSyncing
                ? "animate-pulse bg-amber-500"
                : isConnected
                  ? "bg-emerald-500"
                  : "bg-red-500",
            )}
            title={
              isSyncing
                ? "Syncing..."
                : isConnected
                  ? "Connected"
                  : "Disconnected"
            }
          />
          <span className="text-muted-foreground">847 credits</span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 px-4">
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Coming soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3"
          onClick={() => openModal("deployProject")}
        >
          Deploy
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
