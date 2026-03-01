"use client";

import { useState, useRef, useCallback } from "react";
import type { DragEvent, ChangeEvent } from "react";
import {
  Settings,
  Plus,
  Trash2,
  Upload,
  Sparkles,
  ClipboardCopy,
  Image as ImageIcon,
  X,
} from "lucide-react";

import { useUIStore, useProjectStore } from "@/stores";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  FormField,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  ScrollArea,
  Textarea,
} from "@/components/atoms";
import { cn } from "@/lib/utils";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface EnvVariable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface AppConfig {
  name: string;
  slug: string;
  version: string;
  sdkVersion: string;
  orientation: string;
  iconPreview: string | null;
  splashPreview: string | null;
  scheme: string;
  bundleIdentifier: string;
  packageName: string;
}

interface ImageUploadProps {
  label: string;
  preview: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  description: string;
  id: string;
}

function ImageUpload({
  label,
  preview,
  onFileSelect,
  onClear,
  description,
  id,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return;
      if (file.size > MAX_FILE_SIZE) return;
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  return (
    <FormField id={id} label={label} description={description}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-4 transition-colors sm:flex-row sm:gap-4",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        {preview ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
            <img
              src={preview}
              alt={label}
              className="h-full w-full object-cover"
            />
            <button
              onClick={onClear}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              {preview ? "Change" : "Upload"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              <Sparkles className="h-3 w-3" />
              Generate
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Drag & drop or click to upload
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </FormField>
  );
}

function GeneralTab() {
  const currentProject = useProjectStore((s) => s.currentProject);

  const [config, setConfig] = useState<AppConfig>({
    name: currentProject?.name ?? "My App",
    slug: currentProject?.slug ?? "my-app",
    version: "1.0.0",
    sdkVersion: currentProject?.framework_version ?? "51.0.0",
    orientation: "portrait",
    iconPreview: null,
    splashPreview: null,
    scheme: currentProject?.slug ?? "",
    bundleIdentifier: "",
    packageName: "",
  });

  const updateField = (field: keyof AppConfig, value: string | null) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect =
    (field: "iconPreview" | "splashPreview") => (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateField(field, e.target?.result as string);
      };
      reader.readAsDataURL(file);
    };

  return (
    <ScrollArea className="h-[min(420px,60vh)]">
      <div className="flex flex-col gap-5 p-1 pr-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            id="project-name"
            label="Project Name"
            description="Used in App Store and Play Store."
          >
            <Input
              id="project-name"
              value={config.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="h-8 text-sm"
              placeholder="My App"
            />
          </FormField>

          <FormField
            id="project-slug"
            label="Project URL Slug"
            description="Used as a unique project identifier"
          >
            <Input
              id="project-slug"
              value={config.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="h-8 text-sm"
              placeholder="my-app"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            id="ios-bundle"
            label="iOS Bundle Identifier"
            description="Unique id for your iOS app (App Store)."
          >
            <Input
              id="ios-bundle"
              value={config.bundleIdentifier}
              onChange={(e) => updateField("bundleIdentifier", e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="com.example.myapp"
            />
          </FormField>

          <FormField
            id="android-package"
            label="Android Package Name"
            description="Unique id for your Android app (Play Store)."
          >
            <Input
              id="android-package"
              value={config.packageName}
              onChange={(e) => updateField("packageName", e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="com.example.myapp"
            />
          </FormField>
        </div>

        <Separator />

        <ImageUpload
          id="app-icon"
          label="App Icon"
          preview={config.iconPreview}
          onFileSelect={handleImageSelect("iconPreview")}
          onClear={() => updateField("iconPreview", null)}
          description="Auto-resized to 1024px to fit iOS & Android requirements."
        />

        <ImageUpload
          id="splash-screen"
          label="Splash Screen"
          preview={config.splashPreview}
          onFileSelect={handleImageSelect("splashPreview")}
          onClear={() => updateField("splashPreview", null)}
          description="Recommended size: 1284x2778px. Displayed during app launch."
        />

        <Separator />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField id="app-version" label="Version">
            <Input
              id="app-version"
              value={config.version}
              onChange={(e) => updateField("version", e.target.value)}
              className="h-8 text-sm"
              placeholder="1.0.0"
            />
          </FormField>

          <FormField id="orientation" label="Orientation">
            <Select
              value={config.orientation}
              onValueChange={(v) => updateField("orientation", v)}
            >
              <SelectTrigger id="orientation" className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
                <SelectItem value="default">Default</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <FormField
          id="url-scheme"
          label="URL Scheme"
          description="Deep linking scheme (e.g. myapp://)"
        >
          <Input
            id="url-scheme"
            value={config.scheme}
            onChange={(e) => updateField("scheme", e.target.value)}
            className="h-8 text-sm"
            placeholder="myapp"
          />
        </FormField>

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Archive Project</span>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-xs text-muted-foreground">
              Archiving hides the project from your dashboard. You can restore it later.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full shrink-0 text-xs sm:w-auto"
            >
              Archive
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-destructive">
            Delete Project
          </span>
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-xs text-muted-foreground">
              This action is not reversible and deletes all data associated with
              the project.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full shrink-0 text-xs sm:w-auto"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function variablesToBulkText(vars: EnvVariable[]): string {
  return vars.map((v) => `${v.key}=${v.value}`).join("\n");
}

function bulkTextToVariables(text: string): EnvVariable[] {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const eqIndex = line.indexOf("=");
      const key = eqIndex === -1 ? line.trim() : line.slice(0, eqIndex).trim();
      const value = eqIndex === -1 ? "" : line.slice(eqIndex + 1).trim();
      return { id: crypto.randomUUID(), key, value, isSecret: false };
    });
}

function EnvVariablesTab() {
  const [variables, setVariables] = useState<EnvVariable[]>([
    { id: "1", key: "", value: "", isSecret: false },
    { id: "2", key: "", value: "", isSecret: false },
  ]);
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const addVariable = () => {
    const id = crypto.randomUUID();
    setVariables((prev) => [
      ...prev,
      { id, key: "", value: "", isSecret: false },
    ]);
  };

  const removeVariable = (id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariable = (
    id: string,
    field: keyof EnvVariable,
    value: string | boolean,
  ) => {
    setVariables((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  };

  const enterBulkEdit = () => {
    setBulkText(variablesToBulkText(variables));
    setIsBulkEdit(true);
  };

  const saveBulkEdit = () => {
    setVariables(bulkTextToVariables(bulkText));
    setIsBulkEdit(false);
  };

  if (isBulkEdit) {
    return (
      <div className="flex h-[min(420px,60vh)] flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Bulk Edit Environment Variables</span>
          <button
            onClick={() => setIsBulkEdit(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={"KEY=value\nANOTHER_KEY=another_value"}
          className="min-h-0 flex-1 resize-none bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-300 placeholder:text-zinc-600"
        />
        <div className="flex justify-end">
          <Button size="sm" className="h-8 text-xs" onClick={saveBulkEdit}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[min(420px,60vh)] flex-col">
      <div className="flex items-center justify-end pb-3">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={enterBulkEdit}>
          <ClipboardCopy className="h-3.5 w-3.5" />
          Bulk Edit
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0 rounded-lg border border-border">
          <div className="hidden grid-cols-[1fr_1fr_40px] gap-2 border-b border-border bg-muted/40 px-3 py-2 sm:grid">
            <span className="text-xs font-medium text-muted-foreground">Key</span>
            <span className="text-xs font-medium text-muted-foreground">Value</span>
            <span />
          </div>

          {variables.map((variable) => (
            <div
              key={variable.id}
              className="border-b border-border last:border-b-0"
            >
              <div className="grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-[1fr_1fr_40px] sm:items-center">
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground sm:hidden">Key</span>
                  <Input
                    value={variable.key}
                    onChange={(e) =>
                      updateVariable(variable.id, "key", e.target.value)
                    }
                    className="h-8 font-mono text-xs"
                    placeholder="VARIABLE_KEY"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground sm:hidden">Value</span>
                  <Input
                    value={variable.value}
                    onChange={(e) =>
                      updateVariable(variable.id, "value", e.target.value)
                    }
                    className="h-8 font-mono text-xs"
                    placeholder="value"
                  />
                </div>
                <div className="flex items-center justify-end sm:justify-center">
                  <button
                    onClick={() => removeVariable(variable.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="px-3 pb-2 text-[10px] text-muted-foreground">Server-side only</p>
            </div>
          ))}

          <button
            onClick={addVariable}
            className="flex w-full items-center justify-center gap-2 border-t border-dashed border-border py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Variable
          </button>
        </div>

        <p className="px-1 pt-3 text-[10px] text-muted-foreground">
          Prefix with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            EXPO_PUBLIC_
          </code>{" "}
          to make a variable available on the client-side.
        </p>
      </ScrollArea>
    </div>
  );
}

export function ProjectConfigModal() {
  const { modals, closeModal } = useUIStore();
  const isOpen = modals.projectConfig.isOpen;
  const modalData = modals.projectConfig.data as { tab?: string } | undefined;
  const defaultTab = modalData?.tab === "env" ? "env" : "general";

  return (
    <Dialog open={isOpen} onOpenChange={() => closeModal("projectConfig")}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Configuration
          </DialogTitle>
          <DialogDescription>
            Manage app.json, environment variables, and build settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs key={defaultTab} defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1 text-xs">
              General
            </TabsTrigger>
            <TabsTrigger value="env" className="flex-1 text-xs">
              Environment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab />
          </TabsContent>
          <TabsContent value="env">
            <EnvVariablesTab />
          </TabsContent>
        </Tabs>

        <Button className="w-full">Save Changes</Button>
      </DialogContent>
    </Dialog>
  );
}
