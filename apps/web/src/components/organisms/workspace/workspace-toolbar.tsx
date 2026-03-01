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
  LogOut,
  Settings,
  User,
  Download,
  Loader2,
  Github,
  Smartphone,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  const { activeMode, setActiveMode, openModal, setBottomPanelOpen } = useUIStore();
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3">
              Deploy
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => openModal("deployProject")}
              disabled={!currentProject}
            >
              <Smartphone className="h-3.5 w-3.5 mr-2" />
              Build APK
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExport}
              disabled={isExporting || !currentProject}
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-2" />
              )}
              {isExporting ? "Exporting..." : "Export"}
            </DropdownMenuItem>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem className="cursor-not-allowed">
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Coming soon</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuContent>
        </DropdownMenu>

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
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
            >
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
