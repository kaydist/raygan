"use client";

import { Blocks, Component } from "lucide-react";

import { PanelHeader } from "../panel-header";

const components = [
  { name: "View", icon: Blocks },
  { name: "Text", icon: Blocks },
  { name: "Image", icon: Blocks },
  { name: "Button", icon: Blocks },
  { name: "Input", icon: Blocks },
  { name: "Scroll", icon: Blocks },
];

export function ComponentPalette() {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Components" icon={Component} />
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-3 gap-1">
          {components.map((comp) => (
            <button
              key={comp.name}
              className="flex flex-col items-center gap-1 rounded border border-border bg-background p-2 text-xs hover:bg-muted"
            >
              <comp.icon className="h-4 w-4 text-muted-foreground" />
              <span>{comp.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
