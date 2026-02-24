"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw, QrCode, Monitor, Terminal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms";
import { useSnackPreview } from "../hooks";
import type { Platform, PreviewMode } from "../types";
import { DeviceFrame } from "./device-frame";
import { DeviceSelector } from "./device-selector";
import { QRCodeDisplay } from "./qr-code-display";
import { PreviewToolbar } from "./preview-toolbar";
import { ConsolePanel } from "./console-panel";

interface SnackPreviewProps {
  projectId: string;
  projectName?: string;
  className?: string;
}

export function SnackPreview({
  projectId,
  projectName = "Preview",
  className,
}: SnackPreviewProps) {
  const [platform, setPlatform] = useState<Platform>("ios");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("web");
  const [showConsole, setShowConsole] = useState(false);

  const webPreviewRef = useRef<Window | null>(null);

  const {
    isConnected,
    isLoading,
    error,
    webPreviewURL,
    qrCodeURL,
    snackURL,
    errors,
    logs,
    connectedDevices,
    deviceCount,
    syncFiles,
    clearLogs,
    getEmbedURL,
  } = useSnackPreview({
    projectId,
    name: projectName,
    syncEnabled: true,
    debounceMs: 500,
    webPreviewRef,
  });

  const handleDeepLinkTest = useCallback((url: string) => {
    console.log("[Preview] Testing deep link:", url);
  }, []);

  const handleIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    webPreviewRef.current = iframe?.contentWindow ?? null;
  }, []);

  const hasErrors = errors.length > 0;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">Preview</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-muted p-0.5">
            <Button
              variant={previewMode === "web" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("web")}
              className="h-7 gap-1.5 px-2.5 text-xs"
            >
              <Monitor className="h-3.5 w-3.5" />
              Web
            </Button>
            <Button
              variant={previewMode === "device" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("device")}
              className="h-7 gap-1.5 px-2.5 text-xs"
            >
              <QrCode className="h-3.5 w-3.5" />
              Device
            </Button>
          </div>

          <Button
            variant={showConsole ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowConsole(!showConsole)}
            className="h-8 w-8 p-0 relative"
            title="Toggle console"
          >
            <Terminal className="h-4 w-4" />
            {logs.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {logs.length > 99 ? "99+" : logs.length}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={syncFiles}
            disabled={isLoading || !isConnected}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-4 py-2">
        <PreviewToolbar
          isConnected={isConnected}
          deviceCount={deviceCount}
          connectedDevices={connectedDevices}
          snackURL={snackURL}
          qrCodeURL={qrCodeURL}
          onDeepLinkTest={handleDeepLinkTest}
        />
      </div>

      {previewMode === "web" && (
        <div className="border-b border-border px-4 py-2">
          <DeviceSelector
            value={platform}
            onChange={setPlatform}
            disabled={isLoading}
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {hasErrors && (
        <div className="border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-yellow-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Compilation errors detected</span>
          </div>
          <ul className="mt-1 space-y-1 pl-6 text-xs text-yellow-600/80">
            {errors.slice(0, 3).map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
            {errors.length > 3 && (
              <li>...and {errors.length - 3} more errors</li>
            )}
          </ul>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden bg-muted/30">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Connecting Simulator...
              </p>
            </div>
          </div>
        ) : previewMode === "device" ? (
          <div className="flex h-full w-full items-center justify-center">
            <QRCodeDisplay url={qrCodeURL} size={220} />
          </div>
        ) : webPreviewURL ? (
          <DeviceFrame platform={platform} className="p-4">
            <iframe
              ref={handleIframeRef}
              src={getEmbedURL(platform) || webPreviewURL}
              className="h-full w-full border-0"
              title="Simulator Preview"
              allow="accelerometer; camera; geolocation; gyroscope; microphone; screen-wake-lock; clipboard-read; clipboard-write"
            />
          </DeviceFrame>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <Monitor className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Preview will appear when connected
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={syncFiles}
                className="mt-2"
              >
                Refresh Preview
              </Button>
            </div>
          </div>
        )}
      </div>

      {showConsole && (
        <ConsolePanel
          logs={logs}
          onClear={clearLogs}
          maxHeight={150}
        />
      )}
    </div>
  );
}
