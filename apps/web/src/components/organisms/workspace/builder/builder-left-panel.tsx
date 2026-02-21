"use client";

import { useState, useMemo } from "react";
import {
  Grid3X3,
  Layers,
  Smartphone,
  Image,
  Search,
  ChevronRight,
  Eye,
  Plus,
  Upload,
  Square,
  Type,
  ToggleLeft,
  Loader2,
  List,
  LayoutGrid,
  Navigation,
  AlertCircle,
  Palette,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, Tabs, TabsContent, TabsList, TabsTrigger, ScrollArea } from "@/components/atoms";
import { DisclosureSection } from "@/components/molecules";
import { useUIStore } from "@/stores";

type LeftPanelTab = "components" | "layers" | "screens" | "assets";

interface ComponentCategory {
  name: string;
  components: ComponentItem[];
}

interface ComponentItem {
  name: string;
  icon: React.ElementType;
}

interface LayerNode {
  id: string;
  name: string;
  type: string;
  expanded?: boolean;
  children: LayerNode[];
}

interface Screen {
  id: string;
  name: string;
  active: boolean;
}

const COMPONENT_CATEGORIES: ComponentCategory[] = [
  {
    name: "Layout",
    components: [
      { name: "View", icon: Square },
      { name: "SafeAreaView", icon: Square },
      { name: "ScrollView", icon: List },
      { name: "KeyboardAvoidView", icon: Square },
    ],
  },
  {
    name: "Core",
    components: [
      { name: "Text", icon: Type },
      { name: "Image", icon: Image },
      { name: "TextInput", icon: Square },
      { name: "Pressable", icon: Square },
      { name: "TouchableOpacity", icon: Square },
      { name: "Switch", icon: ToggleLeft },
      { name: "ActivityIndicator", icon: Loader2 },
    ],
  },
  {
    name: "Lists",
    components: [
      { name: "FlatList", icon: List },
      { name: "SectionList", icon: List },
    ],
  },
  {
    name: "Navigation",
    components: [
      { name: "Stack Navigator", icon: Navigation },
      { name: "Tab Navigator", icon: LayoutGrid },
      { name: "Drawer Navigator", icon: List },
    ],
  },
  {
    name: "Forms",
    components: [
      { name: "TextInput", icon: Square },
      { name: "Switch", icon: ToggleLeft },
      { name: "Picker", icon: List },
      { name: "Slider", icon: Square },
      { name: "DateTimePicker", icon: Square },
    ],
  },
  {
    name: "Feedback",
    components: [
      { name: "Modal", icon: Square },
      { name: "Alert", icon: AlertCircle },
      { name: "BottomSheet", icon: Square },
    ],
  },
  {
    name: "Expo",
    components: [
      { name: "LinearGradient", icon: Palette },
      { name: "BlurView", icon: Square },
      { name: "MapView", icon: Square },
      { name: "Camera", icon: Square },
      { name: "WebView", icon: Square },
    ],
  },
];

const MOCK_LAYERS: LayerNode[] = [
  {
    id: "1",
    name: "SafeAreaView",
    type: "SafeAreaView",
    expanded: true,
    children: [
      {
        id: "2",
        name: "View (header)",
        type: "View",
        expanded: true,
        children: [
          { id: "3", name: '"My Todos"', type: "Text", children: [] },
          {
            id: "4",
            name: "View (inputRow)",
            type: "View",
            expanded: true,
            children: [
              { id: "5", name: "TextInput", type: "TextInput", children: [] },
              { id: "6", name: '"Add"', type: "Pressable", children: [] },
            ],
          },
        ],
      },
      {
        id: "7",
        name: "FlatList (todos)",
        type: "FlatList",
        expanded: false,
        children: [{ id: "8", name: "TodoItem", type: "Custom", children: [] }],
      },
      {
        id: "9",
        name: "View (empty)",
        type: "View",
        expanded: true,
        children: [
          { id: "10", name: "Image (emoji)", type: "Image", children: [] },
          { id: "11", name: '"No todos yet"', type: "Text", children: [] },
          { id: "12", name: '"Add your first..."', type: "Text", children: [] },
        ],
      },
    ],
  },
];

const MOCK_SCREENS: Screen[] = [
  { id: "s1", name: "HomeScreen", active: true },
  { id: "s2", name: "DetailScreen", active: false },
  { id: "s3", name: "SettingsScreen", active: false },
];

const TYPE_COLORS: Record<string, string> = {
  Text: "bg-amber-500",
  View: "bg-indigo-500",
  SafeAreaView: "bg-indigo-500",
  FlatList: "bg-emerald-500",
  TextInput: "bg-pink-500",
  Pressable: "bg-orange-500",
  Image: "bg-violet-500",
  Custom: "bg-cyan-500",
};

function DraggableComponent({ name, icon: Icon }: ComponentItem) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("component", name);
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary/5",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <span>{name}</span>
    </div>
  );
}

interface LayerItemProps {
  node: LayerNode;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function LayerItem({ node, depth = 0, selectedId, onSelect }: LayerItemProps) {
  const { expandedTreeNodes, toggleTreeNode } = useUIStore();
  const isExpanded = expandedTreeNodes.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  const typeColor = TYPE_COLORS[node.type] || "bg-indigo-500";

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          "group flex cursor-pointer items-center gap-1 border-l-2 py-0.5 pr-2 text-xs transition-colors",
          isSelected
            ? "border-primary bg-primary/10 text-foreground"
            : "border-transparent text-muted-foreground hover:bg-muted/30"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTreeNode(node.id);
            }}
            className="flex h-3.5 w-3.5 items-center justify-center text-muted-foreground/60"
          >
            <ChevronRight
              className={cn(
                "h-2.5 w-2.5 transition-transform duration-150",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-sm opacity-80", typeColor)} />
        <span className="flex-1 truncate">{node.name}</span>
        <span className="opacity-0 group-hover:opacity-100">
          <Eye className="h-2.5 w-2.5 text-muted-foreground/60" />
        </span>
      </div>
      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <LayerItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

function ComponentsTab() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return COMPONENT_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return COMPONENT_CATEGORIES.map((cat) => ({
      ...cat,
      components: cat.components.filter((c) => c.name.toLowerCase().includes(q)),
    })).filter((cat) => cat.components.length > 0);
  }, [searchQuery]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredCategories.map((cat) => (
          <DisclosureSection
            key={cat.name}
            title={cat.name}
            defaultOpen={cat.name === "Core" || cat.name === "Layout"}
            count={cat.components.length}
          >
            {cat.components.map((comp) => (
              <DraggableComponent key={comp.name} {...comp} />
            ))}
          </DisclosureSection>
        ))}
      </ScrollArea>
    </div>
  );
}

function LayersTab() {
  const [selectedId, setSelectedId] = useState<string | null>("6");

  return (
    <ScrollArea className="h-full">
      <div className="py-1">
        {MOCK_LAYERS.map((node) => (
          <LayerItem
            key={node.id}
            node={node}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function ScreensTab() {
  const [screens, setScreens] = useState(MOCK_SCREENS);

  const handleScreenClick = (id: string) => {
    setScreens((prev) =>
      prev.map((s) => ({ ...s, active: s.id === id }))
    );
  };

  return (
    <div className="p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Screens
        </span>
        <button className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20">
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-0.5">
        {screens.map((screen) => (
          <div
            key={screen.id}
            onClick={() => handleScreenClick(screen.id)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded border-l-2 px-2 py-1.5",
              screen.active
                ? "border-primary bg-primary/10"
                : "border-transparent hover:bg-muted/30"
            )}
          >
            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
            <span
              className={cn(
                "text-xs",
                screen.active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {screen.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetsTab() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50">
        <Upload className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Drop images here or click to upload
        </p>
      </div>
      <button className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
        Browse Files
      </button>
    </div>
  );
}

export function BuilderLeftPanel() {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>("components");

  return (
    <div className="flex h-full flex-col bg-background">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as LeftPanelTab)}
        className="flex h-full flex-col"
      >
        <TabsList className="h-9 w-full justify-start gap-0 rounded-none border-b bg-muted/30 p-0">
          <TabsTrigger
            value="components"
            className="h-full flex-1 gap-1 rounded-none border-b-2 border-transparent px-0 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            title="Components"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger
            value="layers"
            className="h-full flex-1 gap-1 rounded-none border-b-2 border-transparent px-0 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            title="Layers"
          >
            <Layers className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger
            value="screens"
            className="h-full flex-1 gap-1 rounded-none border-b-2 border-transparent px-0 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            title="Screens"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger
            value="assets"
            className="h-full flex-1 gap-1 rounded-none border-b-2 border-transparent px-0 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            title="Assets"
          >
            <Image className="h-3.5 w-3.5" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="mt-0 flex-1 overflow-hidden">
          <ComponentsTab />
        </TabsContent>
        <TabsContent value="layers" className="mt-0 flex-1 overflow-hidden">
          <LayersTab />
        </TabsContent>
        <TabsContent value="screens" className="mt-0 flex-1 overflow-hidden">
          <ScreensTab />
        </TabsContent>
        <TabsContent value="assets" className="mt-0 flex-1 overflow-hidden">
          <AssetsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
