"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ExternalLink, Smartphone } from "lucide-react";

import { cn, logger } from "@/lib/utils";
import { Button } from "@/components/atoms";

interface QRCodeDisplayProps {
  url: string | null;
  className?: string;
  size?: number;
  title?: string;
}

export function QRCodeDisplay({
  url,
  className,
  size = 200,
  title = "Scan with Expo Go",
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy URL", err instanceof Error ? err : undefined);
    }
  };

  const handleOpenInBrowser = () => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (!url) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/50 p-6",
          className
        )}
        style={{ minHeight: size + 80 }}
      >
        <Smartphone className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-center text-sm text-muted-foreground">
          QR code will appear when preview is ready
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6",
        className
      )}
    >
      <h3 className="text-sm font-medium text-foreground">{title}</h3>

      <div className="rounded-lg bg-white p-3">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>

      <p className="max-w-[200px] text-center text-xs text-muted-foreground">
        Open Expo Go on your device and scan this code to preview
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8 gap-1.5 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy URL
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenInBrowser}
          className="h-8 gap-1.5 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </Button>
      </div>
    </div>
  );
}
