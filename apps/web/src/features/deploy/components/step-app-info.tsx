import { Image as ImageIcon } from "lucide-react";

import { Input, FormField, Label } from "@/components/atoms";
import { ImageUpload } from "@/components/molecules";
import type { AppInfo } from "./build-modal.types";

interface StepAppInfoProps {
  appInfo: AppInfo;
  onUpdate: (field: keyof AppInfo, value: string | null) => void;
  errors: Partial<Record<keyof AppInfo, string>>;
}

export function StepAppInfo({ appInfo, onUpdate, errors }: StepAppInfoProps) {
  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdate("iconPreview", e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">App Icon</Label>
          {appInfo.iconPreview ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
              <img
                src={appInfo.iconPreview}
                alt="App icon"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/50">
              <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <ImageUpload
          id="build-app-icon"
          label="Upload Icon"
          preview={null}
          onFileSelect={handleImageSelect}
          onClear={() => onUpdate("iconPreview", null)}
          description="PNG, JPG or WebP. Max 5MB."
        />
      </div>

      <div className="flex flex-col gap-3.5">
        <FormField
          id="build-app-name"
          label="App Name"
          error={errors.name}
          required
        >
          <Input
            id="build-app-name"
            value={appInfo.name}
            onChange={(e) => onUpdate("name", e.target.value)}
            className="h-9"
            placeholder="My App"
          />
        </FormField>

        <FormField
          id="build-app-version"
          label="App Version"
          description="Semantic version (major.minor.patch)"
          error={errors.version}
          required
        >
          <Input
            id="build-app-version"
            value={appInfo.version}
            onChange={(e) => onUpdate("version", e.target.value)}
            className="h-9 font-mono"
            placeholder="1.0.0"
          />
        </FormField>

        <FormField
          id="build-package-name"
          label="Android Package Name"
          description="Unique ID for your app on the Play Store"
          error={errors.packageName}
          required
        >
          <Input
            id="build-package-name"
            value={appInfo.packageName}
            onChange={(e) => onUpdate("packageName", e.target.value)}
            className="h-9 font-mono"
            placeholder="com.example.myapp"
          />
        </FormField>
      </div>
    </div>
  );
}
