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
  LogOut,
  Settings,
  User,
  Download,
  Loader2,
} from "lucide-react";

import { cn, downloadBlob } from "@/lib/utils";
import { useUIStore, useProjectStore } from "@/stores";
import { useLogout } from "@/lib/api/queries";
import { exportsApi } from "@/lib/api/routes";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms";

interface WorkspaceToolbarProps {
  projectName: string;
  className?: string;
  isConnected?: boolean;
  isSyncing?: boolean;
}

export function WorkspaceToolbar({
  projectName,
  className,
  isConnected = false,
  isSyncing = false,
}: WorkspaceToolbarProps) {
  const router = useRouter();
  const { activeMode, setActiveMode } = useUIStore();
  const currentProject = useProjectStore((state) => state.currentProject);
  const logout = useLogout();
  const [isExporting, setIsExporting] = React.useState(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push("/login");
  };

  const handleExport = async () => {
    if (!currentProject) return;

    setIsExporting(true);
    try {
      const blob = await exportsApi.downloadProjectZip(currentProject.uuid);
      downloadBlob(blob, `${currentProject.slug}.zip`);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

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
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isSyncing
                ? "animate-pulse bg-amber-500"
                : isConnected
                  ? "bg-emerald-500"
                  : "bg-red-500"
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

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3"
          onClick={handleExport}
          disabled={isExporting || !currentProject}
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isExporting ? "Exporting..." : "Export"}
        </Button>

        <Button size="sm" className="h-8 gap-1.5 bg-primary px-4">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>

        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3">
          Deploy
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  K
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={logout.isPending}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logout.isPending ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
