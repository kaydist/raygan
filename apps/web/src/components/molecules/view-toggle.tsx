'use client';

import { LayoutGrid, List } from 'lucide-react';
import { IconButton } from '@/components/atoms';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center rounded-lg bg-accent/50 p-1', className)}>
      <IconButton
        size="sm"
        variant={value === 'grid' ? 'default' : 'ghost'}
        className={cn(
          'h-7 w-7',
          value === 'grid' && 'bg-background shadow-sm'
        )}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="sm"
        variant={value === 'list' ? 'default' : 'ghost'}
        className={cn(
          'h-7 w-7',
          value === 'list' && 'bg-background shadow-sm'
        )}
        onClick={() => onChange('list')}
      >
        <List className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
