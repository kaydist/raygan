"use client";

import {
  Paintbrush,
  SlidersHorizontal,
  Zap,
  Plus,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger, ScrollArea, Badge } from "@/components/atoms";
import { DisclosureSection } from "@/components/molecules";
import { useUIStore, type PropertyTab } from "@/stores";

interface PropertyRowProps {
  label: string;
  labelWidth?: number;
  children: React.ReactNode;
}

function PropertyRow({ label, labelWidth = 72, children }: PropertyRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span
        className="shrink-0 text-[10px] text-muted-foreground"
        style={{ width: labelWidth }}
      >
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function CompactInput({
  value,
  suffix,
  className,
}: {
  value: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded border border-border bg-muted/30 px-2 py-1",
        className
      )}
    >
      <input
        type="text"
        defaultValue={value}
        className="w-full bg-transparent text-xs text-foreground outline-none"
      />
      {suffix && (
        <span className="ml-1 text-[9px] text-muted-foreground">{suffix}</span>
      )}
    </div>
  );
}

function SpacingControl({ label, values }: { label: string; values: number[] }) {
  return (
    <div className="px-3 py-1.5">
      <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {["T", "R", "B", "L"].map((dir, i) => (
          <div key={dir} className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] text-muted-foreground/60">{dir}</span>
            <input
              defaultValue={values[i]}
              className="w-full rounded border border-border bg-muted/30 px-1 py-0.5 text-center text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FlexPicker({
  label,
  options,
  selected,
}: {
  label: string;
  options: string[];
  selected: string;
}) {
  return (
    <PropertyRow label={label}>
      <div className="flex gap-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            className={cn(
              "rounded border px-1.5 py-0.5 text-xs transition-colors",
              selected === opt
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </PropertyRow>
  );
}

function ColorInput({ label, value }: { label: string; value: string }) {
  return (
    <PropertyRow label={label}>
      <div className="flex items-center gap-2">
        <div
          className="h-5 w-5 shrink-0 rounded border border-border"
          style={{ backgroundColor: value }}
        />
        <input
          defaultValue={value}
          className="flex-1 rounded border border-border bg-muted/30 px-2 py-0.5 text-xs text-foreground outline-none focus:border-primary"
        />
      </div>
    </PropertyRow>
  );
}

interface ActionChainItemProps {
  index: number;
  type: "navigate" | "setState" | "apiCall" | "haptic";
  action: string;
}

function ActionChainItem({ index, type, action }: ActionChainItemProps) {
  const colors = {
    navigate: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      badge: "bg-emerald-500/20",
    },
    setState: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      text: "text-indigo-400",
      badge: "bg-indigo-500/20",
    },
    apiCall: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      badge: "bg-amber-500/20",
    },
    haptic: {
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      text: "text-violet-400",
      badge: "bg-violet-500/20",
    },
  };

  const c = colors[type];

  return (
    <div className="flex items-center gap-1.5 px-3">
      {index > 0 && (
        <div className="flex w-4 justify-center text-muted-foreground/50">
          <ArrowRight className="h-2.5 w-2.5" />
        </div>
      )}
      <div
        className={cn(
          "flex flex-1 items-center gap-2 rounded border px-2 py-1.5",
          c.bg,
          c.border
        )}
      >
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide",
            c.badge,
            c.text
          )}
        >
          {type}
        </span>
        <span className="text-[10px] text-foreground">{action}</span>
      </div>
    </div>
  );
}

function StyleTab() {
  return (
    <ScrollArea className="h-full">
      <DisclosureSection title="Layout" defaultOpen>
        <FlexPicker
          label="Direction"
          options={["row", "column"]}
          selected="row"
        />
        <FlexPicker
          label="Justify"
          options={["start", "center", "end", "between"]}
          selected="center"
        />
        <FlexPicker
          label="Align"
          options={["start", "center", "end", "stretch"]}
          selected="center"
        />
        <PropertyRow label="Flex">
          <div className="flex gap-1">
            <CompactInput value="0" suffix="grow" className="w-14" />
            <CompactInput value="0" suffix="shrink" className="w-14" />
          </div>
        </PropertyRow>
      </DisclosureSection>

      <DisclosureSection title="Size" defaultOpen>
        <PropertyRow label="Width">
          <div className="flex gap-1">
            <CompactInput value="auto" className="flex-1" />
            <select className="rounded border border-border bg-muted/30 px-1 text-[10px] text-muted-foreground outline-none">
              <option>auto</option>
              <option>px</option>
              <option>%</option>
            </select>
          </div>
        </PropertyRow>
        <PropertyRow label="Height">
          <div className="flex gap-1">
            <CompactInput value="44" className="flex-1" />
            <select className="rounded border border-border bg-muted/30 px-1 text-[10px] text-muted-foreground outline-none">
              <option>px</option>
              <option>%</option>
              <option>auto</option>
            </select>
          </div>
        </PropertyRow>
      </DisclosureSection>

      <DisclosureSection title="Spacing" defaultOpen>
        <SpacingControl label="Padding" values={[10, 16, 10, 16]} />
        <SpacingControl label="Margin" values={[0, 0, 0, 0]} />
      </DisclosureSection>

      <DisclosureSection title="Appearance" defaultOpen>
        <ColorInput label="Background" value="#6366f1" />
        <PropertyRow label="Opacity">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="100"
              className="h-1.5 flex-1 appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="w-8 text-right text-[10px] text-muted-foreground">
              100%
            </span>
          </div>
        </PropertyRow>
        <PropertyRow label="Radius">
          <CompactInput value="8" suffix="px" className="w-16" />
        </PropertyRow>
      </DisclosureSection>

      <DisclosureSection title="Border">
        <PropertyRow label="Width">
          <CompactInput value="0" suffix="px" className="w-16" />
        </PropertyRow>
        <ColorInput label="Color" value="#e0e0e0" />
      </DisclosureSection>

      <DisclosureSection title="Shadow">
        <ColorInput label="Color" value="rgba(0,0,0,0.1)" />
        <PropertyRow label="Offset">
          <div className="flex gap-1">
            <CompactInput value="0" suffix="x" className="w-12" />
            <CompactInput value="2" suffix="y" className="w-12" />
          </div>
        </PropertyRow>
        <PropertyRow label="Blur">
          <CompactInput value="4" suffix="px" className="w-16" />
        </PropertyRow>
      </DisclosureSection>
    </ScrollArea>
  );
}

function PropsTab() {
  return (
    <ScrollArea className="h-full">
      <DisclosureSection title="Component Props" defaultOpen>
        <PropertyRow label="onPress">
          <div className="cursor-pointer rounded border border-primary/20 bg-primary/5 px-2 py-1 text-xs text-primary">
            → addTodo()
          </div>
        </PropertyRow>
        <PropertyRow label="disabled">
          <div className="flex items-center gap-2">
            <div className="relative h-4 w-7 cursor-pointer rounded-full bg-muted">
              <div className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-muted-foreground transition-transform" />
            </div>
            <span className="text-[10px] text-muted-foreground">false</span>
          </div>
        </PropertyRow>
        <PropertyRow label="activeOpacity">
          <CompactInput value="0.7" className="w-16" />
        </PropertyRow>
        <PropertyRow label="hitSlop">
          <CompactInput value="{ top: 8, bottom: 8, left: 8, right: 8 }" />
        </PropertyRow>
      </DisclosureSection>

      <DisclosureSection title="Children" defaultOpen>
        <PropertyRow label="text">
          <CompactInput value='"Add"' />
        </PropertyRow>
        <PropertyRow label="style">
          <div className="cursor-pointer text-xs text-primary">
            → styles.buttonText
          </div>
        </PropertyRow>
      </DisclosureSection>

      <DisclosureSection title="Accessibility">
        <PropertyRow label="accessibilityLabel">
          <CompactInput value='"Add todo"' />
        </PropertyRow>
        <PropertyRow label="accessibilityRole">
          <CompactInput value='"button"' />
        </PropertyRow>
      </DisclosureSection>
    </ScrollArea>
  );
}

function EventsTab() {
  return (
    <ScrollArea className="h-full">
      <DisclosureSection title="onPress" defaultOpen>
        <div className="flex flex-col gap-1.5 py-1">
          <ActionChainItem index={0} type="setState" action="loading → true" />
          <ActionChainItem index={1} type="apiCall" action="addTodo(text)" />
          <ActionChainItem index={2} type="setState" action="loading → false" />
          <ActionChainItem index={3} type="haptic" action="success" />
        </div>
        <div className="mx-3 mt-2 border-t border-dashed border-border/50 pt-2">
          <button className="flex w-full items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
            <Plus className="h-2.5 w-2.5" />
            Add Action
          </button>
        </div>
      </DisclosureSection>

      <DisclosureSection title="onLongPress">
        <div className="px-3 py-2 text-[10px] text-muted-foreground">
          No actions configured
        </div>
      </DisclosureSection>

      <div className="m-3">
        <button className="w-full rounded border border-dashed border-primary/30 bg-primary/5 py-2 text-center text-[10px] text-primary hover:border-primary/50 hover:bg-primary/10">
          + Add Event Handler
        </button>
      </div>
    </ScrollArea>
  );
}

export function BuilderInspector() {
  const { propertyTab, setPropertyTab } = useUIStore();

  const selectedNode = {
    type: "Pressable",
    name: '"Add"',
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <Tabs
        value={propertyTab}
        onValueChange={(v) => setPropertyTab(v as PropertyTab)}
        className="flex h-full flex-col"
      >
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-muted/30 p-0">
          <TabsTrigger
            value="style"
            className="h-full flex-1 gap-1 rounded-none border-b-2 border-transparent text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Paintbrush className="h-3 w-3" />
            Style
          </TabsTrigger>
          <TabsTrigger
            value="props"
            className="h-full flex-1 gap-1 rounded-none border-b-2 border-transparent text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Props
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="h-full flex-1 gap-1 rounded-none border-b-2 border-transparent text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Zap className="h-3 w-3" />
            Events
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
          <Badge
            variant="outline"
            className="border-orange-500/30 bg-orange-500/10 text-xs text-orange-400"
          >
            {selectedNode.type}
          </Badge>
          <span className="text-xs text-foreground">
            {selectedNode.name}
          </span>
        </div>

        <TabsContent value="style" className="mt-0 flex-1 overflow-hidden">
          <StyleTab />
        </TabsContent>
        <TabsContent value="props" className="mt-0 flex-1 overflow-hidden">
          <PropsTab />
        </TabsContent>
        <TabsContent value="events" className="mt-0 flex-1 overflow-hidden">
          <EventsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
