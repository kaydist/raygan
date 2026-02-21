"use client";

import { Code, Blocks, X, TerminalSquare } from "lucide-react";
import { Panel, PanelGroup, ImperativePanelHandle } from "react-resizable-panels";
import { useRef, useCallback } from "react";
import dynamic from "next/dynamic";

import { useUIStore, useProjectStore } from "@/stores";
import { Button } from "@/components/atoms";
import { CodeEditor } from "@/features/code-editor";
import { cn } from "@/lib/utils";

import { FileExplorer } from "./file-explorer";
import { ResizeHandle } from "../resize-handle";

const TerminalPanel = dynamic(
  () => import("@/features/terminal").then((mod) => mod.TerminalPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

function EditorTabs() {
  const { openFileTabs, activeFileTab, closeFileTab, setActiveFileTab } = useUIStore();

  if (openFileTabs.length === 0) {
    return null;
  }

  return (
    <div className="flex h-9 items-center gap-0.5 overflow-x-auto border-b border-border bg-[#252526] px-1">
      {openFileTabs.map((path) => {
        const name = path.split("/").pop() || path;
        const isActive = path === activeFileTab;

        return (
          <div
            key={path}
            className={cn(
              "group flex h-7 items-center gap-1.5 rounded-t-sm px-3 text-sm text-white",
              isActive
                ? "bg-[#1e1e1e] "
                : "text-muted-foreground hover:bg-[#2d2d2d]"
            )}
          >
            <button onClick={() => setActiveFileTab(path)} className="truncate max-w-[120px]">
              {name}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFileTab(path);
              }}
              className="rounded p-0.5 opacity-0 hover:bg-[#3c3c3c] group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function EditorPanel() {
  const activeFileTab = useUIStore((s) => s.activeFileTab);
  const files = useProjectStore((s) => s.files);

  if (!activeFileTab) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#1e1e1e] text-muted-foreground">
        <Code className="mb-2 h-8 w-8" />
        <p className="text-sm">Select a file to edit</p>
      </div>
    );
  }

  const file = files.get(activeFileTab);
  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#1e1e1e] text-muted-foreground">
        <p className="text-sm">File not found</p>
      </div>
    );
  }

  return <CodeEditor filePath={activeFileTab} className="h-full" />;
}

function BuilderCanvas() {
  return (
    <div className="flex h-full flex-col bg-[#1a1a1a]">
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="relative">
          <div className="h-[600px] w-[300px] overflow-hidden rounded-[32px] border-4 border-[#333] bg-white shadow-2xl">
            <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
              <div className="rounded-full bg-muted p-4">
                <Blocks className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Visual Builder</p>
                <p className="text-sm text-muted-foreground">
                  Drag components to build your UI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-border/50 bg-[#1a1a1a] p-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
          <span className="text-sm">−</span>
        </Button>
        <span className="min-w-[50px] text-center text-xs text-muted-foreground">75%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
          <span className="text-sm">+</span>
        </Button>
      </div>
    </div>
  );
}

function FileExplorerPanel() {
  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <div className="flex-1 overflow-hidden">
        <FileExplorer />
      </div>
    </div>
  );
}

function CodeWorkspace() {
  const terminalPanelRef = useRef<ImperativePanelHandle>(null);
  const isTerminalOpen = useUIStore((s) => s.isTerminalOpen);
  const toggleTerminal = useUIStore((s) => s.toggleTerminal);

  const handleToggleTerminal = useCallback(() => {
    const panel = terminalPanelRef.current;
    if (!panel) return;

    if (isTerminalOpen) {
      panel.collapse();
    } else {
      panel.expand();
    }
    toggleTerminal();
  }, [isTerminalOpen, toggleTerminal]);

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <PanelGroup direction="vertical" className="flex-1">
        <Panel defaultSize={isTerminalOpen ? 70 : 100} minSize={30}>
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={25} minSize={15} maxSize={40}>
              <div className="flex h-full flex-col border-r border-border">
                <div className="flex-1 overflow-hidden">
                  <FileExplorer />
                </div>
              </div>
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={75} minSize={40}>
              <div className="flex h-full flex-col">
                <EditorTabs />
                <div className="flex-1 overflow-hidden">
                  <EditorPanel />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
        <ResizeHandle orientation="horizontal" />
        <Panel
          ref={terminalPanelRef}
          defaultSize={isTerminalOpen ? 30 : 0}
          minSize={0}
          collapsible
          collapsedSize={0}
          onCollapse={() => {
            if (isTerminalOpen) toggleTerminal();
          }}
          onExpand={() => {
            if (!isTerminalOpen) toggleTerminal();
          }}
        >
          <TerminalPanel />
        </Panel>
      </PanelGroup>
      <div className="flex h-6 items-center justify-between border-t border-border bg-[#252526] px-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleToggleTerminal}
          >
            <TerminalSquare className="h-3.5 w-3.5" />
            Terminal
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CenterCanvas() {
  const { activeMode } = useUIStore();

  if (activeMode === "builder") {
    return <BuilderCanvas />;
  }

  if (activeMode === "agent") {
    return <FileExplorerPanel />;
  }

  return <CodeWorkspace />;
}
