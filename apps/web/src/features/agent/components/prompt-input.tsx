"use client";

import {
  useState,
  useRef,
  useCallback,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { Send, Square, ImagePlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Textarea } from "@/components/atoms";
import { ModelSelector, type ModelOption } from "@/components/molecules";
import { useModels } from "@/lib/api";
import type { ImageAttachment } from "../types";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface PromptInputProps {
  onSubmit: (
    prompt: string,
    modelId?: number,
    images?: ImageAttachment[],
  ) => void;
  onStop?: () => void;
  onModelChange?: (model: ModelOption) => void;
  selectedModelId?: number | null;
  isGenerating?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64 || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const addImages = useCallback(
    async (files: File[]) => {
      setImageError(null);

      const remaining = MAX_IMAGES - attachments.length;
      if (remaining <= 0) {
        setImageError(`Maximum ${MAX_IMAGES} images allowed`);
        return;
      }

      const validFiles: File[] = [];
      for (const file of files.slice(0, remaining)) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setImageError("Only JPEG, PNG, GIF, and WebP images are supported");
          return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          setImageError("Each image must be under 10MB");
          return;
        }
        validFiles.push(file);
      }

      if (files.length > remaining) {
        setImageError(`Only ${remaining} more image(s) can be added`);
      }

      const newAttachments: ImageAttachment[] = [];
      for (const file of validFiles) {
        const data = await fileToBase64(file);
        const preview = URL.createObjectURL(file);
        newAttachments.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview,
          media_type: file.type,
          data,
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
    },
    [attachments.length],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((a) => a.id !== id);
    });
    setImageError(null);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) addImages(files);
      e.target.value = "";
    },
    [addImages],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        addImages(imageFiles);
      }
    },
    [addImages],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    const hasImages = attachments.length > 0;
    if ((!trimmed && !hasImages) || isGenerating || disabled) return;

    onSubmit(
      trimmed,
      selectedModelId ?? undefined,
      hasImages ? attachments : undefined,
    );
    setValue("");
    setAttachments([]);
    setImageError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, attachments, isGenerating, disabled, onSubmit, selectedModelId]);

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

  const canSubmit =
    (value.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div className={cn("border-t border-border bg-background p-4", className)}>
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="group relative">
              <img
                src={att.preview}
                alt="Attachment"
                className="h-12 w-12 rounded-lg object-cover border border-border"
              />
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {imageError && (
        <p className="mb-2 text-xs text-destructive">{imageError}</p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled || isGenerating}
          className="min-h-[44px] max-h-[200px] resize-none border-none focus-visible:ring-0 focus-visible:outline-none focus-within:border-none"
          rows={1}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-description="Attach a screenshot, sketch or visual inspiration"
          onClick={() => fileInputRef.current?.click()}
          disabled={
            disabled || isGenerating || attachments.length >= MAX_IMAGES
          }
          className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ImagePlus className="h-4 w-4" />
        </Button>

        <div className="flex justify-end items-center gap-2">
          <ModelSelector
            models={models}
            selectedModelId={selectedModelId || null}
            onSelect={(model) => onModelChange?.(model)}
            disabled={isGenerating}
          />

          <div>
            {isGenerating ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={onStop}
                className="h-8 w-8 shrink-0"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="h-8 w-8 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
