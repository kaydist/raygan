"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Textarea } from "@/components/atoms";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PromptInput({
  onSubmit,
  onStop,
  isGenerating = false,
  disabled = false,
  placeholder = "Describe what you want to build...",
  className,
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isGenerating || disabled) return;

    onSubmit(trimmed);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isGenerating, disabled, onSubmit]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
          className="min-h-[44px] max-h-[200px] resize-none"
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
      <p className="mt-2 text-xs text-muted-foreground">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
}
