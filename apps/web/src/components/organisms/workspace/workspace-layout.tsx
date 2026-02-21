"use client";

import { useEffect, useState } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";

import { useUIStore } from "@/stores";
import { useProjectFilesSync } from "@/hooks";

import { ResizeHandle } from "./resize-handle";
import { AgentPanel } from "./agent-panel";
import { CenterCanvas } from "./center-canvas";
import { RightPanel } from "./right-panel";
import { StatusBar } from "./status-bar";
import { defaultLayout, LayoutState } from "./constants";

interface WorkspaceLayoutProps {
  projectId: string;
}

export function WorkspaceLayout({ projectId }: WorkspaceLayoutProps) {
  const { activeMode } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<LayoutState>(defaultLayout);

  useProjectFilesSync({
    projectId,
    enabled: mounted,
  });

  useEffect(() => {
    setMounted(true);
  }, []);


  const handleLayoutChange = (sizes: number[]) => {
    setLayout((prev) => {
      if (activeMode === "agent" && sizes.length >= 2) {
        return {
          ...prev,
          leftSize: sizes[0] ?? prev.leftSize,
          rightSize: sizes[1] ?? prev.rightSize,
        };
      } else if (sizes.length >= 2) {
        return {
          ...prev,
          centerSize: sizes[0] ?? prev.centerSize,
          rightSize: sizes[1] ?? prev.rightSize,
        };
      }
      return prev;
    });
  };

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const showLeftPanel = activeMode === "agent";

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <PanelGroup
          key={showLeftPanel ? "agent-layout" : "default-layout"}
          direction="horizontal"
          onLayout={handleLayoutChange}
          className="h-full"
        >
          {showLeftPanel ? (
            <>
              <Panel
                defaultSize={layout.leftSize}
                minSize={30}
                maxSize={35}
                className="border-r border-border bg-background"
              >
                <AgentPanel projectId={projectId} />
              </Panel>
              <ResizeHandle />
              <Panel
                defaultSize={layout.rightSize}
                minSize={40}
                maxSize={70}
                className="bg-background"
              >
                <RightPanel projectId={projectId} />
              </Panel>
            </>
          ) : (
            <>
              <Panel
                defaultSize={layout.centerSize}
                minSize={30}
              >
                <CenterCanvas />
              </Panel>
              <ResizeHandle />
              <Panel
                defaultSize={layout.rightSize}
                minSize={15}
                maxSize={40}
                className="border-l border-border bg-background"
              >
                <RightPanel projectId={projectId} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      <StatusBar />
    </div>
  );
}
