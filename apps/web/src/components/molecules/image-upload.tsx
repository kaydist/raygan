"use client";

import { useState, useRef, useCallback } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { Upload, Sparkles, Image as ImageIcon, X } from "lucide-react";

import { FormField, Button } from "@/components/atoms";
import { cn } from "@/lib/utils";

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface ImageUploadProps {
  label: string;
  preview: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  description: string;
  id: string;
}

export function ImageUpload({
  label,
  preview,
  onFileSelect,
  onClear,
  description,
  id,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return;
      if (file.size > MAX_FILE_SIZE) return;
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  return (
    <FormField id={id} label={label} description={description}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-4 transition-colors sm:flex-row sm:gap-4",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        {preview ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
            <img
              src={preview}
              alt={label}
              className="h-full w-full object-cover"
            />
            <button
              onClick={onClear}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              {preview ? "Change" : "Upload"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              <Sparkles className="h-3 w-3" />
              Generate
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Drag & drop or click to upload
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </FormField>
  );
}
