"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FormFieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
  error?: string;
  description?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
}

export function FormField({
  id,
  label,
  children,
  error,
  description,
  required,
  optional,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
        {optional && (
          <span className="ml-1 text-muted-foreground">(optional)</span>
        )}
      </Label>
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
