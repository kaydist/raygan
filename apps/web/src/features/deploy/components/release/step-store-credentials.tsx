"use client";

import * as React from "react";
import { Shield, CheckCircle2, Upload, Loader2, Trash2 } from "lucide-react";
import type { StoreType } from "@raygan/shared";

import { cn } from "@/lib/utils";
import { Button, Label, InlineBanner } from "@/components/atoms";
import {
  useStoreCredential,
  useUpsertStoreCredential,
  useVerifyStoreCredential,
  useDeleteStoreCredential,
} from "../../hooks";

interface StepStoreCredentialsProps {
  projectId: string;
  store: StoreType;
}

export function StepStoreCredentials({ projectId, store }: StepStoreCredentialsProps) {
  const [fileContent, setFileContent] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: credential, isLoading, isError } = useStoreCredential(projectId, store);
  const upsertMutation = useUpsertStoreCredential(projectId, store);
  const verifyMutation = useVerifyStoreCredential(projectId, store);
  const deleteMutation = useDeleteStoreCredential(projectId, store);

  const hasCredential = !isError && credential && credential.is_encrypted;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileContent(reader.result as string);
    };
    reader.readAsText(file);
  };

  const handleUpload = () => {
    if (!fileContent) return;

    upsertMutation.mutate(
      {
        value: fileContent,
        value_type: "json",
        is_encrypted: true,
        description: store === "google_play"
          ? "Google Play service account JSON key"
          : "Apple App Store Connect API key",
      },
      {
        onSuccess: () => {
          setFileContent(null);
          setFileName(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasCredential) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
          <Shield className="h-5 w-5 text-emerald-400" />
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-medium text-foreground">
              Credentials configured
            </span>
            <span className="text-[11px] text-muted-foreground">
              {store === "google_play"
                ? "Google Play service account key is stored and encrypted"
                : "App Store Connect API key is stored and encrypted"}
            </span>
            {credential.is_valid !== null && (
              <div className="mt-1 flex items-center gap-1">
                <CheckCircle2
                  className={cn(
                    "h-3 w-3",
                    credential.is_valid ? "text-emerald-400" : "text-red-400",
                  )}
                />
                <span className="text-[10px] text-muted-foreground">
                  {credential.is_valid ? "Verified" : "Verification failed"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!credential.is_valid && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-3 w-3" />
              )}
              {credential.is_valid === false ? "Re-verify" : "Verify"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3 w-3" />
            Replace
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-red-400 hover:text-red-400"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {fileName && fileContent && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-muted-foreground">
              New file: <span className="font-mono">{fileName}</span>
            </p>
            <Button size="sm" onClick={handleUpload} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : null}
              Upload Replacement
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-xs text-muted-foreground">
        {store === "google_play"
          ? "Upload Google Play Service Account JSON"
          : "Upload App Store Connect API Key"}
      </Label>

      <p className="text-[11px] text-muted-foreground/70">
        {store === "google_play"
          ? "Create a service account in Google Cloud Console with Google Play Developer API access, then download the JSON key file."
          : "Generate an API key in App Store Connect under Users and Access > Keys."}
      </p>

      <div
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
          fileName
            ? "border-foreground/20 bg-foreground/[0.02]"
            : "border-border/50 hover:border-border hover:bg-accent/20",
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-6 w-6 text-muted-foreground/50" />
        {fileName ? (
          <span className="text-[12px] font-mono text-foreground">{fileName}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">
            Click to upload {store === "google_play" ? ".json" : ".p8"} file
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={store === "google_play" ? ".json" : ".p8"}
        onChange={handleFileChange}
        className="hidden"
      />

      {fileContent && (
        <Button onClick={handleUpload} disabled={upsertMutation.isPending}>
          {upsertMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Encrypting & Saving...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Save Credentials
            </>
          )}
        </Button>
      )}

      {upsertMutation.isError && (
        <InlineBanner variant="error" message="Failed to save credentials. Please try again." />
      )}
    </div>
  );
}
