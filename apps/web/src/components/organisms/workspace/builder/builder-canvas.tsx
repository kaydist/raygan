"use client";

import { useState, useCallback } from "react";
import { MousePointer2, Hand, Type, Square, Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms";
import { useUIStore } from "@/stores";

type Tool = "select" | "hand" | "text" | "box";

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  notchWidth?: number;
}

const DEVICES: Record<string, DeviceConfig> = {
  iphone15: { name: "iPhone 15 Pro", width: 290, height: 590, notchWidth: 80 },
  iphoneSE: { name: "iPhone SE", width: 260, height: 540 },
  pixel8: { name: "Pixel 8", width: 280, height: 600, notchWidth: 24 },
  ipadMini: { name: "iPad Mini", width: 380, height: 520 },
};

const TOOLS: {
  id: Tool;
  icon: React.ElementType;
  label: string;
  shortcut: string;
}[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "hand", icon: Hand, label: "Pan", shortcut: "H" },
  { id: "text", icon: Type, label: "Insert Text", shortcut: "T" },
  { id: "box", icon: Square, label: "Insert View", shortcut: "R" },
];

function ToolButton({
  tool,
  isActive,
  onClick,
}: {
  tool: (typeof TOOLS)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  return (
    <button
      onClick={onClick}
      title={`${tool.label} (${tool.shortcut})`}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function DeviceFrame({ device, zoom }: { device: DeviceConfig; zoom: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-[32px] border-4 border-[#333] bg-white shadow-2xl"
      style={{
        width: device.width,
        height: device.height,
        transform: `scale(${zoom / 100})`,
        transition: "transform 0.2s ease",
      }}
    >
      {device.notchWidth && (
        <div className="flex h-11 items-end justify-center bg-white pb-1.5">
          <div
            className="h-6 rounded-full bg-black"
            style={{ width: device.notchWidth }}
          />
        </div>
      )}

      <div
        className="p-4"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        <div className="mb-3 text-[22px] font-bold text-[#111]">My Todos</div>

        <div className="mb-4 flex gap-2">
          <div className="flex-1 rounded-lg border border-[#e0e0e0] px-3 py-2.5 text-[13px] text-[#999]">
            What needs to be done?
          </div>
          <div className="relative cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white outline outline-2 outline-offset-2 outline-primary/60">
            Add
            <div className="absolute -left-1 -top-1 h-1.5 w-1.5 rounded-sm border-[1.5px] border-primary bg-white" />
            <div className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-sm border-[1.5px] border-primary bg-white" />
            <div className="absolute -bottom-1 -left-1 h-1.5 w-1.5 rounded-sm border-[1.5px] border-primary bg-white" />
            <div className="absolute -bottom-1 -right-1 h-1.5 w-1.5 rounded-sm border-[1.5px] border-primary bg-white" />
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center text-center text-[#999]">
          <div className="mb-2 text-4xl">📝</div>
          <div className="text-[15px] font-semibold text-[#555]">No todos yet</div>
          <div className="mt-1 text-xs">
            Add your first todo above to get started
          </div>
        </div>
      </div>

      <div className="absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-gray-300" />
    </div>
  );
}

export function BuilderCanvas() {
  const [selectedTool, setSelectedTool] = useState<Tool>("select");
  const [deviceType, setDeviceType] = useState("iphone15");
  const { canvasZoom, setCanvasZoom } = useUIStore();

  const zoom = Math.round(canvasZoom * 100);
  const device = DEVICES[deviceType] ?? DEVICES.iphone15!;

  const handleZoomIn = useCallback(() => {
    setCanvasZoom(Math.min(2, canvasZoom + 0.1));
  }, [canvasZoom, setCanvasZoom]);

  const handleZoomOut = useCallback(() => {
    setCanvasZoom(Math.max(0.25, canvasZoom - 0.1));
  }, [canvasZoom, setCanvasZoom]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const component = e.dataTransfer.getData("component");
    if (component) {
      // TODO: Add component to AST at drop position
      console.log("Dropped component:", component);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="flex h-full flex-col ">
      <div className="flex h-9 items-center gap-2 border-b border-border/30  px-3">
        <div className="flex gap-0.5 rounded-md bg-muted/30 p-0.5">
          {TOOLS.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isActive={selectedTool === tool.id}
              onClick={() => setSelectedTool(tool.id)}
            />
          ))}
        </div>

        <div className="flex-1" />

        <Select value={deviceType} onValueChange={setDeviceType}>
          <SelectTrigger className="h-7 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DEVICES).map(([key, device]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {device.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleZoomOut}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-10 text-center text-xs text-muted-foreground">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleZoomIn}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--muted)/0.3) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <DeviceFrame device={device} zoom={zoom} />

        <div
          className="pointer-events-none absolute border-t border-dashed border-primary/40"
          style={{
            top: "calc(50% - 112px)",
            left: "calc(50% + 92px)",
            width: 40,
          }}
        />
        <div
          className="pointer-events-none absolute rounded bg-primary/15 px-1 text-xs text-primary"
          style={{
            top: "calc(50% - 118px)",
            left: "calc(50% + 132px)",
          }}
        >
          8px
        </div>
      </div>
    </div>
  );
}
