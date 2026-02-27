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
  const avgCost =
    (Number(model.input_cost_per_1k) + Number(model.output_cost_per_1k)) / 2;
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
            i <= level ? "bg-white" : "bg-white/30",
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

  return <div className="h-5 w-5 rounded-full bg-muted" />;
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
            className,
          )}
        >
          {selectedModel ? (
            <>
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
              const priceLabel = getPriceLabel(
                model.input_cost_per_1k,
                model.output_cost_per_1k,
              );
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
                    isSelected && "bg-zinc-800/30",
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <ProviderLogo provider={model.provider} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {model.name}
                      </span>
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
                      <span>
                        Context: {formatContextWindow(model.context_window)}
                      </span>
                      <span className="mx-1">·</span>
                      <span>Price: {priceLabel}</span>
                      <span className="mx-1">·</span>
                      <span className="inline-flex items-center gap-1">
                        Intelligence:{" "}
                        <IntelligenceDots level={intelligenceLevel} />
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
