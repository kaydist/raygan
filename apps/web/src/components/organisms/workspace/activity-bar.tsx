"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plug,
  Settings,
  CircleHelp,
  FileJson,
  KeyRound,
  ChevronRight,
  User,
  LogOut,
  Hammer,
  Radio,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
import { useUIStore } from "@/stores";
import { useLogout } from "@/lib/api/queries";

type ActivityTab = "integrations" | "config" | "builds";

const TABS: { id: ActivityTab; icon: React.ElementType; label: string }[] = [
  { id: "config", icon: Settings, label: "Config" },
  { id: "integrations", icon: Plug, label: "Integrations" },
  { id: "builds", icon: Hammer, label: "Builds" },
];

function IntegrationsTab() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Plug className="h-8 w-8 text-muted-foreground/50" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          No integrations connected
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          Connect Supabase, Firebase, or custom APIs
        </p>
      </div>
      <button className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
        Coming Soon
      </button>
    </div>
  );
}

const CONFIG_ITEMS = [
  {
    id: "general" as const,
    icon: FileJson,
    label: "Project Settings",
    description: "App name, slug, icons, and identifiers",
  },
  {
    id: "env" as const,
    icon: KeyRound,
    label: "Environment Variables",
    description: "Manage keys and secrets",
  },
];

function ConfigTab() {
  const { openModal } = useUIStore();

  return (
    <div className="flex h-full flex-col p-2">
      <div className="flex flex-col gap-1">
        {CONFIG_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => openModal("projectConfig", { tab: item.id })}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  {item.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const BUILD_ITEMS = [
  {
    id: "builds" as const,
    icon: Hammer,
    label: "Build History",
    description: "APK builds, status, and artifacts",
  },
  {
    id: "ota" as const,
    icon: Radio,
    label: "OTA Updates",
    description: "Over-the-air update history",
  },
];

function BuildsTab() {
  const { openModal } = useUIStore();

  return (
    <div className="flex h-full flex-col p-2">
      <div className="flex flex-col gap-1">
        {BUILD_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => openModal("buildHistory", { tab: item.id })}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  {item.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TAB_CONTENT: Record<ActivityTab, React.FC> = {
  integrations: IntegrationsTab,
  config: ConfigTab,
  builds: BuildsTab,
};

export function ActivityBar() {
  const router = useRouter();
  const { isBottomPanelOpen, toggleBottomPanel, setBottomPanelOpen } =
    useUIStore();
  const [activeTab, setActiveTab] = useState<ActivityTab>("config");
  const logout = useLogout();

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push("/login");
  };

  const handleTabClick = (tabId: ActivityTab) => {
    if (isBottomPanelOpen && activeTab === tabId) {
      toggleBottomPanel();
    } else {
      setActiveTab(tabId);
      if (!isBottomPanelOpen) {
        setBottomPanelOpen(true);
      }
    }
  };

  const ActiveContent = TAB_CONTENT[activeTab];

  return (
    <div className="flex h-full">
      <TooltipProvider delayDuration={300}>
        <div className="flex w-12 flex-col items-center border-r border-border bg-background py-2">
          <div className="flex flex-1 flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = isBottomPanelOpen && activeTab === tab.id;
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleTabClick(tab.id)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {tab.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-2 pt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                  <CircleHelp className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Help
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                      K
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
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
      </TooltipProvider>

      {isBottomPanelOpen && (
        <div className="flex w-60 flex-col border-r border-border bg-background">
          <div className="flex h-9 items-center border-b border-border px-3">
            <span className="text-xs font-medium text-foreground">
              {TABS.find((t) => t.id === activeTab)?.label}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <ActiveContent />
          </div>
        </div>
      )}
    </div>
  );
}
