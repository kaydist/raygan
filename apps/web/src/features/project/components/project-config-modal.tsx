"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Plus,
  Trash2,
  ClipboardCopy,
  X,
  Loader2,
  Wrench,
  ExternalLink,
} from "lucide-react";
import type { ProjectAppConfig, ProjectEnvVariable, ProjectSettings, ProjectBuildConfig } from "@raygan/shared";

import { useUIStore, useProjectStore } from "@/stores";
import {
  useUpdateProject,
  useArchiveProject,
  useUnarchiveProject,
  useDeleteProject,
} from "@/lib/api/queries";
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
import { ImageUpload } from "@/components/molecules";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  isDeleting: boolean;
}

function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  isDeleting,
}: DeleteConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const isMatch = confirmText === projectName;

  useEffect(() => {
    if (isOpen) setConfirmText("");
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Project</DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. All project data,
            files, builds, and environment variables will be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-muted-foreground">
            Type <span className="font-semibold text-foreground">{projectName}</span> to confirm.
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={projectName}
            className="h-9 text-sm"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={!isMatch || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Delete Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

interface GeneralTabProps {
  config: AppConfig;
  onUpdateField: (field: keyof AppConfig, value: string | null) => void;
  onArchive: () => void;
  onDelete: () => void;
  isArchiving: boolean;
  isDeleting: boolean;
  isArchived: boolean;
  projectName: string;
}

function GeneralTab({
  config,
  onUpdateField,
  onArchive,
  onDelete,
  isArchiving,
  isDeleting,
  isArchived,
  projectName,
}: GeneralTabProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const handleImageSelect =
    (field: "iconPreview" | "splashPreview") => (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        onUpdateField(field, e.target?.result as string);
      };
      reader.readAsDataURL(file);
    };

  return (
    <>
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
              onChange={(e) => onUpdateField("name", e.target.value)}
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
              onChange={(e) => onUpdateField("slug", e.target.value)}
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
              onChange={(e) => onUpdateField("bundleIdentifier", e.target.value)}
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
              onChange={(e) => onUpdateField("packageName", e.target.value)}
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
          onClear={() => onUpdateField("iconPreview", null)}
          description="Auto-resized to 1024px to fit iOS & Android requirements."
        />

        <ImageUpload
          id="splash-screen"
          label="Splash Screen"
          preview={config.splashPreview}
          onFileSelect={handleImageSelect("splashPreview")}
          onClear={() => onUpdateField("splashPreview", null)}
          description="Recommended size: 1284x2778px. Displayed during app launch."
        />

        <Separator />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField id="app-version" label="Version">
            <Input
              id="app-version"
              value={config.version}
              onChange={(e) => onUpdateField("version", e.target.value)}
              className="h-8 text-sm"
              placeholder="1.0.0"
            />
          </FormField>

          <FormField id="orientation" label="Orientation">
            <Select
              value={config.orientation}
              onValueChange={(v) => onUpdateField("orientation", v)}
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
            onChange={(e) => onUpdateField("scheme", e.target.value)}
            className="h-8 text-sm"
            placeholder="myapp"
          />
        </FormField>

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Archive Project</span>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-xs text-muted-foreground">
              {isArchived
                ? "This project is archived. Unarchive to restore it to your dashboard."
                : "Archiving hides the project from your dashboard. You can restore it later."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full shrink-0 text-xs sm:w-auto"
              onClick={onArchive}
              disabled={isArchiving}
            >
              {isArchiving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              {isArchived ? "Unarchive" : "Archive"}
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
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>

    <DeleteConfirmDialog
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={onDelete}
      projectName={projectName}
      isDeleting={isDeleting}
    />
    </>
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

interface EnvVariablesTabProps {
  variables: EnvVariable[];
  onSetVariables: (vars: EnvVariable[]) => void;
}

function EnvVariablesTab({ variables, onSetVariables }: EnvVariablesTabProps) {
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const addVariable = () => {
    const id = crypto.randomUUID();
    onSetVariables([...variables, { id, key: "", value: "", isSecret: false }]);
  };

  const removeVariable = (id: string) => {
    onSetVariables(variables.filter((v) => v.id !== id));
  };

  const updateVariable = (
    id: string,
    field: keyof EnvVariable,
    value: string | boolean,
  ) => {
    onSetVariables(
      variables.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  };

  const enterBulkEdit = () => {
    setBulkText(variablesToBulkText(variables));
    setIsBulkEdit(true);
  };

  const handleBulkChange = (text: string) => {
    setBulkText(text);
    onSetVariables(bulkTextToVariables(text));
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
          onChange={(e) => handleBulkChange(e.target.value)}
          placeholder={"KEY=value\nANOTHER_KEY=another_value"}
          className="min-h-0 flex-1 resize-none bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-300 placeholder:text-zinc-600"
        />
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
              {!variable.key.startsWith("EXPO_PUBLIC_") && variable.key.length > 0 && (
                <p className="px-3 pb-2 text-[10px] text-muted-foreground">Server-side only</p>
              )}
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

interface BuildConfigTabProps {
  buildConfig: ProjectBuildConfig;
  onUpdate: (config: ProjectBuildConfig) => void;
}

function BuildConfigTab({ buildConfig, onUpdate }: BuildConfigTabProps) {
  const updateField = (field: keyof ProjectBuildConfig, value: string) => {
    onUpdate({ ...buildConfig, [field]: value || undefined });
  };

  return (
    <ScrollArea className="h-[min(420px,60vh)]">
      <div className="flex flex-col gap-5 p-1 pr-4">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 pb-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">EAS Build Credentials</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Configure per-project Expo credentials. If left empty, the platform
            defaults will be used.
          </p>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="pb-2 text-xs font-medium text-foreground">
            How to get your Expo Access Token
          </p>
          <ol className="flex list-inside list-decimal flex-col gap-1.5 text-[11px] text-muted-foreground">
            <li>
              Go to{" "}
              <a
                href="https://expo.dev/accounts/[account]/settings/access-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                expo.dev &rarr; Account Settings &rarr; Access Tokens
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </li>
            <li>Click <span className="font-medium text-foreground">Create Token</span></li>
            <li>Give it a name (e.g. &quot;Raygan Build&quot;) and copy the token</li>
            <li>Paste it in the field below</li>
          </ol>
          <p className="pt-2 text-[10px] text-muted-foreground/70">
            Your account name is the slug shown at expo.dev/accounts/<span className="font-medium text-muted-foreground">your-account</span>
          </p>
        </div>

        <FormField
          id="expo-access-token"
          label="Expo Access Token"
          description="Personal or robot access token from expo.dev."
        >
          <Input
            id="expo-access-token"
            type="password"
            value={buildConfig.expo_access_token ?? ""}
            onChange={(e) => updateField("expo_access_token", e.target.value)}
            className="h-8 text-sm"
            placeholder="Leave empty to use platform default"
          />
        </FormField>

        <FormField
          id="expo-account-name"
          label="Expo Account Name"
          description="The Expo account or organization slug that owns this project."
        >
          <Input
            id="expo-account-name"
            value={buildConfig.expo_account_name ?? ""}
            onChange={(e) => updateField("expo_account_name", e.target.value)}
            className="h-8 text-sm"
            placeholder="Leave empty to use platform default"
          />
        </FormField>
      </div>
    </ScrollArea>
  );
}

function buildInitialBuildConfig(
  project: { settings?: ProjectSettings } | null,
): ProjectBuildConfig {
  return {
    expo_access_token: project?.settings?.build_config?.expo_access_token,
    expo_account_name: project?.settings?.build_config?.expo_account_name,
  };
}

function buildInitialConfig(
  project: { name: string; slug: string; framework_version: string; settings?: ProjectSettings } | null,
): AppConfig {
  const appConfig = project?.settings?.app_config;
  return {
    name: project?.name ?? "My App",
    slug: project?.slug ?? "my-app",
    version: appConfig?.version ?? "1.0.0",
    sdkVersion: project?.framework_version ?? "51.0.0",
    orientation: appConfig?.orientation ?? "portrait",
    iconPreview: appConfig?.icon_url ?? null,
    splashPreview: appConfig?.splash_url ?? null,
    scheme: appConfig?.scheme ?? project?.slug ?? "",
    bundleIdentifier: appConfig?.bundle_identifier ?? "",
    packageName: appConfig?.package_name ?? "",
  };
}

function buildInitialEnvVars(
  project: { settings?: ProjectSettings } | null,
): EnvVariable[] {
  const envVars = project?.settings?.env_variables;
  if (envVars && envVars.length > 0) {
    return envVars.map((v) => ({
      id: crypto.randomUUID(),
      key: v.key,
      value: v.value,
      isSecret: v.is_secret,
    }));
  }
  return [{ id: crypto.randomUUID(), key: "", value: "", isSecret: false }];
}

export function ProjectConfigModal() {
  const router = useRouter();
  const { modals, closeModal } = useUIStore();
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateProjectStore = useProjectStore((s) => s.updateProject);

  const isOpen = modals.projectConfig.isOpen;
  const modalData = modals.projectConfig.data as { tab?: string } | undefined;
  const tabMap: Record<string, string> = { env: "env", build: "build" };
  const defaultTab = tabMap[modalData?.tab ?? ""] ?? "general";

  const [config, setConfig] = useState<AppConfig>(() => buildInitialConfig(currentProject));
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>(() => buildInitialEnvVars(currentProject));
  const [buildConfig, setBuildConfig] = useState<ProjectBuildConfig>(() => buildInitialBuildConfig(currentProject));
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateMutation = useUpdateProject();
  const archiveMutation = useArchiveProject();
  const unarchiveMutation = useUnarchiveProject();
  const deleteMutation = useDeleteProject();

  useEffect(() => {
    if (isOpen) {
      setConfig(buildInitialConfig(currentProject));
      setEnvVariables(buildInitialEnvVars(currentProject));
      setBuildConfig(buildInitialBuildConfig(currentProject));
      setSaveError(null);
    }
  }, [isOpen, currentProject]);

  const updateField = (field: keyof AppConfig, value: string | null) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!currentProject) return;
    setSaveError(null);

    const appConfigPayload: Partial<ProjectAppConfig> = {
      version: config.version,
      orientation: config.orientation as ProjectAppConfig["orientation"],
      scheme: config.scheme,
      bundle_identifier: config.bundleIdentifier,
      package_name: config.packageName,
      icon_url: config.iconPreview,
      splash_url: config.splashPreview,
    };

    const envPayload: ProjectEnvVariable[] = envVariables
      .filter((v) => v.key.trim().length > 0)
      .map((v) => ({
        key: v.key.trim(),
        value: v.value,
        is_secret: v.isSecret,
      }));

    updateMutation.mutate(
      {
        uuid: currentProject.uuid,
        data: {
          name: config.name,
          slug: config.slug,
          settings: {
            app_config: appConfigPayload as ProjectAppConfig,
            env_variables: envPayload,
            build_config: buildConfig,
          },
        },
      },
      {
        onSuccess: (updated) => {
          updateProjectStore(currentProject.uuid, {
            name: updated.name,
            slug: updated.slug,
          });
          closeModal("projectConfig");
        },
        onError: (error) => {
          setSaveError(error instanceof Error ? error.message : "Failed to save");
        },
      },
    );
  };

  const handleArchive = () => {
    if (!currentProject) return;
    const isArchived = currentProject.status === "archived";

    if (isArchived) {
      unarchiveMutation.mutate(currentProject.uuid, {
        onSuccess: () => {
          updateProjectStore(currentProject.uuid, { status: "draft" });
          closeModal("projectConfig");
        },
      });
    } else {
      archiveMutation.mutate(currentProject.uuid, {
        onSuccess: () => {
          updateProjectStore(currentProject.uuid, { status: "archived" });
          closeModal("projectConfig");
          router.push("/dashboard/drafts");
        },
      });
    }
  };

  const handleDelete = () => {
    if (!currentProject) return;

    deleteMutation.mutate(currentProject.uuid, {
      onSuccess: () => {
        closeModal("projectConfig");
        router.push("/dashboard/drafts");
      },
    });
  };

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
            <TabsTrigger value="build" className="flex-1 text-xs">
              Build
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab
              config={config}
              onUpdateField={updateField}
              onArchive={handleArchive}
              onDelete={handleDelete}
              isArchiving={archiveMutation.isPending || unarchiveMutation.isPending}
              isDeleting={deleteMutation.isPending}
              isArchived={currentProject?.status === "archived"}
              projectName={currentProject?.name ?? ""}
            />
          </TabsContent>
          <TabsContent value="env">
            <EnvVariablesTab
              variables={envVariables}
              onSetVariables={setEnvVariables}
            />
          </TabsContent>
          <TabsContent value="build">
            <BuildConfigTab
              buildConfig={buildConfig}
              onUpdate={setBuildConfig}
            />
          </TabsContent>
        </Tabs>

        {saveError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {saveError}
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={updateMutation.isPending || !currentProject}
        >
          {updateMutation.isPending && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
