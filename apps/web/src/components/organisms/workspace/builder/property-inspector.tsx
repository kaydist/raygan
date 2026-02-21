"use client";

import { Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms";

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
}

function PropertySection({ title, children }: PropertySectionProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

interface PropertyInputProps {
  label: string;
  value: string;
  className?: string;
}

function PropertyInput({ label, value, className }: PropertyInputProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <input
        type="text"
        defaultValue={value}
        className="h-7 w-full rounded border border-border bg-background px-2 text-xs"
      />
    </div>
  );
}

function DesignTab() {
  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded border border-primary bg-primary/20" />
        <span className="text-sm font-medium">CaloriesCard</span>
      </div>

      <PropertySection title="Frame">
        <div className="grid grid-cols-2 gap-2">
          <PropertyInput label="X" value="16" />
          <PropertyInput label="Y" value="132" />
          <PropertyInput label="W" value="auto" />
          <PropertyInput label="H" value="auto" />
        </div>
      </PropertySection>

      <PropertySection title="Auto layout">
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" className="h-7 flex-1">↓</Button>
          <Button variant="ghost" size="sm" className="h-7 flex-1">→</Button>
          <Button variant="ghost" size="sm" className="h-7 flex-1">⊞</Button>
        </div>
      </PropertySection>

      <PropertySection title="Padding">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div />
          <PropertyInput label="" value="12" className="text-center" />
          <div />
          <PropertyInput label="" value="12" />
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            content
          </div>
          <PropertyInput label="" value="12" />
          <div />
          <PropertyInput label="" value="12" className="text-center" />
          <div />
        </div>
      </PropertySection>

      <PropertySection title="Fill">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border" style={{ backgroundColor: "#FFF7ED" }} />
          <span className="text-xs">FFF7ED</span>
          <span className="ml-auto text-xs text-muted-foreground">100%</span>
        </div>
      </PropertySection>

      <PropertySection title="Corner radius">
        <PropertyInput label="" value="14" />
      </PropertySection>
    </div>
  );
}

function PreviewTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">SDK 52</span>
        <div className="ml-auto flex gap-1">
          <Button variant="secondary" size="sm" className="h-6 px-2 text-xs">iOS</Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">And</Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">QR</Button>
        </div>
      </div>
      <div className="aspect-[9/16] rounded-lg border border-border bg-[#1a1a1a] p-2">
        <div className="flex h-full items-center justify-center">
          <Smartphone className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i === 1 ? "bg-foreground" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function PropertyInspector() {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="design" className="flex h-full flex-col">
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-muted/30 p-0">
          <TabsTrigger
            value="design"
            className="h-full rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Design
          </TabsTrigger>
          <TabsTrigger
            value="prototype"
            className="h-full rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Prototype
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="h-full rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="design" className="mt-0 flex-1 overflow-auto">
          <DesignTab />
        </TabsContent>
        <TabsContent value="prototype" className="mt-0 flex-1 p-3">
          <p className="text-xs text-muted-foreground">Prototype interactions</p>
        </TabsContent>
        <TabsContent value="preview" className="mt-0 flex-1 p-3">
          <PreviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
