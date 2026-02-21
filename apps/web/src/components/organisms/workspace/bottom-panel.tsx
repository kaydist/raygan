"use client";

import { useState } from "react";
import {
  Terminal,
  Package,
  Plug,
  Settings,
  ChevronDown,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, ScrollArea } from "@/components/atoms";
import { useUIStore } from "@/stores";

type BottomPanelTab = "console" | "packages" | "integrations" | "config";

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

function ConsoleTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-2 text-xs leading-relaxed">
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

function ConfigTab() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Settings className="h-8 w-8 text-muted-foreground/50" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Project Configuration</p>
        <p className="text-[10px] text-muted-foreground/70">
          Manage app.json, environment variables, and build settings
        </p>
      </div>
      <button className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
        Open Config
      </button>
    </div>
  );
}

interface BottomPanelProps {
  selectedNode?: { type: string; name: string; depth: number };
  syncStatus?: "synced" | "syncing" | "error";
  zoom?: number;
}

export function BottomPanel({
  selectedNode = { type: "Pressable", name: '"Add"', depth: 3 },
  syncStatus = "synced",
  zoom = 75,
}: BottomPanelProps) {
  const { isBottomPanelOpen, toggleBottomPanel } = useUIStore();
  const [activeTab, setActiveTab] = useState<BottomPanelTab>("console");

  const tabs = [
    { id: "console" as const, icon: Terminal, label: "Console" },
    { id: "packages" as const, icon: Package, label: "Packages" },
    { id: "integrations" as const, icon: Plug, label: "Integrations" },
    { id: "config" as const, icon: Settings, label: "Config" },
  ];

  return (
    <div className="border-t border-border bg-background">
      <div className="flex h-7 items-center gap-1 px-3">
        <button
          onClick={toggleBottomPanel}
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              isBottomPanelOpen && "rotate-180"
            )}
          />
        </button>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (!isBottomPanelOpen) toggleBottomPanel();
              }}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                activeTab === tab.id && isBottomPanelOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}

        <div className="flex-1" />

        <span className="text-muted-foreground text-xs">
          {selectedNode.type} · {selectedNode.name} · depth {selectedNode.depth}
        </span>

        <div className="mx-2 h-3.5 w-px bg-border" />

        <span
          className={cn(
            "flex items-center gap-1.5 text-[10px]",
            syncStatus === "synced" && "text-emerald-500",
            syncStatus === "syncing" && "text-amber-500",
            syncStatus === "error" && "text-red-500"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              syncStatus === "synced" && "bg-emerald-500",
              syncStatus === "syncing" && "animate-pulse bg-amber-500",
              syncStatus === "error" && "bg-red-500"
            )}
          />
          {syncStatus === "synced" && "AST synced"}
          {syncStatus === "syncing" && "Syncing..."}
          {syncStatus === "error" && "Sync error"}
        </span>

        <span className="ml-2 text-xs text-muted-foreground">
          {zoom}%
        </span>
      </div>

      {isBottomPanelOpen && (
        <div className="h-40 border-t border-border/50">
          {activeTab === "console" && <ConsoleTab />}
          {activeTab === "packages" && <PackagesTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "config" && <ConfigTab />}
        </div>
      )}
    </div>
  );
}
