"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Textarea } from "@/components/atoms";
import { ModelSelector, type ModelOption } from "@/components/molecules";
import { useModels } from "@/lib/api";

interface PromptInputProps {
  onSubmit: (prompt: string, modelId?: number) => void;
  onStop?: () => void;
  onModelChange?: (model: ModelOption) => void;
  selectedModelId?: number | null;
  isGenerating?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PromptInput({
  onSubmit,
  onStop,
  onModelChange,
  selectedModelId,
  isGenerating = false,
  disabled = false,
  placeholder = "Describe what you want to build...",
  className,
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: modelsData } = useModels();

  const models: ModelOption[] = (modelsData || []).map((m) => ({
    id: m.id,
    model_id: m.model_id,
    name: m.name,
    description: m.description,
    provider: m.provider,
    context_window: m.context_window,
    max_output_tokens: m.max_output_tokens,
    input_cost_per_1k: m.input_cost_per_1k,
    output_cost_per_1k: m.output_cost_per_1k,
    supports_vision: m.supports_vision,
    supports_tools: m.supports_tools,
    supports_streaming: m.supports_streaming,
    capabilities: m.capabilities,
  }));

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isGenerating || disabled) return;

    onSubmit(trimmed, selectedModelId ?? undefined);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isGenerating, disabled, onSubmit, selectedModelId]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && isGenerating) {
      e.preventDefault();
      onStop?.();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);

    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  return (
    <div className={cn("border-t border-border bg-background p-4", className)}>
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isGenerating}
          className="min-h-[44px] max-h-[200px] resize-none border-none focus-visible:ring-0 focus-visible:outline-none focus-within:border-none"
          rows={1}
        />
        {isGenerating ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={onStop}
            className="h-11 w-11 shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <ModelSelector
          models={models}
          selectedModelId={selectedModelId || null}
          onSelect={(model) => onModelChange?.(model)}
          disabled={isGenerating}
        />
      </div>
    </div>
  );
}
