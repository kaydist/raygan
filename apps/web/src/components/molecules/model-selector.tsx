"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from "@/components/atoms";

export interface ModelOption {
  id: number;
  model_id: string;
  name: string;
  description?: string | null;
  provider: {
    slug: string;
    name: string;
    logo_url?: string | null;
  };
  context_window: number;
  max_output_tokens: number;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_streaming: boolean;
  capabilities?: Record<string, boolean>;
}

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModelId: number | null;
  onSelect: (model: ModelOption) => void;
  disabled?: boolean;
  className?: string;
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(0)}M`;
  }
  return `${Math.round(tokens / 1000)}K`;
}

function getPriceLabel(inputCost: number, outputCost: number): string {
  const avgCost = (Number(inputCost) + Number(outputCost)) / 2;
  if (avgCost === 0) return "Free";
  if (avgCost < 0.0005) return "$";
  if (avgCost < 0.003) return "$$";
  if (avgCost < 0.015) return "$$$";
  return "$$$$";
}

function getIntelligenceLevel(model: ModelOption): number {
  const caps = model.capabilities || {};
  let score = 0;
  if (caps.reasoning) score += 2;
  if (caps.coding) score += 1;
  if (caps.vision) score += 1;
  if (caps.analysis) score += 1;
  if (model.context_window >= 200000) score += 1;
  const avgCost = (Number(model.input_cost_per_1k) + Number(model.output_cost_per_1k)) / 2;
  if (avgCost >= 0.01) score += 1;
  if (score >= 6) return 4;
  if (score >= 4) return 3;
  if (score >= 2) return 2;
  return 1;
}

function IntelligenceDots({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            i <= level ? "bg-white" : "bg-white/30"
          )}
        />
      ))}
    </span>
  );
}

function ProviderLogo({ provider }: { provider: ModelOption["provider"] }) {
  if (provider.logo_url) {
    return (
      <img
        src={provider.logo_url}
        alt={provider.name}
        className="h-5 w-5 object-contain"
      />
    );
  }

  // Fallback icons
  switch (provider.slug) {
    case "anthropic":
      return (
        <svg className="h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5l6.5 3.25L12 11 5.5 7.75 12 4.5zM4 8.87l7 3.5v7.26l-7-3.5V8.87zm9 10.76v-7.26l7-3.5v7.26l-7 3.5z"/>
        </svg>
      );
    case "openai":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
        </svg>
      );
    case "xai":
      return <span className="text-base font-bold">𝕏</span>;
    case "google":
      return (
        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
    default:
      return <div className="h-5 w-5 rounded-full bg-muted" />;
  }
}

export function ModelSelector({
  models,
  selectedModelId,
  onSelect,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedModel = models.find((m) => m.id === selectedModelId);

  const sortedModels = useMemo(() => {
    return [...models].sort((a, b) => {
      const intelligenceA = getIntelligenceLevel(a);
      const intelligenceB = getIntelligenceLevel(b);
      return intelligenceB - intelligenceA;
    });
  }, [models]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {selectedModel ? (
            <>
              <ProviderLogo provider={selectedModel.provider} />
              <span className="font-medium">{selectedModel.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select model</span>
          )}
          <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[380px] p-0 bg-zinc-900 border-zinc-800"
        align="start"
        sideOffset={8}
      >
        <ScrollArea className="h-[400px]">
          <div className="py-2">
            {sortedModels.map((model) => {
              const isSelected = model.id === selectedModelId;
              const priceLabel = getPriceLabel(model.input_cost_per_1k, model.output_cost_per_1k);
              const intelligenceLevel = getIntelligenceLevel(model);

              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/50",
                    isSelected && "bg-zinc-800/30"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <ProviderLogo provider={model.provider} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{model.name}</span>
                      {isSelected && (
                        <Check className="ml-auto h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    {model.description && (
                      <p className="mt-0.5 text-sm text-zinc-400 line-clamp-1">
                        {model.description}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <span>Context: {formatContextWindow(model.context_window)}</span>
                      <span className="mx-1">·</span>
                      <span>Price: {priceLabel}</span>
                      <span className="mx-1">·</span>
                      <span className="inline-flex items-center gap-1">
                        Intelligence: <IntelligenceDots level={intelligenceLevel} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
