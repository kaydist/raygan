"use client";

import { Code, Blocks, X } from "lucide-react";
import { Panel, PanelGroup } from "react-resizable-panels";

import { useUIStore, useProjectStore } from "@/stores";
import { Button } from "@/components/atoms";
import { CodeEditor } from "@/features/code-editor";
import { cn } from "@/lib/utils";

import { FileExplorer } from "./file-explorer";
import { ResizeHandle } from "./resize-handle";

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
              "group flex h-7 items-center gap-1.5 rounded-t-sm px-3 text-sm",
              isActive
                ? "bg-[#1e1e1e] text-foreground"
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

function CodeWorkspace() {
  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={25} minSize={15} maxSize={40}>
          <div className="flex h-full flex-col border-r border-border">
            <div className="flex h-9 items-center border-b border-border bg-[#252526] px-3">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Explorer
              </span>
            </div>
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
    </div>
  );
}

export function CenterCanvas() {
  const { activeMode } = useUIStore();

  if (activeMode === "builder") {
    return <BuilderCanvas />;
  }

  return <CodeWorkspace />;
}
