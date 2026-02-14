'use client';

import * as React from 'react';
import { Input, Label } from '@/components/atoms';
import { cn } from '@/lib/utils';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function FormField({
  label,
  error,
  action,
  className,
  type,
  ...props
}: FormFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="relative">
        <Input
          type={inputType}
          className={cn(
            'h-12 border-0 border-b border-border bg-transparent px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground',
            error && 'border-destructive'
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showPassword ? 'HIDE' : 'SHOW'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
