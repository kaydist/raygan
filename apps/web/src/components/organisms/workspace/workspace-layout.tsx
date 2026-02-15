"use client";

import { useEffect, useState } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";

import { useUIStore } from "@/stores";

import { ResizeHandle } from "./resize-handle";
import { LayersPanel } from "./layers-panel";
import { ComponentPalette } from "./component-palette";
import { AgentPanel } from "./agent-panel";
import { CenterCanvas } from "./center-canvas";
import { PropertyInspector } from "./property-inspector";
import { StatusBar } from "./status-bar";
import { defaultLayout, LayoutState } from "./constants";

function LeftPanelContent({ layersSize }: { layersSize: number }) {
  const { activeMode } = useUIStore();

  if (activeMode === "agent") {
    return <AgentPanel />;
  }

  return (
    <PanelGroup direction="vertical" className="h-full">
      <Panel defaultSize={layersSize} minSize={30}>
        <LayersPanel />
      </Panel>
      <ResizeHandle orientation="vertical" />
      <Panel defaultSize={100 - layersSize} minSize={20}>
        <ComponentPalette />
      </Panel>
    </PanelGroup>
  );
}

export function WorkspaceLayout() {
  const { isLeftPanelOpen, isRightPanelOpen } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<LayoutState>(defaultLayout);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLayoutChange = (sizes: number[]) => {
    if (sizes.length >= 3) {
      setLayout((prev) => ({
        ...prev,
        leftSize: sizes[0] ?? prev.leftSize,
        centerSize: sizes[1] ?? prev.centerSize,
        rightSize: sizes[2] ?? prev.rightSize,
      }));
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <PanelGroup
          direction="horizontal"
          onLayout={handleLayoutChange}
          className="h-full"
        >
          {isLeftPanelOpen && (
            <>
              <Panel
                defaultSize={layout.leftSize}
                minSize={15}
                maxSize={35}
                className="border-r border-border bg-background"
              >
                <LeftPanelContent layersSize={layout.layersSize} />
              </Panel>
              <ResizeHandle />
            </>
          )}

          <Panel defaultSize={layout.centerSize} minSize={30}>
            <CenterCanvas />
          </Panel>

          {isRightPanelOpen && (
            <>
              <ResizeHandle />
              <Panel
                defaultSize={layout.rightSize}
                minSize={15}
                maxSize={35}
                className="border-l border-border bg-background"
              >
                <PropertyInspector />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      <StatusBar />
    </div>
  );
}
