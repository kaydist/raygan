'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/atoms';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  shortcut?: string;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search',
  value,
  onChange,
  onFocus,
  shortcut = '⌘K',
  className,
}: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={onFocus}
        className="h-9 bg-accent/50 pl-9 pr-12 text-sm placeholder:text-muted-foreground"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
        {shortcut}
      </kbd>
    </div>
  );
}
