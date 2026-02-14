'use client';

import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { Paragraph } from '@/components/atoms';
import { cn } from '@/lib/utils';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  count?: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NavItem({
  icon: Icon,
  label,
  href,
  count,
  isActive,
  onClick,
  className,
}: NavItemProps) {
  const content = (
    <>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <Paragraph
        size="sm"
        variant={isActive ? 'default' : 'muted'}
        className="flex-1"
      >
        {label}
      </Paragraph>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </>
  );

  const baseStyles = cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
    isActive ? 'bg-accent text-foreground' : 'hover:bg-accent/50',
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseStyles}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(baseStyles, 'w-full text-left')}>
      {content}
    </button>
  );
}

interface NavSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function NavSection({ title, children, className }: NavSectionProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {title && (
        <Paragraph size="xs" variant="muted" className="px-3 py-2 uppercase tracking-wider">
          {title}
        </Paragraph>
      )}
      {children}
    </div>
  );
}
