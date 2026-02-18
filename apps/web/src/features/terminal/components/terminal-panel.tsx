"use client";

import { useState, useCallback } from "react";
import { Plus, X, Terminal as TerminalIcon, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";
import { useWebContainer } from "../hooks/use-web-container";

const Terminal = dynamic(
  () => import("./terminal").then((mod) => ({ default: mod.Terminal })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading terminal...</span>
        </div>
      </div>
    ),
  }
);

interface TerminalTab {
  id: string;
  name: string;
}

interface TerminalPanelProps {
  className?: string;
}

export function TerminalPanel({ className }: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "1", name: "Terminal 1" },
  ]);
  const [activeTab, setActiveTab] = useState("1");
  const { state } = useWebContainer();

  const addTab = useCallback(() => {
    const newId = String(Date.now());
    setTabs((prev) => [...prev, { id: newId, name: `Terminal ${prev.length + 1}` }]);
    setActiveTab(newId);
  }, []);

  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== id);
      if (newTabs.length === 0) {
        const newTab = { id: String(Date.now()), name: "Terminal 1" };
        setActiveTab(newTab.id);
        return [newTab];
      }
      if (activeTab === id) {
        const index = prev.findIndex((t) => t.id === id);
        const newActiveIndex = Math.min(index, newTabs.length - 1);
        setActiveTab(newTabs[newActiveIndex]?.id || newTabs[0]?.id || "");
      }
      return newTabs;
    });
  }, [activeTab]);

  const getStatusColor = () => {
    switch (state.status) {
      case "ready":
        return "bg-green-500";
      case "booting":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className={cn("flex h-full flex-col bg-[#1e1e1e]", className)}>
      <div className="flex h-9 items-center justify-between border-b border-[#3c3c3c] bg-[#252526]">
        <div className="flex h-full items-center overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group flex h-full items-center gap-2 border-r border-[#3c3c3c] px-3 text-sm transition-colors",
                activeTab === tab.id
                  ? "bg-[#1e1e1e] text-white"
                  : "text-[#969696] hover:bg-[#2a2d2e]"
              )}
            >
              <TerminalIcon className="h-3.5 w-3.5" />
              <span>{tab.name}</span>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                className={cn(
                  "ml-1 flex h-4 w-4 items-center justify-center rounded-sm transition-colors hover:bg-[#3c3c3c]",
                  activeTab !== tab.id && "opacity-0 group-hover:opacity-100"
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-2">
          <div className="flex items-center gap-1.5 text-xs text-[#969696]">
            <span className={cn("h-2 w-2 rounded-full", getStatusColor())} />
            <span className="capitalize">{state.status}</span>
          </div>
          <button
            onClick={addTab}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-[#969696] transition-colors hover:bg-[#3c3c3c] hover:text-white"
            title="New Terminal"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "absolute inset-0",
              activeTab === tab.id ? "visible" : "invisible"
            )}
          >
            {activeTab === tab.id && <Terminal />}
          </div>
        ))}
      </div>

      {state.url && (
        <div className="flex h-7 items-center justify-between border-t border-[#3c3c3c] bg-[#007acc] px-3 text-xs text-white">
          <span>Preview available at:</span>
          <a
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            {state.url}
          </a>
        </div>
      )}
    </div>
  );
}
