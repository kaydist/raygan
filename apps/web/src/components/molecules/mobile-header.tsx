'use client';

import { Menu, X } from 'lucide-react';
import { Logo, IconButton } from '@/components/atoms';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  className?: string;
}

export function MobileHeader({
  isMenuOpen,
  onMenuToggle,
  className,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden',
        className
      )}
    >
      <Logo size="sm" />
      <IconButton variant="ghost" onClick={onMenuToggle}>
        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </IconButton>
    </header>
  );
}
