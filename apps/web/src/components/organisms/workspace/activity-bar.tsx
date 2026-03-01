"use client";

import { useState } from "react";
import {
  Terminal,
  Package,
  Plug,
  Settings,
  CircleHelp,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  FileJson,
  KeyRound,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, ScrollArea } from "@/components/atoms";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms";
import { useUIStore } from "@/stores";

type ActivityTab = "console" | "packages" | "integrations" | "config";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

interface PackageInfo {
  name: string;
  version: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: "1", timestamp: "11:42:03", level: "success", message: "AST synced — 12 nodes, 3 screens" },
  { id: "2", timestamp: "11:42:01", level: "info", message: 'Component selected: Pressable "Add"' },
  { id: "3", timestamp: "11:41:58", level: "warning", message: "FlatList missing keyExtractor prop" },
  { id: "4", timestamp: "11:41:45", level: "success", message: "Preview hot-reloaded" },
  { id: "5", timestamp: "11:41:30", level: "info", message: "Project loaded: My Todo App" },
];

const MOCK_PACKAGES: PackageInfo[] = [
  { name: "expo", version: "~51.0.0" },
  { name: "expo-router", version: "~3.5.0" },
  { name: "react-native-reanimated", version: "~3.10.0" },
  { name: "@expo/vector-icons", version: "^14.0.0" },
  { name: "react-native-safe-area-context", version: "~4.10.0" },
  { name: "zustand", version: "^4.5.0" },
];

const LOG_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const LOG_COLORS = {
  info: "text-primary",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
};

const TABS = [
  { id: "console" as const, icon: Terminal, label: "Console" },
  { id: "packages" as const, icon: Package, label: "Packages" },
  { id: "integrations" as const, icon: Plug, label: "Integrations" },
  { id: "config" as const, icon: Settings, label: "Config" },
];

function ConsoleTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 text-xs leading-relaxed">
        {MOCK_LOGS.map((log) => {
          const Icon = LOG_ICONS[log.level];
          return (
            <div key={log.id} className="flex items-start gap-2 py-0.5">
              <span className="text-muted-foreground/60">[{log.timestamp}]</span>
              <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", LOG_COLORS[log.level])} />
              <span className="text-muted-foreground">{log.message}</span>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function PackagesTab() {
  const [search, setSearch] = useState("");

  const filteredPackages = MOCK_PACKAGES.filter((pkg) =>
    pkg.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b border-border/50 p-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search npm packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
        <button className="flex h-7 items-center gap-1.5 rounded border border-border bg-muted/30 px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.name}
              className="flex items-center gap-3 rounded px-2 py-1.5 text-xs hover:bg-muted/30"
            >
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">{pkg.name}</span>
              <span className="text-muted-foreground/60">{pkg.version}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Plug className="h-8 w-8 text-muted-foreground/50" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">No integrations connected</p>
        <p className="text-[10px] text-muted-foreground/70">
          Connect Supabase, Firebase, or custom APIs
        </p>
      </div>
      <button className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
        Connect Backend
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
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.description}</p>
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
  console: ConsoleTab,
  packages: PackagesTab,
  integrations: IntegrationsTab,
  config: ConfigTab,
};

interface ActivityBarProps {
  syncStatus?: "synced" | "syncing" | "error";
  zoom?: number;
}

export function ActivityBar({
  syncStatus = "synced",
  zoom = 75,
}: ActivityBarProps) {
  const { isBottomPanelOpen, toggleBottomPanel, setBottomPanelOpen, openModal } = useUIStore();
  const [activeTab, setActiveTab] = useState<ActivityTab>("console");

  const handleTabClick = (tabId: ActivityTab) => {
    if (tabId === "config") {
      setActiveTab(tabId);
      setBottomPanelOpen(true);
      openModal("projectConfig");
      return;
    }

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
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                syncStatus === "synced" && "bg-emerald-500",
                syncStatus === "syncing" && "animate-pulse bg-amber-500",
                syncStatus === "error" && "bg-red-500"
              )}
            />
            <span className="text-[9px] text-muted-foreground">{zoom}%</span>

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
