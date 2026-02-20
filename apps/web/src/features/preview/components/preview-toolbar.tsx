"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Link2,
  Smartphone,
  Wifi,
  WifiOff,
  ExternalLink,
  Send,
} from "lucide-react";

import { cn, logger } from "@/lib/utils";
import { Button, Input } from "@/components/atoms";
import type { ConnectedDevice } from "../types";

interface PreviewToolbarProps {
  isConnected: boolean;
  deviceCount: number;
  connectedDevices: ConnectedDevice[];
  snackURL: string | null;
  qrCodeURL: string | null;
  onDeepLinkTest?: (url: string) => void;
  className?: string;
}

export function PreviewToolbar({
  isConnected,
  deviceCount,
  connectedDevices,
  snackURL,
  qrCodeURL,
  onDeepLinkTest,
  className,
}: PreviewToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState("");
  const [showDeepLink, setShowDeepLink] = useState(false);

  const handleCopySnackURL = async () => {
    const urlToCopy = snackURL || qrCodeURL;
    if (!urlToCopy) return;

    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy URL", err instanceof Error ? err : undefined);
    }
  };

  const handleOpenExternal = () => {
    const urlToOpen = snackURL || qrCodeURL;
    if (urlToOpen) {
      window.open(urlToOpen, "_blank", "noopener,noreferrer");
    }
  };

  const handleDeepLinkTest = () => {
    if (deepLinkUrl && onDeepLinkTest) {
      onDeepLinkTest(deepLinkUrl);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                isConnected ? "text-emerald-500" : "text-muted-foreground"
              )}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {deviceCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5">
              <Smartphone className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">
                {deviceCount} {deviceCount === 1 ? "device" : "devices"}
              </span>
            </div>
          )}

          {connectedDevices.length > 0 && (
            <div className="hidden items-center gap-1 sm:flex">
              {connectedDevices.slice(0, 3).map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5"
                  title={device.name}
                >
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      device.status === "connected"
                        ? "bg-emerald-500"
                        : "bg-amber-500 animate-pulse"
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {device.name}
                  </span>
                </div>
              ))}
              {connectedDevices.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{connectedDevices.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeepLink(!showDeepLink)}
            className="h-7 gap-1 px-2 text-xs"
            title="Test deep link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopySnackURL}
            disabled={!snackURL && !qrCodeURL}
            className="h-7 gap-1 px-2 text-xs"
            title="Copy share URL"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenExternal}
            disabled={!snackURL && !qrCodeURL}
            className="h-7 gap-1 px-2 text-xs"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showDeepLink && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
          <Input
            type="text"
            placeholder="myapp://path/to/screen"
            value={deepLinkUrl}
            onChange={(e) => setDeepLinkUrl(e.target.value)}
            className="h-7 flex-1 text-xs"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleDeepLinkTest}
            disabled={!deepLinkUrl || !isConnected}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Send className="h-3 w-3" />
            Test
          </Button>
        </div>
      )}
    </div>
  );
}
