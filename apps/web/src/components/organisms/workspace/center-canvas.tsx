"use client";

import { Code, Blocks } from "lucide-react";

import { useUIStore } from "@/stores";
import { Button } from "@/components/atoms";

export function CenterCanvas() {
  const { activeMode } = useUIStore();

  return (
    <div className="flex h-full flex-col bg-[#1a1a1a]">
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="relative">
          <div className="h-[600px] w-[300px] overflow-hidden rounded-[32px] border-4 border-[#333] bg-white shadow-2xl">
            <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
              <div className="rounded-full bg-muted p-4">
                {activeMode === "builder" ? (
                  <Blocks className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Code className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {activeMode === "builder" ? "Visual Builder" : "Code Editor"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeMode === "builder"
                    ? "Drag components to build your UI"
                    : "Edit React Native code"}
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
