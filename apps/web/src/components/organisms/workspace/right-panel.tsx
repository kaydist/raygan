"use client";

import dynamic from "next/dynamic";
import { Eye, Settings2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms";
import { useUIStore, type RightPanelMode } from "@/stores";
import { PropertyInspector } from "./property-inspector";

const PreviewPanel = dynamic(
  () => import("./preview-panel").then((mod) => mod.PreviewPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

interface RightPanelProps {
  projectId: string;
}

export function RightPanel({ projectId }: RightPanelProps) {
  const mode = useUIStore((s) => s.rightPanelMode);
  const setMode = useUIStore((s) => s.setRightPanelMode);

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as RightPanelMode)}
        className="flex h-full flex-col"
      >
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-muted/30 p-0">
          <TabsTrigger
            value="preview"
            className="h-full gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </TabsTrigger>
          <TabsTrigger
            value="inspector"
            className="h-full gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Inspector
          </TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="mt-0 flex-1 overflow-hidden">
          <PreviewPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="inspector" className="mt-0 flex-1 overflow-auto">
          <PropertyInspector />
        </TabsContent>
      </Tabs>
    </div>
  );
}
