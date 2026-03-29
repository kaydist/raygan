"use client";

import { useEffect, useState, useCallback } from "react";
import { Panel, Group as PanelGroup } from "react-resizable-panels";

import { useUIStore } from "@/stores";
import { useProjectFilesSync } from "@/hooks";

import { ResizeHandle } from "./resize-handle";
import { AgentPanel } from "./agent";
import { CenterCanvas } from "./code";
import { RightPanel } from "./right-panel";
import { ActivityBar } from "./activity-bar";
import { BuilderLeftPanel, BuilderCanvas, BuilderInspector } from "./builder";
import { defaultLayout, type LayoutState } from "./constants";

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

  const handleAgentLayoutChange = useCallback((layout: Record<string, number>) => {
    const sizes = Object.values(layout);
    setLayout((prev) => ({
      ...prev,
      leftSize: sizes[0] ?? prev.leftSize,
      rightSize: sizes[1] ?? prev.rightSize,
    }));
  }, []);

  const handleBuilderLayoutChange = useCallback((layout: Record<string, number>) => {
    const sizes = Object.values(layout);
    setLayout((prev) => ({
      ...prev,
      leftSize: sizes[0] ?? prev.leftSize,
      centerSize: sizes[1] ?? prev.centerSize,
      rightSize: sizes[2] ?? prev.rightSize,
    }));
  }, []);

  const handleCodeLayoutChange = useCallback((layout: Record<string, number>) => {
    const sizes = Object.values(layout);
    setLayout((prev) => ({
      ...prev,
      centerSize: sizes[0] ?? prev.centerSize,
      rightSize: sizes[1] ?? prev.rightSize,
    }));
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }


  return (
    <div className="flex min-h-0 flex-1 flex-row">
      <ActivityBar />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {activeMode === "agent" && (
          <PanelGroup
            key="agent-layout"
            orientation="horizontal"
            onLayoutChange={handleAgentLayoutChange}
            className="h-full"
          >
            <Panel
              id="agent-left"
              defaultSize={`${layout.leftSize}%`}
              minSize="30%"
              maxSize="35%"
              className="border-r border-border bg-background"
            >
              <AgentPanel projectId={projectId} />
            </Panel>
            <ResizeHandle />
            <Panel
              id="agent-right"
              defaultSize={`${layout.rightSize}%`}
              minSize="40%"
              maxSize="70%"
              className="bg-background"
            >
              <RightPanel projectId={projectId} />
            </Panel>
          </PanelGroup>
        )}

        {activeMode === "builder" && (
          <PanelGroup
            key="builder-layout"
            orientation="horizontal"
            onLayoutChange={handleBuilderLayoutChange}
            className="h-full"
          >
            <Panel
              id="builder-left"
              defaultSize="20%"
              minSize="15%"
              maxSize="25%"
              className="border-r border-border bg-background"
            >
              <BuilderLeftPanel />
            </Panel>
            <ResizeHandle />
            <Panel id="builder-center" defaultSize="55%" minSize="35%">
              <BuilderCanvas />
            </Panel>
            <ResizeHandle />
            <Panel
              id="builder-right"
              defaultSize="25%"
              minSize="18%"
              maxSize="35%"
              className="border-l border-border bg-background"
            >
              <BuilderInspector />
            </Panel>
          </PanelGroup>
        )}

        {activeMode === "code-editor" && (
          <PanelGroup
            key="code-layout"
            orientation="horizontal"
            onLayoutChange={handleCodeLayoutChange}
            className="h-full"
          >
            <Panel id="code-center" defaultSize={`${layout.centerSize}%`} minSize="30%">
              <CenterCanvas />
            </Panel>
            <ResizeHandle />
            <Panel
              id="code-right"
              defaultSize={`${layout.rightSize}%`}
              minSize="15%"
              maxSize="40%"
              className="border-l border-border bg-background"
            >
              <RightPanel projectId={projectId} />
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
}
