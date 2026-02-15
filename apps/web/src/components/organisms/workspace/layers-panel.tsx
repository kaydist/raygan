"use client";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms";

interface LayerItemProps {
  label: string;
  depth: number;
  hasChildren?: boolean;
  isSelected?: boolean;
}

function LayerItem({ label, depth, isSelected }: LayerItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 hover:bg-muted",
        isSelected && "bg-primary/10 text-primary"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <div
        className={cn(
          "h-3 w-3 rounded-sm border",
          isSelected ? "border-primary bg-primary/20" : "border-muted-foreground/30"
        )}
      />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function LayersPanel() {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="layers" className="flex h-full flex-col">
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-muted/30 p-0">
          <TabsTrigger
            value="layers"
            className="h-full rounded-none border-b-2 border-transparent px-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Layers
          </TabsTrigger>
          <TabsTrigger
            value="assets"
            className="h-full rounded-none border-b-2 border-transparent px-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Assets
          </TabsTrigger>
        </TabsList>
        <TabsContent value="layers" className="mt-0 flex-1 overflow-auto p-2">
          <div className="space-y-0.5 text-xs">
            <LayerItem label="App" depth={0} hasChildren />
            <LayerItem label="HomeScreen" depth={1} hasChildren />
            <LayerItem label="Header" depth={2} hasChildren />
            <LayerItem label="UserAvatar" depth={3} />
            <LayerItem label="GreetingText" depth={3} />
            <LayerItem label="StatsRow" depth={2} hasChildren />
            <LayerItem label="CaloriesCard" depth={3} isSelected />
            <LayerItem label="StepsCard" depth={3} />
            <LayerItem label="WaterCard" depth={3} />
          </div>
        </TabsContent>
        <TabsContent value="assets" className="mt-0 flex-1 p-2">
          <p className="text-xs text-muted-foreground">Assets library</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
