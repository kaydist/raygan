"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Undo2,
  Redo2,
  Share2,
  ChevronDown,
  MessageSquare,
  Blocks,
  Code,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/atoms";

interface WorkspaceToolbarProps {
  projectName: string;
  className?: string;
}

export function WorkspaceToolbar({ projectName, className }: WorkspaceToolbarProps) {
  const router = useRouter();
  const { activeMode, setActiveMode } = useUIStore();

  return (
    <div
      className={cn(
        "flex h-12 items-center justify-between border-b border-border bg-background px-2",
        className
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
        <span className="max-w-[150px] truncate text-sm font-medium">
          {projectName}
        </span>
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
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">847 credits</span>
        </div>

        <Button size="sm" className="h-8 gap-1.5 bg-primary px-4">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>

        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3">
          Deploy
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>

        <Avatar className="h-8 w-8">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            K
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
